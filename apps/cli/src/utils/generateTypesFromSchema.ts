/**
 * generateTypesFromSchema — Parse InstantDB schema and generate TypeScript types
 *
 * Reads `instant.schema.ts` as text, extracts entity definitions using the
 * `i.entity()` DSL, and produces typed output for every entity:
 *   - Entity type (with all fields)
 *   - EntityInsert type (omits `id`)
 *   - EntityWithRelations type (adds optional relation fields)
 */
import * as fs from "fs-extra";
import * as path from "path";

// ─── Type Maps ────────────────────────────────────────────────────

const INSTANTDB_TO_TS: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "string", // InstantDB dates are ISO strings
  json: "Record<string, unknown>",
  any: "unknown",
};

// ─── Schema Parsing ───────────────────────────────────────────────

interface ParsedField {
  name: string;
  tsType: string;
  optional: boolean;
  indexed: boolean;
  unique: boolean;
}

interface ParsedEntity {
  name: string;
  fields: ParsedField[];
}

interface ParsedLink {
  name: string;
  forward: { on: string; has: "one" | "many"; label: string };
  reverse?: { on: string; has: "one" | "many"; label: string };
}

interface ParsedSchema {
  entities: ParsedEntity[];
  links: ParsedLink[];
}

/**
 * Parse an InstantDB schema file and extract all entity and link definitions.
 */
export function parseSchema(content: string): ParsedSchema {
  const entities = parseEntities(content);
  const links = parseLinks(content);
  return { entities, links };
}

function parseEntities(content: string): ParsedEntity[] {
  if (!content.includes("i.entity(")) return [];

  const results: ParsedEntity[] = [];
  const entityStartPattern = /(\w+)\s*:\s*i\.entity\(\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = entityStartPattern.exec(content)) !== null) {
    const entityName = match[1];
    if (!entityName) continue;

    const startIdx = match.index + match[0].length;
    const body = extractBalancedBraces(content, startIdx);
    if (!body) continue;

    const fields: ParsedField[] = [
      // InstantDB always provides an `id` field
      { name: "id", tsType: "string", optional: false, indexed: true, unique: true },
    ];

    // Match field patterns: `fieldName: i.string()`, `i.number().optional()`, etc.
    const fieldPattern = /(\w+)\s*:\s*i\.(string|number|boolean|date|json|any)\(\)/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldPattern.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      const idbType = fieldMatch[2];
      if (!fieldName || !idbType) continue;

      const tsType = INSTANTDB_TO_TS[idbType] || "unknown";

      // Check modifiers after the i.type() call
      const rest = body.substring(
        fieldMatch.index + fieldMatch[0].length,
        Math.min(fieldMatch.index + fieldMatch[0].length + 50, body.length)
      );

      fields.push({
        name: fieldName,
        tsType,
        optional: rest.startsWith(".optional()"),
        indexed: rest.includes(".indexed("),
        unique: rest.includes(".unique("),
      });
    }

    results.push({ name: entityName, fields });
  }

  return results;
}

function parseLinks(content: string): ParsedLink[] {
  const results: ParsedLink[] = [];

  // Find the links section
  const linksMatch = content.match(/links:\s*\{/);
  if (!linksMatch) return results;

  const startIdx = (linksMatch.index || 0) + linksMatch[0].length;
  const linksBody = extractBalancedBraces(content, startIdx);
  if (!linksBody) return results;

  // Match each link definition:
  // linkName: { forward: { on: "entity", has: "many", label: "items" }, reverse: { ... } }
  const linkStartPattern = /(\w+)\s*:\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = linkStartPattern.exec(linksBody)) !== null) {
    const linkName = match[1];
    if (!linkName) continue;

    const linkStartIdx = match.index + match[0].length;
    const linkBody = extractBalancedBraces(linksBody, linkStartIdx);
    if (!linkBody) continue;

    // Parse forward
    const forwardMatch = linkBody.match(/forward:\s*\{[^}]*on:\s*["'](\w+)["'][^}]*has:\s*["'](one|many)["'][^}]*label:\s*["'](\w+)["']/);
    if (!forwardMatch) continue;

    const link: ParsedLink = {
      name: linkName,
      forward: {
        on: forwardMatch[1] || "",
        has: (forwardMatch[2] as "one" | "many") || "many",
        label: forwardMatch[3] || linkName,
      },
    };

    // Parse reverse (optional)
    const reverseMatch = linkBody.match(/reverse:\s*\{[^}]*on:\s*["'](\w+)["'][^}]*has:\s*["'](one|many)["'][^}]*label:\s*["'](\w+)["']/);
    if (reverseMatch) {
      link.reverse = {
        on: reverseMatch[1] || "",
        has: (reverseMatch[2] as "one" | "many") || "many",
        label: reverseMatch[3] || linkName,
      };
    }

    results.push(link);
  }

  return results;
}

