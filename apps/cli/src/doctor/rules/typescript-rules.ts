/**
 * TypeScript Rules — Type safety checks for TypeScript projects
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

/**
 * Find all occurrences of a pattern in content with line numbers
 */
function findOccurrences(content: string, pattern: RegExp): Array<{ line: number; match: string }> {
  const lines = content.split("\n");
  const occurrences: Array<{ line: number; match: string }> = [];

  lines.forEach((line, index) => {
    const matches = line.match(pattern);
    if (matches) {
      occurrences.push({ line: index + 1, match: matches[0] });
    }
  });

  return occurrences;
}

// ─── Rules ────────────────────────────────────────────────────────

const asAnyCasts: DoctorRule = {
  id: "typescript/as-any-casts",
  name: "Avoid 'as any' Type Casts",
  category: "node",
  severity: "warning",
  description: "Detects usage of 'as any' type casts which bypass TypeScript's type checking",
  help: "Replace 'as any' with proper type annotations or type guards. Use Record<string, unknown> for dynamic objects.",
  appliesTo: ["nextjs", "node"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    // Find all TypeScript/JavaScript files
    const files = await ctx.findFiles(/\.(tsx?|jsx?)$/);

    // Pattern to match 'as any' (with word boundaries)
    const asAnyPattern = /\s+as\s+any[\s\)\;\,\}\]\.]/g;

    // Track files with most casts for summary
    const fileStats: Array<{ file: string; count: number; lines: number[] }> = [];

    for (const file of files) {
      const content = await ctx.readFile(file);
      if (!content) continue;

      const occurrences = findOccurrences(content, asAnyPattern);

      if (occurrences.length > 0) {
        fileStats.push({
          file,
          count: occurrences.length,
          lines: occurrences.map(o => o.line)
        });

        const firstOccurrence = occurrences[0];
        if (firstOccurrence) {
          results.push(
            diag(
              this,
              file,
              `Found ${occurrences.length} 'as any' cast${occurrences.length > 1 ? 's' : ''}`,
              {
                line: firstOccurrence.line,
                help: `Replace 'as any' with proper type annotations. Consider using 'Record<string, unknown>' for dynamic objects or type guards for runtime checks.`
              }
            )
          );
        }
      }
    }

    return results;
  },
};

const unknownTransactionArray: DoctorRule = {
  id: "typescript/instantdb-transaction-typing",
  name: "InstantDB Transaction Array Typing",
  category: "node",
  severity: "error",
  description: "Detects unknown[] arrays passed to adminDb.transact() which cause type errors",
  help: "Change 'unknown[]' to 'TransactionChunk<any, any>[]' and import from '@instantdb/admin'",
  appliesTo: ["nextjs", "node"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    // Find all TypeScript files
    const files = await ctx.findFiles(/\.tsx?$/);

    for (const file of files) {
      const content = await ctx.readFile(file);
      if (!content) continue;

      // Check if file uses adminDb.transact
      if (!content.includes("adminDb.transact") && !content.includes("db.transact")) {
        continue;
      }

      // Look for unknown[] array declarations
      const unknownArrayPattern = /const\s+(\w+):\s*unknown\[\]/g;
      const matches = Array.from(content.matchAll(unknownArrayPattern));

      for (const match of matches) {
        const varName = match[1];

        // Check if this array is passed to transact
        const transactPattern = new RegExp(`\\.transact\\s*\\(\\s*${varName}`, "g");
        if (transactPattern.test(content)) {
          const lines = content.split("\n");
          const lineNum = lines.findIndex(line => line.includes(match[0])) + 1;

          results.push(
            diag(
              this,
              file,
              `'${varName}' is typed as 'unknown[]' but passed to transact()`,
              {
                line: lineNum,
                help: `Change 'const ${varName}: unknown[]' to 'const ${varName}: TransactionChunk<any, any>[]' and import { TransactionChunk } from '@instantdb/admin'`,
              }
            )
          );
        }
      }
    }

    return results;
  },
};

const duplicateTypeDeclarations: DoctorRule = {
  id: "typescript/duplicate-type-declarations",
  name: "Duplicate Type Declarations",
  category: "node",
  severity: "warning",
  description: "Detects type/interface declarations that duplicate schema-derived types",
  help: "Remove hand-written type declarations that duplicate schema types. Import from schema.ts instead.",
  appliesTo: ["nextjs", "node"],
  async check(ctx) {
    const results: Diagnostic[] = [];

    // Find schema.ts file (could be in types/ or src/types/)
    const schemaFiles = await ctx.findFiles(/types\/schema\.tsx?$/);
    if (schemaFiles.length === 0) {
      return results; // No schema file, skip check
    }

    const schemaFile = schemaFiles[0];
    if (!schemaFile) return results;

    const schemaContent = await ctx.readFile(schemaFile);
    if (!schemaContent) return results;

    // Extract exported types from schema (looking for InstaQLEntity pattern or interface/type declarations)
    const schemaTypePattern = /export\s+(?:type|interface)\s+(\w+)/g;
    const schemaTypes = new Set<string>();
    let match;

    while ((match = schemaTypePattern.exec(schemaContent)) !== null) {
      const typeName = match[1];
      if (typeName) {
        schemaTypes.add(typeName);
      }
    }

    if (schemaTypes.size === 0) {
      return results; // No types in schema, skip
    }

    // Check other files in types/ directory
    const typeFiles = await ctx.findFiles(/types\/.*\.tsx?$/);

    for (const file of typeFiles) {
      if (file === schemaFile) continue; // Skip the schema file itself

      const content = await ctx.readFile(file);
      if (!content) continue;

      // Find exported types/interfaces in this file
      const fileTypePattern = /export\s+(?:type|interface)\s+(\w+)/g;
      let typeMatch: RegExpExecArray | null;

      while ((typeMatch = fileTypePattern.exec(content)) !== null) {
        const typeName = typeMatch[1];

        if (typeName && schemaTypes.has(typeName)) {
          const lines = content.split("\n");
          const matchText = typeMatch[0];
          const lineNum = lines.findIndex(line => line.includes(matchText)) + 1;

          results.push(
            diag(
              this,
              file,
              `Type '${typeName}' duplicates schema type in ${schemaFile}`,
              {
                line: lineNum,
                help: `Remove this type declaration and import ${typeName} from '${schemaFile}' instead. The schema-derived type is canonical.`,
              }
            )
          );
        }
      }
    }

    return results;
  },
};

// ─── Export ───────────────────────────────────────────────────────

export const typescriptRules: DoctorRule[] = [
  asAnyCasts,
  unknownTransactionArray,
  duplicateTypeDeclarations,
];
