/**
 * InstantDB Rules — Schema validation and drift detection for InstantDB projects
 */
import * as path from "path";
import type { DoctorRule, RuleContext, Diagnostic } from "../types";

// ─── Helper ───────────────────────────────────────────────────────

function diag(
  rule: DoctorRule,
  filePath: string,
  message: string,
  opts: { line?: number; autoFixable?: boolean; help?: string } = {}
): Diagnostic {
  return {
    ruleId: rule.id,
    filePath,
    line: opts.line,
    severity: rule.severity,
    message,
    help: opts.help || rule.help,
    autoFixable: opts.autoFixable ?? false,
  };
}

// ─── Schema Parser ────────────────────────────────────────────────

interface SchemaEntity {
  name: string;
  fields: { [fieldName: string]: { type: string; required?: boolean } };
}

/**
 * InstantDB type mapping: i.string() → "string", etc.
 */
const INSTANTDB_TYPE_MAP: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "date",
  json: "json",
  any: "any",
};

/**
 * Parse InstantDB schema file and extract entity definitions.
 *
 * Handles two schema formats:
 * 1. Modern InstantDB DSL: `entityName: i.entity({ field: i.string(), ... })`
 * 2. Legacy JSON-like:     `entityName: { fields: { field: { type: "string" } } }`
 */
async function parseInstantDBSchema(ctx: RuleContext): Promise<Map<string, SchemaEntity> | null> {
  const schemaPaths = [
    "instant.schema.ts",
    "src/instant.schema.ts",
    ".mycontext/schema.ts",
    "instant.schema.js",
  ];

  let schemaContent: string | null = null;

  for (const sp of schemaPaths) {
    const content = await ctx.readFile(sp);
    if (content) {
      schemaContent = content;
      break;
    }
  }

  if (!schemaContent) {
    return null;
  }

  // Try modern i.entity() DSL first, fall back to legacy format
  const entities = parseModernDSL(schemaContent) || parseLegacyFormat(schemaContent);
  if (!entities || entities.size === 0) return null;

  // Parse links and register them as valid "fields" on entities
  // Links represent relationship traversals (e.g., properties.claims, user_companies.user)
  // Also collect ALL link labels globally for nested query validation
  const allLinkLabels = parseAndRegisterLinks(schemaContent, entities);

  // Store link labels on the returned map for the drift checker to use
  (entities as any).__allLinkLabels = allLinkLabels;

  return entities;
}

/**
 * Parse the `links` section from the schema and register link labels
 * as valid fields on the corresponding entities.
 *
 * For example, a link like:
 *   propertyClaims: { forward: { on: "properties", has: "many", label: "claims" }, ... }
 * registers "claims" as a valid field on the "properties" entity.
 */