// ─── Type Generation ──────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase())
    // Handle plurals → singular for type names
    .replace(/ies$/, "y")
    .replace(/ses$/, "s")
    .replace(/s$/, "");
}

/**
 * Generate TypeScript types from a parsed schema.
 */
export function generateTypes(schema: ParsedSchema): string {
  const lines: string[] = [
    "/**",
    " * Auto-generated TypeScript types from InstantDB schema.",
    ` * Generated at: ${new Date().toISOString()}`,
    " * DO NOT EDIT — regenerate with: mycontext generate types --from-schema",
    " */",
    "",
  ];

  // Build relation map for each entity
  const entityRelations = new Map<string, Array<{ label: string; targetEntity: string; has: "one" | "many" }>>();

  for (const link of schema.links) {
    // Forward relation
    const fwdEntity = link.forward.on;
    if (!entityRelations.has(fwdEntity)) entityRelations.set(fwdEntity, []);
    const reverseTarget = link.reverse?.on || "";
    if (reverseTarget) {
      entityRelations.get(fwdEntity)!.push({
        label: link.forward.label,
        targetEntity: reverseTarget,
        has: link.forward.has,
      });
    }

    // Reverse relation
    if (link.reverse) {
      const revEntity = link.reverse.on;
      if (!entityRelations.has(revEntity)) entityRelations.set(revEntity, []);
      entityRelations.get(revEntity)!.push({
        label: link.reverse.label,
        targetEntity: fwdEntity,
        has: link.reverse.has,
      });
    }
  }

  // Track used type names to handle duplicates (e.g., multiple "presence" entities in rooms)
  const usedTypeNames = new Map<string, number>();

  function getUniqueTypeName(baseName: string): string {
    const pascal = toPascalCase(baseName);
    const count = usedTypeNames.get(pascal) || 0;
    usedTypeNames.set(pascal, count + 1);
    return count === 0 ? pascal : `${pascal}${count + 1}`;
  }

  for (const entity of schema.entities) {
    const typeName = getUniqueTypeName(entity.name);

    // Base entity type
    lines.push(`export type ${typeName} = {`);
    for (const field of entity.fields) {
      const optMarker = field.optional ? "?" : "";
      lines.push(`  ${field.name}${optMarker}: ${field.tsType};`);
    }
    lines.push("};");
    lines.push("");

    // Insert type (omits id)
    lines.push(`export type ${typeName}Insert = Omit<${typeName}, "id">;`);
    lines.push("");

    // WithRelations type
    const relations = entityRelations.get(entity.name);
    if (relations && relations.length > 0) {
      lines.push(`export type ${typeName}WithRelations = ${typeName} & {`);
      for (const rel of relations) {
        const relType = toPascalCase(rel.targetEntity);
        if (rel.has === "many") {
          lines.push(`  ${rel.label}?: ${relType}[];`);
        } else {
          lines.push(`  ${rel.label}?: ${relType};`);
        }
      }
      lines.push("};");
      lines.push("");
    }
  }

  // Entity name union (deduplicated)
  if (schema.entities.length > 0) {
    const uniqueNames = [...new Set(schema.entities.map((e) => e.name))];
    lines.push("// Entity name union");
    lines.push(
      `export type EntityName = ${uniqueNames.map((n) => `"${n}"`).join(" | ")};`
    );
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Read an InstantDB schema file and generate TypeScript types.
 * Returns the generated types content string.
 */
export async function generateTypesFromSchemaFile(
  projectRoot: string
): Promise<{ content: string; entityCount: number; fieldCount: number }> {
  const schemaPaths = [
    "instant.schema.ts",
    "src/instant.schema.ts",
    ".mycontext/schema.ts",
    "instant.schema.js",
  ];

  let schemaContent: string | null = null;

  for (const sp of schemaPaths) {
    const fullPath = path.join(projectRoot, sp);
    if (await fs.pathExists(fullPath)) {
      schemaContent = await fs.readFile(fullPath, "utf-8");
      break;
    }
  }

  if (!schemaContent) {
    throw new Error(
      `Schema file not found. Looked in: ${schemaPaths.join(", ")}. ` +
        `Please create an InstantDB schema file (e.g., instant.schema.ts)`
    );
  }

  const schema = parseSchema(schemaContent);

  if (schema.entities.length === 0) {
    throw new Error(
      "No entities found in schema. Ensure your schema uses the i.entity() format."
    );
  }

  const content = generateTypes(schema);
  const fieldCount = schema.entities.reduce((sum, e) => sum + e.fields.length, 0);

  return { content, entityCount: schema.entities.length, fieldCount };
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractBalancedBraces(
  content: string,
  startAfterOpenBrace: number
): string | null {
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
