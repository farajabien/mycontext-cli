import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { EnhancedSpinner } from "../utils/spinner";

export class NormalizeCommand {
  async execute(type: string): Promise<void> {
    if (type !== "preview") {
      throw new Error(`Unknown normalize target: ${type}`);
    }
    const spinner = new EnhancedSpinner("Normalizing preview layout...");
    try {
      spinner.start();
      const cwd = process.cwd();
      const contextDir = path.join(cwd, "context");
      const listPath = path.join(contextDir, "component-list.json");
      const typesPath = path.join(contextDir, "types.ts");
      const prdPath = path.join(contextDir, "prd.md");

      // Read sources if present
      const list = (await fs.pathExists(listPath))
        ? await fs.readJson(listPath)
        : { groups: [] };
      const types = (await fs.pathExists(typesPath))
        ? await fs.readFile(typesPath, "utf8")
        : "";
      const prd = (await fs.pathExists(prdPath))
        ? await fs.readFile(prdPath, "utf8")
        : "";

      // Deterministic layout: groups in columns, components stacked with spacing
      const colWidth = 420;
      const rowHeight = 300;
      const gap = 40;

      const groups = Array.isArray(list.groups) ? list.groups : [];
      const layout: any = {
        version: 1,
        generatedAt: new Date().toISOString(),
        meta: {
          project: list.project || null,
          hasTypes: Boolean(types),
          hasPrd: Boolean(prd),
        },
        nodes: [] as Array<{
          id: string;
          group: string;
          name: string;
          x: number;
          y: number;
          w: number;
          h: number;
        }>,
      };

      let col = 0;
      for (const g of groups) {
        const comps = Array.isArray(g.components) ? g.components : [];
        let row = 0;
        for (const c of comps) {
          const name = String(c?.name || "Component");
          const node = {
            id: `${String(
              g.name || "Group"
            ).toLowerCase()}-${name.toLowerCase()}`,
            group: String(g.name || "Group"),
            name,
            x: col * (colWidth + gap),
            y: row * (rowHeight + gap),
            w: colWidth,
            h: rowHeight,
          };
          layout.nodes.push(node);
          row += 1;
        }
        col += 1;
      }

      const outDir = path.join(cwd, ".mycontext");
      await fs.ensureDir(outDir);
      const outPath = path.join(outDir, "preview-layout.json");
      await fs.writeJson(outPath, layout, { spaces: 2 });
      spinner.success({
        text: `Normalized preview layout → ${path.relative(cwd, outPath)}`,
      });
      this.printNextCommands();
    } catch (error) {
      spinner.error({ text: "Failed to normalize preview layout" });
      throw error;
    }
  }

  private printNextCommands(): void {
    try {
      console.log("");
      console.log(chalk.blue("➡️ Next commands:"));
      console.log(chalk.gray("   mycontext preview components"));
      console.log(
        chalk.gray("   mycontext generate-components all --with-tests")
      );
      console.log("");
    } catch {}
  }
}