function parseAndRegisterLinks(content: string, entities: Map<string, SchemaEntity>): Set<string> {
  const allLabels = new Set<string>();
  const linksMatch = content.match(/links:\s*\{/);
  if (!linksMatch) return allLabels;

  const startIdx = (linksMatch.index || 0) + linksMatch[0].length;
  const linksBody = extractBalancedBraces(content, startIdx);
  if (!linksBody) return allLabels;

  // Match link definitions with forward/reverse
  const linkPattern = /(\w+)\s*:\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(linksBody)) !== null) {
    const linkStartIdx = match.index + match[0].length;
    const linkBody = extractBalancedBraces(linksBody, linkStartIdx);
    if (!linkBody) continue;

    // Parse forward: { on: "entityName", has: "many", label: "labelName" }
    const forwardMatch = linkBody.match(/forward:\s*\{[^}]*on:\s*["'](\w+)["'][^}]*label:\s*["'](\w+)["']/);
    if (forwardMatch) {
      const entityName = forwardMatch[1];
      const label = forwardMatch[2];
      if (entityName && label) {
        allLabels.add(label);
        const entity = entities.get(entityName);
        if (entity) {
          entity.fields[label] = { type: "link", required: false };
        }
      }
    }

    // Parse reverse: { on: "entityName", has: "one", label: "labelName" }
    const reverseMatch = linkBody.match(/reverse:\s*\{[^}]*on:\s*["'](\w+)["'][^}]*label:\s*["'](\w+)["']/);
    if (reverseMatch) {
      const entityName = reverseMatch[1];
      const label = reverseMatch[2];
      if (entityName && label) {
        allLabels.add(label);
        const entity = entities.get(entityName);
        if (entity) {
          entity.fields[label] = { type: "link", required: false };
        }
      }
    }
  }
  return allLabels;
}

/**
 * Parse modern InstantDB DSL: `profiles: i.entity({ first_name: i.string(), ... })`
 */
function parseModernDSL(content: string): Map<string, SchemaEntity> | null {
  // Check if this file uses i.entity() syntax
  if (!content.includes("i.entity(")) return null;

  const entities = new Map<string, SchemaEntity>();

  // Match each entity: `entityName: i.entity({ ... })`
  // We need to handle nested braces, so we find the start and then balance braces
  const entityStartPattern = /(\w+)\s*:\s*i\.entity\(\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = entityStartPattern.exec(content)) !== null) {
    const entityName = match[1];
    if (!entityName) continue;

    // Find the matching closing brace for the entity body
    const startIdx = match.index + match[0].length;
    const entityBody = extractBalancedBraces(content, startIdx);
    if (!entityBody) continue;

    const fields: { [fieldName: string]: { type: string; required?: boolean } } = {};

    // Match fields: `fieldName: i.string()`, `fieldName: i.number().optional()`, etc.
    const fieldPattern = /(\w+)\s*:\s*i\.(string|number|boolean|date|json|any)\(\)/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldPattern.exec(entityBody)) !== null) {
      const fieldName = fieldMatch[1];
      const idbType = fieldMatch[2];
      if (!fieldName || !idbType) continue;

      const mappedType = INSTANTDB_TYPE_MAP[idbType] || "any";

      // Check for .optional() modifier after the i.type() call
      const afterCall = entityBody.substring(fieldMatch.index + fieldMatch[0].length, fieldMatch.index + fieldMatch[0].length + 20);
      const isOptional = afterCall.startsWith(".optional()");

      fields[fieldName] = {
        type: mappedType,
        required: !isOptional,
      };
    }

    // Always include "id" as a built-in field
    fields["id"] = { type: "string", required: true };

    entities.set(entityName, { name: entityName, fields });
  }

  return entities.size > 0 ? entities : null;
}

/**
 * Parse legacy JSON-like format: `entityName: { fields: { field: { type: "string" } } }`
 */
function parseLegacyFormat(content: string): Map<string, SchemaEntity> | null {
  const entities = new Map<string, SchemaEntity>();

  try {
    const entitiesMatch = content.match(/entities:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    if (!entitiesMatch || !entitiesMatch[1]) return null;

    const entitiesSection = entitiesMatch[1];
    const entityPattern = /(\w+):\s*\{[^}]*fields:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    let entityMatch: RegExpExecArray | null;

    while ((entityMatch = entityPattern.exec(entitiesSection)) !== null) {
      const entityName = entityMatch[1];
      const fieldsSection = entityMatch[2];
      if (!entityName || !fieldsSection) continue;

      const fields: { [fieldName: string]: { type: string; required?: boolean } } = {};
      const fieldPattern = /(\w+):\s*\{[^}]*type:\s*["'](\w+)["'][^}]*\}/g;
      let fieldMatch: RegExpExecArray | null;

      while ((fieldMatch = fieldPattern.exec(fieldsSection)) !== null) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        if (!fieldName || !fieldType) continue;
        fields[fieldName] = {
          type: fieldType,
          required: fieldMatch[0].includes("required") || fieldMatch[0].includes("optional: false"),
        };
      }

      entities.set(entityName, { name: entityName, fields });
    }
  } catch {
    return null;
  }

  return entities.size > 0 ? entities : null;
}

/**
 * Extract content between balanced braces starting after an opening brace.
 * Returns the content between braces (excluding the outer braces).
 */
function extractBalancedBraces(content: string, startAfterOpenBrace: number): string | null {
  let depth = 1;
  let i = startAfterOpenBrace;

  while (i < content.length && depth > 0) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") depth--;
    i++;
  }

  if (depth !== 0) return null;
  return content.substring(startAfterOpenBrace, i - 1);
}

