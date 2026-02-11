import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

/**
 * Clean and repair malformed context files
 */
export async function cleanContextFiles(
  projectPath: string = process.cwd()
): Promise<void> {
  const contextDir = path.join(projectPath, ".mycontext");

  if (!(await fs.pathExists(contextDir))) {
    console.log(chalk.yellow("No .mycontext directory found"));
    return;
  }

  console.log(chalk.blue("🧹 Cleaning context files..."));

  // Fix component-list.json
  await cleanComponentList(contextDir);

  // Regenerate missing split files
  await regenerateSplitFiles(contextDir);

  console.log(chalk.green("✅ Context files cleaned"));
}

async function cleanComponentList(contextDir: string): Promise<void> {
  const compListPath = path.join(contextDir, "04-component-list.json");

  if (!(await fs.pathExists(compListPath))) {
    return;
  }

  try {
    const content = await fs.readFile(compListPath, "utf-8");
    const parsed = JSON.parse(content);

    // Check if it's the error format even if it parses
    if (parsed.error || !parsed.groups) {
      throw new Error("Invalid component list format");
    }

    // If it parses correctly and has groups, we're good
    console.log(chalk.green("   ✅ 04-component-list.json is valid"));
    return;
  } catch (error) {
    console.log(
      chalk.yellow("   🔧 Fixing malformed 04-component-list.json...")
    );

    try {
      const content = await fs.readFile(compListPath, "utf-8");

      // Check if it's the error format with raw field
      const parsed = JSON.parse(content);
      if (parsed.error && parsed.raw) {
        // Extract and clean the raw JSON
        let rawJson = parsed.raw;

        // Common fixes for malformed JSON
        rawJson = rawJson
          .replace(/,\s*}/g, "}") // Remove trailing commas
          .replace(/,\s*]/g, "]") // Remove trailing commas in arrays
          .replace(/\n/g, "") // Remove newlines that might break parsing
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();

        // Try to fix incomplete JSON by adding missing closing braces
        const openBraces = (rawJson.match(/{/g) || []).length;
        const closeBraces = (rawJson.match(/}/g) || []).length;
        const openBrackets = (rawJson.match(/\[/g) || []).length;
        const closeBrackets = (rawJson.match(/]/g) || []).length;

        // Add missing closing braces
        for (let i = 0; i < openBraces - closeBraces; i++) {
          rawJson += "}";
        }

        // Add missing closing brackets
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          rawJson += "]";
        }

        // Try to parse the cleaned JSON
        const cleanedData = JSON.parse(rawJson);

        // Write the cleaned JSON back
        await fs.writeFile(compListPath, JSON.stringify(cleanedData, null, 2));
        console.log(
          chalk.green("   ✅ Fixed and reformatted 04-component-list.json")
        );
      } else {
        throw new Error("Unknown JSON format");
      }
    } catch (parseError) {
      console.log(
        chalk.red(
          "   ❌ Could not automatically fix JSON. Creating fallback..."
        )
      );

      // Create a minimal fallback structure
      const fallback = {
        groups: [
          {
            name: "Core",
            description: "Essential components for the application",
            components: [
              {
                name: "MainComponent",
                description: "Primary application component",
                type: "display",
                priority: "high",
                dependencies: ["Button", "Card"],
                tags: ["core"],
                acceptanceCriteria: [
                  "Renders without errors",
                  "Responsive design",
                  "Accessible markup",
                ],
                context: "Main application interface",
              },
            ],
          },
        ],
        metadata: {
          generatedAt: new Date().toISOString(),
          totalGroups: 1,
          totalComponents: 1,
        },
      };

      await fs.writeFile(compListPath, JSON.stringify(fallback, null, 2));
      console.log(
        chalk.yellow(
          "   ⚠️  Created fallback component list. Regenerate for your specific project."
        )
      );
    }
  }
}

async function regenerateSplitFiles(contextDir: string): Promise<void> {
  const prdPath = path.join(contextDir, "01-prd.md");

  if (!(await fs.pathExists(prdPath))) {
    return;
  }

  const prdContent = await fs.readFile(prdPath, "utf-8");
  const sections = splitPrdContent(prdContent);

  const filesToCheck = [
    { file: "01a-brief.md", content: sections.brief, name: "brief" },
    {
      file: "01b-requirements.md",
      content: sections.requirements,
      name: "requirements",
    },
    { file: "01c-flows.md", content: sections.flows, name: "flows" },
  ];

  for (const { file, content, name } of filesToCheck) {
    const filePath = path.join(contextDir, file);

    if (!(await fs.pathExists(filePath)) && content.trim().length > 0) {
      await fs.writeFile(filePath, content);
      console.log(chalk.green(`   ✅ Regenerated ${file} (${name})`));
    } else if (!content.trim().length) {
      console.log(
        chalk.yellow(`   ⚠️  No ${name} content found in PRD to extract`)
      );
    }
  }
}

function splitPrdContent(raw: string): {
  brief: string;
  requirements: string;
  flows: string;
} {
  try {
    const text = String(raw);

    // More flexible section matching
    const reqPatterns = [
      /###?\s*Requirements/i,
      /###?\s*Detailed User Stories/i,
      /###?\s*Acceptance Criteria/i,
      /###?\s*User Stories/i,
      /##\s*\d+\.\s*Detailed User Stories/i,
    ];

    const flowPatterns = [
      /###?\s*Flows/i,
      /###?\s*User Journeys/i,
      /```mermaid/i,
      /##\s*\d+\.\s*User Journeys/i,
      /flowchart/i,
    ];

    let idxReq = -1;
    let idxFlows = -1;

    // Find requirements section
    for (const pattern of reqPatterns) {
      const match = text.search(pattern);
      if (match !== -1) {
        idxReq = match;
        break;
      }
    }

    // Find flows section
    for (const pattern of flowPatterns) {
      const match = text.search(pattern);
      if (match !== -1) {
        idxFlows = match;
        break;
      }
    }

    let brief = text;
    let requirements = "";
    let flows = "";

    if (idxReq > 0) {
      brief = text.substring(0, idxReq).trim();
      if (idxFlows > idxReq) {
        requirements = text.substring(idxReq, idxFlows).trim();
        flows = text.substring(idxFlows).trim();
      } else {
        requirements = text.substring(idxReq).trim();
      }
    } else if (idxFlows > 0) {
      brief = text.substring(0, idxFlows).trim();
      flows = text.substring(idxFlows).trim();
    }

    return { brief, requirements, flows };
  } catch (error) {
    console.warn("Error splitting PRD content:", error);
    return {
      brief: raw,
      requirements: "",
      flows: "",
    };
  }
}

// CLI interface
export async function runCleanCommand(projectPath?: string): Promise<void> {
  try {
    await cleanContextFiles(projectPath);
  } catch (error: any) {
    console.error(chalk.red(`Clean failed: ${error.message}`));
    process.exit(1);
  }
}
