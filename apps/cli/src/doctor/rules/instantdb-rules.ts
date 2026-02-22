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
 * Parse InstantDB schema file and extract entity definitions
 */
async function parseInstantDBSchema(ctx: RuleContext): Promise<Map<string, SchemaEntity> | null> {
  // Try multiple possible schema locations
  const schemaPaths = [
    "instant.schema.ts",
    "src/instant.schema.ts",
    ".mycontext/schema.ts",
    "instant.schema.js",
  ];

  let schemaContent: string | null = null;
  let schemaPath: string | null = null;

  for (const sp of schemaPaths) {
    const content = await ctx.readFile(sp);
    if (content) {
      schemaContent = content;
      schemaPath = sp;
      break;
    }
  }

  if (!schemaContent) {
    return null; // No schema file found
  }

  const entities = new Map<string, SchemaEntity>();

  try {
    // Extract the entities object from the schema
    // Pattern: entities: { EntityName: { fields: { ... } } }
    const entitiesMatch = schemaContent.match(/entities:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    if (!entitiesMatch || !entitiesMatch[1]) {
      return null;
    }

    const entitiesSection = entitiesMatch[1];

    // Extract each entity definition
    // Pattern: EntityName: { fields: { fieldName: { type: "string", required: true }, ... } }
    const entityPattern = /(\w+):\s*\{[^}]*fields:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    let entityMatch: RegExpExecArray | null;

    while ((entityMatch = entityPattern.exec(entitiesSection)) !== null) {
      const entityName = entityMatch[1];
      const fieldsSection = entityMatch[2];

      if (!entityName || !fieldsSection) continue;

      const fields: { [fieldName: string]: { type: string; required?: boolean } } = {};

      // Extract field definitions
      // Pattern: fieldName: { type: "string", required: true }
      const fieldPattern = /(\w+):\s*\{[^}]*type:\s*["'](\w+)["'][^}]*\}/g;
      let fieldMatch: RegExpExecArray | null;

      while ((fieldMatch = fieldPattern.exec(fieldsSection)) !== null) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        const fieldDef = fieldMatch[0];

        if (!fieldName || !fieldType) continue;

        fields[fieldName] = {
          type: fieldType,
          required: fieldDef.includes("required") || fieldDef.includes("optional: false"),
        };
      }

      entities.set(entityName, {
        name: entityName,
        fields,
      });
    }
  } catch (error) {
    // Failed to parse schema
    return null;
  }

  return entities;
}

/**
 * Extract field accesses from TypeScript code
 * Returns map of entity.field accesses with their locations
 */
function extractFieldAccesses(
  content: string,
  schemaEntities: Map<string, SchemaEntity>
): Array<{ entity: string; field: string; line: number; match: string }> {
  const accesses: Array<{ entity: string; field: string; line: number; match: string }> = [];
  const lines = content.split("\n");

  // Build pattern to match potential entity names (convert to lowercase for case-insensitive matching)
  const entityNames = Array.from(schemaEntities.keys());
  const entityNamesLower = entityNames.map(name => name.toLowerCase());

  lines.forEach((line, index) => {
    // Pattern: variableName.fieldName where variableName might be a schema entity
    // We look for patterns like: payment.payment_method, customer.delivery_zone_id, etc.
    const accessPattern = /(\w+)\.(\w+)/g;
    let match;

    while ((match = accessPattern.exec(line)) !== null) {
      const varName = match[1];
      const fieldName = match[2];

      if (!varName || !fieldName) continue;

      // Check if this could be an entity access
      // We do fuzzy matching: if varName is singular/plural of an entity name
      const varLower = varName.toLowerCase();

      for (let i = 0; i < entityNamesLower.length; i++) {
        const entityNameLower = entityNamesLower[i];
        const entityName = entityNames[i];

        if (!entityNameLower || !entityName) continue;

        // Match if:
        // 1. Exact match (case-insensitive)
        // 2. Variable is plural and entity is singular (users -> User)
        // 3. Variable matches entity without case sensitivity
        if (
          varLower === entityNameLower ||
          varLower === entityNameLower + 's' ||
          varLower === entityNameLower.slice(0, -1) || // Handle entity ending in 's'
          entityNameLower.startsWith(varLower) ||
          varLower.startsWith(entityNameLower)
        ) {
          accesses.push({
            entity: entityName,
            field: fieldName,
            line: index + 1,
            match: match[0],
          });
        }
      }
    }
  });

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

    // Find all TypeScript/JavaScript files (exclude schema file itself)
    const files = await ctx.findFiles(/\.(tsx?|jsx?)$/);

    for (const file of files) {
      // Skip schema files and node_modules
      if (file.includes("schema.") || file.includes("node_modules")) {
        continue;
      }

      const content = await ctx.readFile(file);
      if (!content) continue;

      // Extract field accesses
      const accesses = extractFieldAccesses(content, schemaEntities);

      // Check each access against the schema
      for (const access of accesses) {
        const entity = schemaEntities.get(access.entity);
        if (!entity) continue;

        // Check if the field exists in the schema
        if (!entity.fields[access.field]) {
          // Field doesn't exist in schema - this is drift!

          // Try to find a similar field name (common mistake: payment_method vs method)
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
                autoFixable: similarField !== null, // Can auto-fix if we found a similar field
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