/**
 * Common JavaScript/TypeScript built-in properties that should never be treated
 * as schema field accesses, even if the variable name matches an entity name.
 */
const JS_BUILTIN_PROPERTIES = new Set([
  // Array methods & properties
  "length", "map", "filter", "reduce", "forEach", "find", "findIndex", "some",
  "every", "includes", "indexOf", "slice", "splice", "push", "pop", "shift",
  "unshift", "concat", "join", "sort", "reverse", "flat", "flatMap", "fill",
  "at", "entries", "keys", "values", "from", "isArray", "of",
  // Object methods
  "keys", "values", "entries", "assign", "freeze", "create", "hasOwnProperty",
  "toString", "valueOf", "constructor", "prototype",
  // Promise/async
  "then", "catch", "finally", "resolve", "reject", "all", "allSettled", "race",
  // String methods
  "trim", "split", "replace", "match", "search", "startsWith", "endsWith",
  "toUpperCase", "toLowerCase", "substring", "charAt", "charCodeAt", "padStart",
  "padEnd", "repeat", "normalize", "localeCompare",
  // Common DOM/React/Next.js
  "current", "style", "className", "children", "props", "state", "ref",
  "target", "value", "type", "name", "href", "src", "alt", "id",
  "addEventListener", "removeEventListener", "preventDefault", "stopPropagation",
  // Common chaining
  "default", "log", "error", "warn", "info", "debug", "env",
  // InstantDB / InstaQL query operators
  "in", "gt", "lt", "gte", "lte", "ne", "like", "not", "$isNull",
]);

/**
 * Extract field accesses from TypeScript code that are specifically
 * within InstantDB query/transaction contexts.
 *
 * Only checks:
 * 1. db.useQuery({ entityName: { fieldName: {} } }) — query objects
 * 2. tx.entityName.update({ fieldName: value }) — transaction mutations
 * 3. Direct entity field reads: entityVar.fieldName where entityVar is
 *    destructured from a query result (conservative heuristic)
 */
