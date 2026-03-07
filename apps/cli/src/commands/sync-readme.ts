import chalk from "chalk";
import * as fs from "fs-extra";
import * as path from "path";
import { DesignManifestManager } from "@myycontext/core";
import { CommandOptions } from "../types";
import { MonorepoScanner, WorkspaceMember } from "../services/MonorepoScanner";
import { ReadmeDeducer } from "../services/ReadmeDeducer";
import { ProjectScanner } from "../services/ProjectScanner";
import { LivingContext } from "../types/living-context";

interface SyncREADMEOptions extends CommandOptions {
  force?: boolean;
  verbose?: boolean;
}

export class SyncREADMECommand {
  private manifestManager: DesignManifestManager;
  private monorepoScanner: MonorepoScanner;
  private readmeDeducer: ReadmeDeducer;

  constructor() {
    this.manifestManager = new DesignManifestManager();
    this.monorepoScanner = new MonorepoScanner();
    this.readmeDeducer = new ReadmeDeducer();
  }

  async execute(options: SyncREADMEOptions): Promise<void> {
    const rootPath = process.cwd();
    
    try {
      const isMonorepo = await this.monorepoScanner.isMonorepo();
      
      if (isMonorepo) {
        console.log(chalk.blue.bold("🏢 Monorepo detected. Scanning workspaces..."));
        const members = await this.monorepoScanner.findWorkspaceMembers();
        
        // Sync root first
        await this.syncDirectory(rootPath, options, true);
        
        // Sync each member
        for (const member of members) {
          console.log(chalk.cyan(`\n📦 Workspace: ${member.name} (${member.path})`));
          await this.syncDirectory(member.path, options);
        }
      } else {
        await this.syncDirectory(rootPath, options);
      }

    } catch (error) {
      console.error(chalk.red("❌ README synchronization failed:"), error);
    }
  }

  private async syncDirectory(dir: string, options: SyncREADMEOptions, isRoot = false): Promise<void> {
    const readmePath = path.join(dir, "README.md");
    const contextPath = path.join(dir, ".mycontext", "context.json");

    // 1. Load context/manifest
    let context: any = null;
    if (await fs.pathExists(contextPath)) {
      context = await fs.readJson(contextPath);
    }

    // 2. Handle missing README
    if (!(await fs.pathExists(readmePath))) {
      console.log(chalk.yellow(`⚠️  README.md not found in ${path.basename(dir)}`));
      
      console.log(chalk.blue("✨ Deducing README via Project Scan..."));
      const scanner = new ProjectScanner(dir);
      const snapshot = await scanner.scan();
      
      const deducedContent = this.readmeDeducer.deduceFullReadme(context || undefined, snapshot);
      await fs.writeFile(readmePath, deducedContent);
      console.log(chalk.green(`✅ Generated new README.md for ${path.basename(dir)}`));
      return;
    }

    // 3. Sync existing README
    if (context && (await fs.pathExists(readmePath))) {
      const readmeContent = await fs.readFile(readmePath, "utf-8");
      const injectedContent = this.readmeDeducer.generateSyncContent(context);
      const updatedContent = this.syncContent(readmeContent, injectedContent);

      if (updatedContent !== readmeContent) {
        await fs.writeFile(readmePath, updatedContent, "utf-8");
        console.log(chalk.green(`✅ ${path.basename(dir)}/README.md synchronized!`));
      } else if (options.verbose) {
        console.log(chalk.gray(`ℹ️  ${path.basename(dir)}/README.md is already in sync.`));
      }
    }
  }

  private syncContent(readme: string, newContent: string): string {
    const startMarker = "<!-- mycontext:start -->";
    const endMarker = "<!-- mycontext:end -->";

    const startIndex = readme.indexOf(startMarker);
    const endIndex = readme.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return readme; // Silently skip if no markers and we're in sync mode
    }

    const before = readme.substring(0, startIndex + startMarker.length);
    const after = readme.substring(endIndex);

    return `${before}${newContent}${after}`;
  }
}