function extractFieldAccesses(
  content: string,
  schemaEntities: Map<string, SchemaEntity>
): Array<{ entity: string; field: string; line: number; match: string }> {
  const accesses: Array<{ entity: string; field: string; line: number; match: string }> = [];
  const entityNames = Array.from(schemaEntities.keys());
  const entityNamesSet = new Set(entityNames.map(n => n.toLowerCase()));

  // ── Strategy 1: db.useQuery({ entity: { field: {} } }) ──
  // Match query objects passed to useQuery/query
  for (const entityName of entityNames) {
    // Find query blocks like: entityName: { $: { where: { ... } }, fieldName: {} }
    // or shorthand: entityName: { fieldName: {} }
    const queryBlockPattern = new RegExp(
      `\\b${entityName}\\s*:\\s*\\{([^}]*(?:\\{[^}]*\\}[^}]*)*)\\}`,
      "gs"
    );
    let qMatch;
    while ((qMatch = queryBlockPattern.exec(content)) !== null) {
      const blockContent = qMatch[1];
      if (!blockContent) continue;

      // Extract field names from the query block (keys before a colon)
      const fieldKeyPattern = /(\w+)\s*:/g;
      let fkMatch;
      while ((fkMatch = fieldKeyPattern.exec(blockContent)) !== null) {
        const fieldName = fkMatch[1];
        if (!fieldName) continue;
        // Skip $ (query operator), common non-field keys, and builtins
        if (fieldName === "$" || fieldName === "where" || fieldName === "order" ||
            fieldName === "limit" || fieldName === "offset" || fieldName === "first" ||
            fieldName === "last" || fieldName === "before" || fieldName === "after") continue;
        if (JS_BUILTIN_PROPERTIES.has(fieldName)) continue;

        const lineNum = content.substring(0, qMatch.index).split("\n").length;
        accesses.push({
          entity: entityName,
          field: fieldName,
          line: lineNum,
          match: `${entityName}.${fieldName}`,
        });
      }
    }
  }

  // ── Strategy 2: tx.entityName.update/merge/delete({ field: value }) ──
  for (const entityName of entityNames) {
    const txPattern = new RegExp(
      `tx\\.${entityName}[^.]*\\.(?:update|merge)\\s*\\(\\s*\\{([^}]*)\\}`,
      "gs"
    );
    let txMatch;
    while ((txMatch = txPattern.exec(content)) !== null) {
      const updateBody = txMatch[1];
      if (!updateBody) continue;

      const fieldKeyPattern = /(\w+)\s*:/g;
      let fkMatch;
      while ((fkMatch = fieldKeyPattern.exec(updateBody)) !== null) {
        const fieldName = fkMatch[1];
        if (!fieldName || JS_BUILTIN_PROPERTIES.has(fieldName)) continue;

        const lineNum = content.substring(0, txMatch.index).split("\n").length;
        accesses.push({
          entity: entityName,
          field: fieldName,
          line: lineNum,
          match: `tx.${entityName}.${fieldName}`,
        });
      }
    }
  }

  return accesses;
}

// ─── Rules ────────────────────────────────────────────────────────

const schemaFieldDrift: DoctorRule = {
  id: "instantdb/schema-field-drift",
  name: "Schema Field Drift Detection",
  category: "node",
  severity: "error",
  description: "Detects code accessing fields that don't exist in the InstantDB schema",
  help: "Update field names in code to match the schema, or add missing fields to instant.schema.ts",
  appliesTo: ["nextjs", "node"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    // Parse the schema
    const schemaEntities = await parseInstantDBSchema(ctx);
    if (!schemaEntities || schemaEntities.size === 0) {
      return results; // No schema found or no entities, skip check
    }

    // Find all TypeScript/JavaScript files
    const files = await ctx.findFiles(/\.(tsx?|jsx?)$/);

    for (const file of files) {
      // Skip schema files, node_modules, scripts/, .mycontext/, and config files
      if (
        file.includes("schema.") ||
        file.includes("node_modules") ||
        file.startsWith("scripts/") ||
        file.includes("/scripts/") ||
        file.startsWith(".mycontext/") ||
        file.includes("/.mycontext/") ||
        file.endsWith(".config.ts") ||
        file.endsWith(".config.js")
      ) {
        continue;
      }

      const contentRaw = await ctx.readFile(file);
      if (!contentRaw) continue;

      // Strip comments (to avoid matching // TODO: as a field)
      const content = contentRaw.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, "$1");

      // Only check files that actually use InstantDB
      if (
        !content.includes("db.useQuery") &&
        !content.includes("db.transact") &&
        !content.includes("tx.") &&
        !content.includes("useQuery") &&
        !content.includes("adminDb")
      ) {
        continue;
      }

      // Extract field accesses from InstantDB contexts only
      const accesses = extractFieldAccesses(content, schemaEntities);

      // Get global link labels (registered on the map metadata in parseInstantDBSchema)
      const allLinkLabels = (schemaEntities as any).__allLinkLabels || new Set<string>();

      // Check each access against the schema
      for (const access of accesses) {
        const entity = schemaEntities.get(access.entity);
        if (!entity) continue;

        // Skip if the field is a known link label globally (relationship traversal)
        if (allLinkLabels.has(access.field)) continue;

        // Check if the field exists in the schema
        if (!entity.fields[access.field]) {
          // Field doesn't exist in schema - this is drift!

          // Try to find a similar field name
          const availableFields = Object.keys(entity.fields);
          const similarField = findSimilarField(access.field, availableFields);

          let helpMessage = `Field '${access.field}' does not exist in ${access.entity} schema. `;

          if (similarField) {
            helpMessage += `Did you mean '${similarField}'? Available fields: ${availableFields.join(", ")}`;
          } else {
            helpMessage += `Available fields: ${availableFields.join(", ")}`;
          }

          results.push(
            diag(
              this,
              file,
              `${access.entity}.${access.field} - field '${access.field}' not in schema`,
              {
                line: access.line,
                help: helpMessage,
                autoFixable: similarField !== null,
              }
            )
          );
        }
      }
    }

    return results;
  },

  async fix(ctx, diagnostic) {
    // Auto-fix by replacing the incorrect field name with the suggested one
    const match = diagnostic.message.match(/(\w+)\.(\w+) - field '(\w+)' not in schema/);
    if (!match) return false;

    const [, entity, , wrongField] = match;

    // Extract the suggestion from the help message
    const suggestionMatch = diagnostic.help.match(/Did you mean '(\w+)'\?/);
    if (!suggestionMatch) return false;

    const correctField = suggestionMatch[1];

    // Read the file
    const content = await ctx.readFile(diagnostic.filePath);
    if (!content) return false;

    const lines = content.split("\n");
    if (!diagnostic.line || diagnostic.line > lines.length) return false;

    // Replace the field name on the specific line
    const lineIndex = diagnostic.line - 1;
    const originalLine = lines[lineIndex];

    if (!originalLine) return false;

    // Replace entity.wrongField with entity.correctField
    const pattern = new RegExp(`(\\w+)\\.${wrongField}\\b`, 'g');
    const newLine = originalLine.replace(pattern, `$1.${correctField}`);

    if (newLine === originalLine) return false; // Nothing changed

    lines[lineIndex] = newLine;

    // Write the file back
    const fs = await import("fs/promises");
    const absolutePath = path.join(ctx.root, diagnostic.filePath);
    await fs.writeFile(absolutePath, lines.join("\n"), "utf-8");

    return true;
  },
};

/**
 * Find a similar field name using simple heuristics
 * Common patterns:
 * - payment_method -> method (remove entity prefix)
 * - delivery_zone_id -> zone_id (remove prefix)
 * - user_email -> email (remove entity prefix)
 */
function findSimilarField(wrongField: string, availableFields: string[]): string | null {
  const wrongLower = wrongField.toLowerCase();

  // 1. Exact match (shouldn't happen, but just in case)
  for (const field of availableFields) {
    if (field.toLowerCase() === wrongLower) {
      return field;
    }
  }

  // 2. Check if wrongField ends with one of the available fields
  // e.g., payment_method ends with method
  for (const field of availableFields) {
    if (wrongLower.endsWith(field.toLowerCase()) || wrongLower.endsWith('_' + field.toLowerCase())) {
      return field;
    }
  }

  // 3. Check if wrongField contains one of the available fields
  // e.g., delivery_zone_id contains zone_id
  for (const field of availableFields) {
    if (wrongLower.includes(field.toLowerCase())) {
      return field;
    }
  }

  // 4. Levenshtein distance for typos (simple version)
  let closest: string | null = null;
  let minDistance = Infinity;

  for (const field of availableFields) {
    const distance = levenshteinDistance(wrongLower, field.toLowerCase());
    if (distance < minDistance && distance <= 3) { // Allow up to 3 character differences
      minDistance = distance;
      closest = field;
    }
  }

  return closest;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array.from({ length: str2.length + 1 }, () =>
    Array(str1.length + 1).fill(0)
  );

  for (let i = 0; i <= str2.length; i++) {
    matrix[i]![0] = i;
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

// ─── Export ───────────────────────────────────────────────────────

export const instantdbRules: DoctorRule[] = [
  schemaFieldDrift,
];
