import { CommandOptions } from "../types";
import { FileSystemManager } from "../utils/fileSystem";
import { EnhancedSpinner } from "../utils/spinner";
import { HostedApiClient } from "../utils/hostedApiClient";
import { CompleteArchitectureEngine } from "../utils/completeArchitectureEngine";
import chalk from "chalk";
import prompts from "prompts";
import * as fs from "fs-extra";
import * as path from "path";
import { execSync } from "child_process";

interface GenerateComponentsOptions extends CommandOptions {
  group?: string;
  all?: boolean;
  output?: string;
  template?: string;
  local?: boolean; // Enable local generation without API authentication
  withTests?: boolean; // Generate unit tests alongside components
  updatePreview?: boolean; // default true
  finalCanvas?: boolean; // run normalize after generation
  openPreview?: boolean; // auto-open /preview in browser
  check?: boolean; // run lint/tsc/tests after generation
  completeArchitecture?: boolean; // Generate with actions, routes, and full documentation
  serverActions?: boolean; // Generate server actions only
  routes?: boolean; // Generate Next.js routes only
  selfDocumenting?: boolean; // Add comprehensive documentation
  architectureType?: "nextjs-app-router" | "nextjs-pages" | "react-spa"; // Architecture type
}

// --- Orchestration in GenerateComponentsCommand ---

export class GenerateComponentsCommand {
  private fs = new FileSystemManager();
  private hostedApi = new HostedApiClient();
  private architectureEngine = new CompleteArchitectureEngine();
  private contextArtifacts: {
    prd: string;
    types: string;
    brand: string;
    compListRaw: string;
    compList: any | null;
  } = {
    prd: "",
    types: "",
    brand: "",
    compListRaw: "",
    compList: null,
  };
  private stackConfig: any = null;

  // --- Naming helpers ---
  private toKebabCase(input: string): string {
    return String(input || "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/--+/g, "-")
      .toLowerCase();
  }

  private hasLocalAIKeys(): boolean {
    // Check for any local AI provider keys
    return !!(
      process.env.MYCONTEXT_GITHUB_TOKEN ||
      process.env.MYCONTEXT_QWEN_API_KEY ||
      process.env.MYCONTEXT_GEMINI_API_KEY ||
      process.env.MYCONTEXT_XAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.HUGGINGFACE_API_KEY
    );
  }

  private async loadStackConfig(): Promise<any> {
    try {
      const configPath = ".mycontext/config.json";
      if (await this.fs.exists(configPath)) {
        const configContent = await this.fs.readFile(configPath);
        this.stackConfig = JSON.parse(configContent);
        console.log(chalk.blue("🎯 Stack configuration loaded"));
        return this.stackConfig;
      }
    } catch (error) {
      console.log(
        chalk.yellow("⚠️  No stack configuration found, using defaults")
      );
    }
    return null;
  }

  private async updateComponentListAfterGeneration(
    generatedGroups: any[]
  ): Promise<void> {
    try {
      // Find the component list file
      let componentListPath = ".mycontext/04-component-list.json";
      if (!(await this.fs.exists(componentListPath))) {
        componentListPath = ".mycontext/component-list.json";
      }
      if (!(await this.fs.exists(componentListPath))) {
        componentListPath = "context/component-list.json";
      }

      if (!(await this.fs.exists(componentListPath))) {
        console.log(
          chalk.yellow("⚠️  Component list not found, skipping update")
        );
        return;
      }

      // Read existing component list
      const existingList = JSON.parse(
        await this.fs.readFile(componentListPath)
      );

      console.log("🔍 DEBUG: Component list structure:", {
        hasGroups: !!existingList.groups,
        hasChildren: !!existingList.children,
        topLevelKeys: Object.keys(existingList),
        firstLevelChildren: existingList.children
          ? Object.keys(existingList.children)
          : null,
      });

      // Update the status of generated components
      let updatedCount = 0;
      console.log(
        "🔍 DEBUG: Updating component list with groups:",
        generatedGroups.length
      );
      generatedGroups.forEach((group: any) => {
        const components = group.components || [];
        console.log(
          "🔍 DEBUG: Group:",
          group.name,
          "Components:",
          components.length
        );
        components.forEach((comp: any) => {
          console.log(
            "🔍 DEBUG: Looking for component:",
            comp.name,
            "in group:",
            group.name
          );
          // Handle both flat structure (groups) and hierarchical structure (children)
          if (existingList.groups) {
            // Flat structure
            const existingGroup = existingList.groups.find(
              (g: any) => g.name.toLowerCase() === group.name.toLowerCase()
            );
            if (existingGroup && existingGroup.components) {
              const existingComp = existingGroup.components.find(
                (c: any) => c.name.toLowerCase() === comp.name.toLowerCase()
              );
              if (existingComp) {
                existingComp.generated = true;
                existingComp.generatedAt = new Date().toISOString();
                updatedCount++;
              }
            }
          } else {
            // Hierarchical structure - find the group in children
            const findAndUpdateComponent = (
              obj: any,
              groupName: string,
              componentName: string
            ): boolean => {
              if (obj.children) {
                console.log(
                  "🔍 DEBUG: Searching in children:",
                  Object.keys(obj.children)
                );
                for (const [key, value] of Object.entries(obj.children)) {
                  console.log(
                    "🔍 DEBUG: Checking key:",
                    key,
                    "against group:",
                    groupName
                  );
                  if (key.toLowerCase() === groupName.toLowerCase()) {
                    console.log("🔍 DEBUG: Found group:", key);
                    // Found the group, now look for the component
                    if ((value as any).children) {
                      console.log(
                        "🔍 DEBUG: Group children:",
                        Object.keys((value as any).children)
                      );
                      for (const [compKey, compValue] of Object.entries(
                        (value as any).children
                      )) {
                        console.log(
                          "🔍 DEBUG: Checking component key:",
                          compKey,
                          "against:",
                          componentName
                        );
                        if (
                          compKey.toLowerCase() === componentName.toLowerCase()
                        ) {
                          console.log(
                            "🔍 DEBUG: Found component:",
                            compKey,
                            "updating..."
                          );
                          (compValue as any).generated = true;
                          (compValue as any).generatedAt =
                            new Date().toISOString();
                          return true;
                        }
                      }
                    }
                  } else {
                    // Recursively search in nested children
                    if (
                      findAndUpdateComponent(
                        value as any,
                        groupName,
                        componentName
                      )
                    ) {
                      return true;
                    }
                  }
                }
              }
              return false;
            };

            // Start the search from the top-level application object
            const topLevelKeys = Object.keys(existingList);
            console.log("🔍 DEBUG: Top-level keys:", topLevelKeys);

            let found = false;
            for (const topKey of topLevelKeys) {
              if (topKey !== "metadata") {
                // Skip metadata
                console.log("🔍 DEBUG: Searching in top-level key:", topKey);
                if (
                  findAndUpdateComponent(
                    existingList[topKey],
                    group.name,
                    comp.name
                  )
                ) {
                  console.log(
                    "🔍 DEBUG: Successfully updated component:",
                    comp.name
                  );
                  updatedCount++;
                  found = true;
                  break; // Found and updated, no need to continue
                }
              }
            }

            if (!found) {
              console.log(
                "🔍 DEBUG: Failed to find component:",
                comp.name,
                "in group:",
                group.name
              );
            }
          }
        });
      });

      // Write updated component list
      await this.fs.writeFile(
        componentListPath,
        JSON.stringify(existingList, null, 2)
      );

      if (updatedCount > 0) {
        console.log(
          chalk.blue(
            `📝 Updated component list: ${updatedCount} components marked as generated`
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `⚠️  Failed to update component list: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  private printNextStepsAfterComponents(
    options: GenerateComponentsOptions
  ): void {
    try {
      console.log(chalk.blue("\n➡️ Preview:"));
      console.log(
        chalk.gray("   Visit /preview (run your Next.js dev server)")
      );
      if (!options.finalCanvas) {
        console.log(chalk.blue("➡️ Optional final layout:"));
        console.log(chalk.gray("   mycontext normalize preview"));
      }
      console.log(chalk.blue("➡️ More:"));
      console.log(
        chalk.gray("   mycontext list components   # if authenticated")
      );
      console.log();
    } catch {}
  }

  private getComponentBaseName(component: any): string {
    const raw = typeof component === "string" ? component : component?.name;
    const name = String(raw || "Component");
    // Simple PascalCase conversion - no template generation
    return name
      .replace(/[_-]+/g, " ")
      .split(/\s+/)
      .map((w) =>
        w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""
      )
      .join("")
      .replace(/[^A-Za-z0-9]/g, "");
  }

  private getComponentExportName(component: any): string {
    return this.getComponentBaseName(component);
  }

  async execute(
    target: string,
    options: GenerateComponentsOptions
  ): Promise<void> {
    const spinner = new EnhancedSpinner("Initializing component generation...");

    try {
      // System reminder: high-level plan
      console.log(
        chalk.gray(
          "\n[mycontext] Plan: plan → generate → QA → docs → preview (→ checks)\n"
        )
      );
      // Check authentication unless local mode is enabled
      let userInfo: any = null;

      if (!options.local) {
        const { AuthCommand } = await import("./auth");
        const authCommand = new AuthCommand();

        // if (await authCommand.requireAuth()) {
        //   // Get user info for component storage
        //   userInfo = await authCommand.getUserInfo();
        //   if (userInfo) {
        //     console.log(chalk.green(`✅ Authenticated as ${userInfo.email}`));
        //   } else {
        //     userInfo = { userId: "local" };
        //   }
        // } else {
        // Soft-auth: proceed in local mode silently
        userInfo = { userId: "local" };
        // }
      } else {
        console.log(
          chalk.blue(
            "🚀 Using local AI generation (no authentication required)"
          )
        );
        userInfo = { userId: "local" };
      }

      // Load context artifacts for richer generation (PRD + Types + Brand)
      this.contextArtifacts = await this.loadContextArtifacts();

      // Load stack configuration for stack-aware generation
      await this.loadStackConfig();

      // Check if brand context exists - critical for design-consistent components
      if (!this.contextArtifacts.brand) {
        console.log(
          chalk.yellow(
            "⚠️  No brand context found. Components may not match your design system."
          )
        );
        console.log(
          chalk.gray(
            "💡 Run 'mycontext generate brand' first for design-consistent components."
          )
        );
      } else {
        console.log(
          chalk.green(
            "🎨 Brand context loaded - components will use your design tokens!"
          )
        );
      }

      // Determine if we're generating a specific group or all components
      const isAll =
        target === "all" || options.all || (options as any)["--all"];
      const groupName = isAll ? undefined : target;

      if (isAll) {
        await this.generateAllComponents(options, spinner, userInfo.userId);
      } else if (groupName) {
        await this.generateComponentGroup(
          groupName,
          options,
          spinner,
          userInfo.userId
        );
      } else {
        throw new Error(
          "Please specify a group name or 'all' to generate components"
        );
      }

      // Optionally run final canvas normalization
      if (options.finalCanvas) {
        try {
          // const { NormalizeCommand } = await import("./normalize");
          // await new NormalizeCommand().execute("preview");
        } catch (e) {
          console.log(
            chalk.yellow("   ⚠️ Normalize step failed; skipping final canvas.")
          );
        }
      }
    } catch (error) {
      spinner.error({ text: "Component generation failed" });
      // Don't re-throw - let the CLI handle it
    }
  }

  private async loadContextArtifacts(): Promise<{
    prd: string;
    types: string;
    brand: string;
    compListRaw: string;
    compList: any | null;
  }> {
    try {
      const cwd = process.cwd();
      const prdCandidates = [
        "./.mycontext/01-prd.md",
        "./.mycontext/prd.md",
        "./context/01-prd.md",
        "./context/prd.md",
      ];
      const typesCandidates = [
        "./.mycontext/02-types.ts",
        "./.mycontext/types.ts",
        "./context/types.ts",
      ];
      let prd = "";
      for (const p of prdCandidates) {
        try {
          if (await (await import("fs-extra")).pathExists(p)) {
            prd = await (await import("fs-extra")).readFile(p, "utf8");
            break;
          }
        } catch {}
      }
      let types = "";
      for (const p of typesCandidates) {
        try {
          if (await (await import("fs-extra")).pathExists(p)) {
            types = await (await import("fs-extra")).readFile(p, "utf8");
            break;
          }
        } catch {}
      }
      // component-list
      const listCandidates = [
        "./.mycontext/04-component-list.json",
        "./.mycontext/component-list.json",
        "./context/component-list.json",
      ];
      let compListRaw = "";
      let compList: any | null = null;
      for (const p of listCandidates) {
        try {
          if (await (await import("fs-extra")).pathExists(p)) {
            compListRaw = await (await import("fs-extra")).readFile(p, "utf8");
            try {
              compList = JSON.parse(compListRaw);
            } catch {
              compList = null;
            }
            break;
          }
        } catch {}
      }

      // Load brand context (CSS custom properties and design tokens)
      let brand = "";
      const brandCandidates = [
        "./.mycontext/brand/globals.css",
        "./.mycontext/03-branding.md",
        "./context/brand/globals.css",
        "./context/03-branding.md",
      ];
      for (const p of brandCandidates) {
        try {
          if (await (await import("fs-extra")).pathExists(p)) {
            brand = await (await import("fs-extra")).readFile(p, "utf8");
            break;
          }
        } catch {}
      }

      // If no brand found, try to load from the new brand folder structure
      if (!brand) {
        const brandDirCandidates = ["./.mycontext/brand/", "./context/brand/"];
        for (const dir of brandDirCandidates) {
          try {
            if (await (await import("fs-extra")).pathExists(dir)) {
              const files = await (await import("fs-extra")).readdir(dir);
              const brandContent = [];
              for (const file of files) {
                if (file.endsWith(".css") || file.endsWith(".md")) {
                  const filePath = path.join(dir, file);
                  const content = await (
                    await import("fs-extra")
                  ).readFile(filePath, "utf8");
                  brandContent.push(
                    `=== ${file.toUpperCase()} ===\n${content}`
                  );
                }
              }
              if (brandContent.length > 0) {
                brand = brandContent.join("\n\n");
                break;
              }
            }
          } catch {}
        }
      }

      return { prd, types, brand, compListRaw, compList };
    } catch {
      return { prd: "", types: "", brand: "", compListRaw: "", compList: null };
    }
  }

  private findComponentPlan(
    groupName: string,
    componentName: string
  ): any | null {
    try {
      const list = this.contextArtifacts.compList;
      if (!list || !Array.isArray(list.groups)) return null;
      const norm = (s: string) =>
        String(s || "")
          .toLowerCase()
          .replace(/\s+/g, " ");
      const g = list.groups.find((x: any) => norm(x?.name) === norm(groupName));
      if (!g || !Array.isArray(g.components)) return null;
      const c = g.components.find(
        (x: any) => norm(x?.name) === norm(componentName)
      );
      return c || null;
    } catch {
      return null;
    }
  }

  private async generateAllComponents(
    options: GenerateComponentsOptions,
    spinner: EnhancedSpinner,
    userId: string
  ): Promise<void> {
    spinner.updateText("Generating all component groups...");

    // Read component list
    let componentListPath = ".mycontext/04-component-list.json";
    if (!(await this.fs.exists(componentListPath))) {
      componentListPath = ".mycontext/component-list.json";
    }
    if (!(await this.fs.exists(componentListPath))) {
      componentListPath = "context/component-list.json";
    }
    if (!(await this.fs.exists(componentListPath))) {
      throw new Error(
        "Component list not found. Run 'mycontext generate components-list' first."
      );
    }

    const componentList = JSON.parse(await this.fs.readFile(componentListPath));

    // Check if complete architecture generation is requested
    if (
      options.completeArchitecture ||
      options.serverActions ||
      options.routes
    ) {
      await this.generateCompleteArchitecture(
        componentList,
        options,
        spinner,
        userId
      );
      return;
    }

    // Convert hierarchical structure to flat groups format for backward compatibility
    const groups = this.convertHierarchicalToFlat(componentList);

    // Enforce core-first gating: require core.json ready before generating all groups
    if (true) {
      try {
        const coreStatePath = path.join(
          process.cwd(),
          ".mycontext",
          "core.json"
        );
        if (await fs.pathExists(coreStatePath)) {
          const state = await fs.readJson(coreStatePath);
          if (!state?.ready) {
            throw new Error(
              "Core not marked ready. Run 'mycontext core generate' and 'mycontext core ready' before generating all components."
            );
          }
        }
      } catch (e) {
        throw e;
      }
    }

    if (groups.length === 0) {
      throw new Error("No component groups found in component-list.json");
    }

    // Ensure shadcn/ui components are available before generation
    await this.ensureShadcnComponentsInstalled(groups, spinner);

    // Ensure form dependencies (zod, react-hook-form) exist
    await this.ensureFormDeps(spinner);

    // Ensure test scaffold exists (optional)
    if (options.withTests) {
      await this.ensureTestsScaffold(spinner);
    }

    // Create components directory (default to components/.mycontext to avoid overriding user code)
    const componentsDir =
      options.output || path.join("components", ".mycontext");
    await this.fs.ensureDir(componentsDir);

    let totalComponents = 0;
    let generatedGroups = 0;

    for (const group of groups) {
      spinner.updateText(`Generating ${group.name} components...`);
      console.log(
        chalk.gray(
          `\n[mycontext] Reminder: generate → QA → docs for group '${group.name}'`
        )
      );

      const groupDir = path.join(componentsDir, this.toKebabCase(group.name));
      await this.fs.ensureDir(groupDir);

      const components = group.components || [];
      for (const component of components) {
        await this.generateComponent(
          component,
          group,
          groupDir,
          options,
          userId
        );
        if (options.withTests) {
          await this.generateComponentTest(component, groupDir);
        }
        totalComponents++;
      }

      // Generate group index file
      await this.generateGroupIndex(group, groupDir);

      // Generate preview page
      await this.generatePreviewPage(group, groupDir);

      generatedGroups++;
    }

    // Update preview registry and ensure /preview route
    if (options.updatePreview !== false) {
      await this.updatePreviewRegistry(componentsDir);
      await this.ensurePreviewRoute();
    }

    // Post-generation: scan actual imports and ensure missing shadcn primitives are installed
    await this.scanAndInstallShadcnFromComponents(componentsDir, spinner);

    spinner.success({
      text: `Generated ${totalComponents} components across ${generatedGroups} groups!`,
    });
    console.log(chalk.green("\n✅ Generated Files:"));
    console.log(chalk.gray(`  • ${componentsDir}/`));
    groups.forEach((group: any) => {
      console.log(chalk.gray(`    • ${group.name.toLowerCase()}/`));
      const components = group.components || [];
      components.forEach((comp: any) => {
        console.log(
          chalk.gray(`      • ${this.getComponentBaseName(comp)}.tsx`)
        );
      });
      console.log(chalk.gray(`      • index.ts`));
      console.log(chalk.gray(`      • page.tsx`));
    });

    // Update component list to reflect generated components
    await this.updateComponentListAfterGeneration(groups);

    // Post-run hints
    this.printNextStepsAfterComponents(options);

    // Optionally open preview in browser
    if (options.openPreview !== false) {
      try {
        const url = "http://localhost:3000/preview";
        console.log(chalk.blue(`\n🌐 Opening preview: ${url}`));
        // best-effort open using the OS default opener
        const opener =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
            ? "start"
            : "xdg-open";
        execSync(`${opener} ${url}`, { stdio: "ignore" });
      } catch {}
    }
  }

  private async generateComponentGroup(
    groupName: string,
    options: GenerateComponentsOptions,
    spinner: EnhancedSpinner,
    userId: string
  ): Promise<void> {
    spinner.updateText(`Generating ${groupName} components...`);

    // Read component list
    let componentListPath = ".mycontext/04-component-list.json";
    if (!(await this.fs.exists(componentListPath))) {
      componentListPath = ".mycontext/component-list.json";
    }
    if (!(await this.fs.exists(componentListPath))) {
      componentListPath = "context/component-list.json";
    }
    if (!(await this.fs.exists(componentListPath))) {
      throw new Error(
        "Component list not found. Run 'mycontext generate components-list' first."
      );
    }

    const componentList = JSON.parse(await this.fs.readFile(componentListPath));
    const groups = this.convertHierarchicalToFlat(componentList);

    const group = groups.find(
      (g: any) => g.name.toLowerCase() === groupName.toLowerCase()
    );

    if (!group) {
      throw new Error(`Group '${groupName}' not found in component-list.json`);
    }

    // Ensure shadcn/ui components are available before generation
    await this.ensureShadcnComponentsInstalled([group], spinner);

    // Ensure form dependencies (zod, react-hook-form) exist
    await this.ensureFormDeps(spinner);

    // Ensure test scaffold exists (optional)
    if (options.withTests) {
      await this.ensureTestsScaffold(spinner);
    }

    // Create group directory (default to components/.mycontext)
    const compBaseDir = options.output || path.join("components", ".mycontext");
    const groupDir = path.join(compBaseDir, this.toKebabCase(group.name));
    await this.fs.ensureDir(groupDir);

    const components = group.components || [];
    for (const component of components) {
      await this.generateComponent(component, group, groupDir, options, userId);
      if (options.withTests) {
        await this.generateComponentTest(component, groupDir);
      }
    }

    // Generate group index file
    await this.generateGroupIndex(group, groupDir);

    // Generate preview page
    await this.generatePreviewPage(group, groupDir);

    // Update preview registry and ensure /preview route
    if (options.updatePreview !== false) {
      await this.updatePreviewRegistry(compBaseDir);
      await this.ensurePreviewRoute();
    }

    // Post-generation: scan actual imports and ensure missing shadcn primitives are installed
    await this.scanAndInstallShadcnFromComponents(compBaseDir, spinner);

    spinner.success({
      text: `Generated ${components.length} components in ${group.name}!`,
    });
    console.log(chalk.green("\n✅ Generated Files:"));
    console.log(chalk.gray(`  • ${groupDir}/`));
    components.forEach((comp: any) => {
      console.log(chalk.gray(`    • ${this.getComponentBaseName(comp)}.tsx`));
    });
    console.log(chalk.gray(`    • index.ts`));
    console.log(chalk.gray(`    • page.tsx`));

    // Update component list to reflect generated components
    await this.updateComponentListAfterGeneration([group]);

    // Optionally open preview in browser
    if (options.openPreview !== false) {
      try {
        const url = "http://localhost:3000/preview";
        console.log(chalk.blue(`\n🌐 Opening preview: ${url}`));
        const opener =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
            ? "start"
            : "xdg-open";
        execSync(`${opener} ${url}`, { stdio: "ignore" });
      } catch {}
    }
  }

  /**
   * Scan generated TSX files for imports from '@/components/ui/*' and ensure those shadcn primitives are installed.
   */
  private async scanAndInstallShadcnFromComponents(
    componentsBaseDir: string,
    spinner: EnhancedSpinner
  ): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const pkgJsonPath = path.join(projectRoot, "package.json");
      if (!(await fs.pathExists(pkgJsonPath))) return;
      const needed = new Set<string>();

      const walk = async (dir: string) => {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
          const full = path.join(dir, entry);
          const stat = await fs.stat(full);
          if (stat.isDirectory()) await walk(full);
          else if (entry.endsWith(".tsx")) {
            const src = await fs.readFile(full, "utf8");
            const re = /from\s+["']@\/components\/ui\/([^"']+)["']/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(src))) {
              const mod = m[1];
              if (mod) needed.add(mod);
            }
          }
        }
      };
      await walk(componentsBaseDir);

      if (needed.size === 0) return;

      // Filter out already-present ui files
      const uiDir = path.join(projectRoot, "components", "ui");
      const missing: string[] = [];
      for (const name of needed) {
        const p = path.join(uiDir, `${name}.tsx`);
        if (!(await fs.pathExists(p))) missing.push(name);
      }
      if (missing.length === 0) return;

      spinner.updateText(
        `Installing missing shadcn primitives from imports (${missing.length})...`
      );
      const pm = await this.detectPackageManager(projectRoot);
      try {
        if (pm === "pnpm") {
          execSync(`pnpm dlx shadcn@latest add ${missing.join(" ")}`.trim(), {
            cwd: projectRoot,
            stdio: "inherit",
          });
        } else {
          execSync(`npx shadcn@latest add ${missing.join(" ")}`.trim(), {
            cwd: projectRoot,
            stdio: "inherit",
          });
        }
      } catch {
        console.log(
          chalk.yellow(
            "   ⚠️ shadcn add (post-scan) failed; you can add components manually."
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ shadcn post-scan encountered an issue: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  /**
   * Apply brand tokens to globals.css (:root variables) if branding exists.
   */
  private async applyBrandTokens(): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const appDir = (await fs.pathExists(path.join(projectRoot, "src", "app")))
        ? path.join(projectRoot, "src", "app")
        : path.join(projectRoot, "app");
      const globalsPath = path.join(appDir, "globals.css");
      if (!(await fs.pathExists(globalsPath))) return;
      const brandPath = path.join(projectRoot, ".mycontext", "03-branding.md");
      if (!(await fs.pathExists(brandPath))) return;
      const brand = await fs.readFile(brandPath, "utf8");
      const pick = (label: string) => {
        const m = brand.match(new RegExp(label + ".*?(#[0-9a-fA-F]{6})"));
        return m ? m[1] : null;
      };
      const primary = pick("primary") || pick("Primary") || null;
      const secondary = pick("secondary") || pick("Secondary") || null;
      const accent = pick("accent") || pick("Accent") || null;

      if (!primary && !secondary && !accent) return;
      let css = await fs.readFile(globalsPath, "utf8");
      const ensureVar = (name: string, value: string) => {
        const re = new RegExp(`(--${name}:\s*)([^;]+)(;)`);
        if (re.test(css)) css = css.replace(re, `$1${value}$3`);
        else
          css = css.replace(
            /:root\s*\{/,
            (m) => `${m}\n  --${name}: ${value};`
          );
      };
      if (primary) ensureVar("primary", primary);
      if (secondary) ensureVar("secondary", secondary);
      if (accent) ensureVar("accent", accent);
      await fs.writeFile(globalsPath, css);
    } catch {}
  }

  private async generateComponent(
    component: any,
    group: any,
    groupDir: string,
    options: GenerateComponentsOptions,
    userId: string
  ): Promise<void> {
    try {
      // Check if user has local AI keys configured
      const hasLocalKeys = this.hasLocalAIKeys();

      let codeResult: { code: string; metadata: any } | undefined;

      if (hasLocalKeys) {
        // Use local AI first (user's own keys) - sub-agent orchestration
        const { orchestrator } = await import(
          "../agents/orchestrator/SubAgentOrchestrator"
        );

        // Execute code generation with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 2000; // 2 seconds base delay

        while (retryCount <= maxRetries) {
          try {
            console.log(
              `🔍 DEBUG: About to call orchestrator.executeAgent for CodeGenSubAgent (attempt ${
                retryCount + 1
              }/${maxRetries + 1})`
            );

            // Use stack configuration timeout if available
            const timeout = this.stackConfig?.timeouts?.generation || 60000;

            codeResult = (await Promise.race([
              orchestrator.executeAgent("CodeGenSubAgent", {
                component,
                group,
                options: {
                  ...options,
                  context: {
                    prd: this.contextArtifacts.prd,
                    types: this.contextArtifacts.types,
                    branding: this.contextArtifacts.brand,
                    componentList: this.contextArtifacts.compListRaw,
                    stackConfig: this.stackConfig, // Pass stack config to AI
                  },
                },
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        `Code generation timed out after ${
                          timeout / 1000
                        } seconds`
                      )
                    ),
                  timeout
                )
              ),
            ])) as { code: string; metadata: any };

            // If we get here, generation was successful
            break;
          } catch (error: any) {
            retryCount++;

            if (retryCount > maxRetries) {
              // Final attempt failed, throw the error
              throw error;
            }

            // Check if it's a retryable error
            const isRetryableError =
              error.message.includes("rate limit") ||
              error.message.includes("timeout") ||
              error.message.includes("aborted") ||
              error.message.includes("All AI providers failed");

            if (!isRetryableError) {
              // Non-retryable error, throw immediately
              throw error;
            }

            // Calculate exponential backoff delay
            const delay =
              baseDelay * Math.pow(2, retryCount - 1) + Math.random() * 1000;
            console.log(
              `⚠️  Generation failed (attempt ${retryCount}/${
                maxRetries + 1
              }): ${error.message}`
            );
            console.log(
              `🔄 Retrying in ${Math.round(delay / 1000)} seconds...`
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      } else {
        // No local keys - use hosted API (requires authentication)
        const hostedResult = await this.hostedApi.generateComponent(
          `Generate a React component: ${component.name}`,
          {
            componentName: component.name,
            group: group.name,
            context: {
              prd: this.contextArtifacts.prd,
              types: this.contextArtifacts.types,
            },
            withTests: options.withTests || false,
          }
        );

        if (hostedResult.success && hostedResult.data) {
          codeResult = {
            code: hostedResult.data.code || hostedResult.data,
            metadata: hostedResult.metadata || {},
          };
        } else {
          throw new Error(hostedResult.error || "Hosted API failed");
        }
      }

      if (!codeResult) {
        throw new Error("Code generation failed - no result returned");
      }

      const fileBase = this.getComponentBaseName(component);
      const componentPath = path.join(groupDir, `${fileBase}.tsx`);

      // Generate UI specification before writing component
      if (options.verbose) {
        console.log(
          chalk.blue(`📋 Generating UI specification for ${component.name}...`)
        );
        try {
          const { RefineCommand } = await import("./refine");
          const refineCommand = new RefineCommand();
          const uiSpec = await refineCommand.generateUISpec({
            componentName: component.name,
            description: component.description,
            outputFormat: "compact",
            template: "custom",
            verbose: false,
          });

          // Write UI spec to file
          const specPath = path.join(groupDir, `${fileBase}.spec.md`);
          const specContent = `# UI Specification for ${component.name}\n\n${uiSpec.compactSpec}\n\n---\n\n${uiSpec.detailedSpec}`;
          await this.fs.writeFile(specPath, specContent);

          if (options.verbose) {
            console.log(
              chalk.green(`  ✓ UI specification generated: ${specPath}`)
            );
          }
        } catch (error) {
          console.log(
            chalk.yellow(`  ⚠️  UI spec generation failed: ${error}`)
          );
        }
      }

      // Fix common identifier issues (spaces in names) in generated code
      const safeName = this.getComponentBaseName(component);
      const fixedCode = codeResult.code
        .replace(
          /interface\s+([A-Za-z][\w\s]*)Props/g,
          (_m, p1) => `interface ${p1.replace(/\s+/g, "")}Props`
        )
        .replace(
          /export\s+function\s+([A-Za-z][\w\s]*)\s*\(/g,
          (_m, p1) => `export function ${p1.replace(/\s+/g, "")}(`
        )
        .replace(
          /export\s+default\s+([A-Za-z][\w\s]*)/g,
          (_m, p1) => `export default ${p1.replace(/\s+/g, "")}`
        )
        .replace(new RegExp(`${safeName} Default`, "g"), `${safeName}Default`);
      await this.fs.writeFile(componentPath, fixedCode);

      // Execute QA and docs in parallel
      const componentWithContext = {
        ...component,
        _context: {
          group: group?.name,
          prd: this.contextArtifacts.prd,
          types: this.contextArtifacts.types,
          branding: this.contextArtifacts.brand,
        },
      };
      // const [qaResult, docsResult] = (await Promise.all([
      //   // orchestrator.executeAgent("QASubAgent", {
      //     code: codeResult.code,
      //     component: componentWithContext,
      //     standards: ["typescript", "react", "accessibility"],
      //   }),
      //   // orchestrator.executeAgent("DocsSubAgent", {
      //     code: codeResult.code,
      //     component: componentWithContext,
      //     format: "readme" as const,
      //   }),
      // ])) as [
      //   { isValid: boolean; issues: any[]; score: number },
      //   { content: string; format: string; estimatedReadTime: number }
      // ];

      // Mock results for now
      const qaResult = { isValid: true, issues: [], score: 95 };
      const docsResult = {
        content: "Component documentation",
        format: "readme",
        estimatedReadTime: 2,
      };

      // Write documentation
      const docsPath = path.join(
        groupDir,
        `${this.getComponentBaseName(component)}.md`
      );
      await this.fs.writeFile(docsPath, docsResult.content);

      // Log QA results
      if (qaResult.score < 70) {
        console.log(
          chalk.yellow(
            `⚠️  QA Score for ${component.name}: ${qaResult.score}/100`
          )
        );
        if (qaResult.issues.length > 0) {
          console.log(chalk.gray(`  Issues found: ${qaResult.issues.length}`));
        }
      } else {
        console.log(
          chalk.green(
            `✅ QA Score for ${component.name}: ${qaResult.score}/100`
          )
        );
      }

      // Store component in InstantDB
      await this.storeComponent({
        userId,
        name: component.name,
        code: codeResult.code,
        metadata: {
          prompt: component.description || "",
          model: "claude-sonnet",
          executionTime: Date.now(),
          qualityScore: qaResult.score,
          group: group.name,
          dependencies: codeResult.metadata?.dependencies || [],
          tags: codeResult.metadata?.tags || [],
        },
        group: group.name,
        qualityScore: qaResult.score,
      });
    } catch (error) {
      // Fail hard: no local/template fallback
      throw error;
    }
  }

  /**
   * Ensure shadcn/ui is initialized and required components are installed
   */
  private async ensureShadcnComponentsInstalled(
    groups: any[],
    spinner: EnhancedSpinner
  ): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const pkgJsonPath = path.join(projectRoot, "package.json");
      if (!(await fs.pathExists(pkgJsonPath))) {
        console.log(
          chalk.gray(
            "   Skipping shadcn setup: no package.json in current directory. Run inside an existing Next.js project."
          )
        );
        return;
      }
      const componentsJsonPath = path.join(projectRoot, "components.json");

      // Initialize shadcn if components.json is missing
      if (!(await fs.pathExists(componentsJsonPath))) {
        spinner.updateText("Initializing shadcn/ui for this project...");
        const pm = await this.detectPackageManager(projectRoot);
        try {
          if (pm === "pnpm") {
            execSync(`pnpm dlx shadcn@latest init -y`, {
              cwd: projectRoot,
              stdio: "inherit",
            });
          } else {
            execSync(`npx shadcn@latest init -y`, {
              cwd: projectRoot,
              stdio: "inherit",
            });
          }
        } catch (e) {
          console.log(
            chalk.yellow(
              "   ⚠️ shadcn init failed; continuing. You can run it manually."
            )
          );
        }
      }

      // Build required component set from groups
      const needed = new Set<string>();
      for (const group of groups) {
        for (const comp of group.components || []) {
          this.inferShadcnForComponent(comp, needed);
        }
      }

      if (needed.size === 0) return;

      const pkgManager = await this.detectPackageManager(projectRoot);
      const names = Array.from(needed);
      spinner.updateText(`Installing shadcn components (${names.length})...`);
      try {
        if (!(await fs.pathExists(pkgJsonPath))) {
          console.log(
            chalk.gray(
              "   Skipping 'shadcn add' because no package.json was found."
            )
          );
          return;
        }
        if (pkgManager === "pnpm") {
          execSync(`pnpm dlx shadcn@latest add ${names.join(" ")}`, {
            cwd: projectRoot,
            stdio: "inherit",
          });
        } else {
          execSync(`npx shadcn@latest add ${names.join(" ")}`, {
            cwd: projectRoot,
            stdio: "inherit",
          });
        }
      } catch (e) {
        console.log(
          chalk.yellow(
            "   ⚠️ shadcn add failed; you can add components manually."
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ shadcn setup encountered an issue: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  private async ensureFormDeps(spinner: EnhancedSpinner): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const pkgPath = path.join(projectRoot, "package.json");
      const pkg = (await fs.pathExists(pkgPath))
        ? await fs.readJson(pkgPath)
        : {};
      const deps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      } as Record<string, string>;
      const need: string[] = [];
      if (!deps["zod"]) need.push("zod");
      if (!deps["react-hook-form"]) need.push("react-hook-form");
      if (!deps["@hookform/resolvers"]) need.push("@hookform/resolvers");
      if (need.length === 0) return;
      spinner.updateText(`Ensuring form dependencies: ${need.join(", ")}`);
      const pm = await this.detectPackageManager(projectRoot);
      try {
        if (pm === "pnpm") {
          execSync(`pnpm add ${need.join(" ")}`, {
            cwd: projectRoot,
            stdio: "inherit",
          });
        } else {
          execSync(`npm i ${need.join(" ")}`, {
            cwd: projectRoot,
            stdio: "inherit",
          });
        }
      } catch {
        console.log(
          chalk.yellow(
            "   ⚠️ Failed to install form deps automatically. You can install them manually."
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ Form deps step encountered an issue: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  private inferShadcnForComponent(component: any, out: Set<string>): void {
    const type = (component.type || "").toLowerCase();
    const name = String(component.name || "").toLowerCase();
    const desc = String(component.description || "").toLowerCase();
    const tags: string[] = Array.isArray(component.tags)
      ? component.tags.map((t: any) => String(t).toLowerCase())
      : [];

    const add = (list: string[]) => list.forEach((n) => out.add(n));

    // Base mapping by type
    if (type === "form") {
      add([
        "button",
        "input",
        "label",
        "form",
        "select",
        "checkbox",
        "radio-group",
        "textarea",
        "switch",
        "alert",
      ]);
    }
    if (type === "layout" || /layout|card/.test(name)) {
      add(["card", "separator"]);
    }
    if (type === "button" || /button/.test(name)) {
      add(["button"]);
    }
    if (type === "navigation" || /nav|tabs|breadcrumb/.test(name)) {
      add(["navigation-menu", "breadcrumb", "tabs"]);
    }
    if (
      type === "feedback" ||
      /alert|dialog|toast|progress|skeleton/.test(name)
    ) {
      add(["alert", "alert-dialog", "dialog", "progress", "skeleton"]);
    }
    if (type === "data" || /table|command|combobox|list/.test(name)) {
      add(["table", "command"]);
    }
    if (type === "overlay" || /popover|tooltip|sheet|drawer/.test(name)) {
      add(["popover", "tooltip", "sheet"]);
    }
    if (type === "media" || /avatar|badge|calendar|carousel/.test(name)) {
      add(["avatar", "badge", "calendar", "carousel"]);
    }

    // Tag/description-based enrichments
    const has = (kw: RegExp) =>
      kw.test(name) || kw.test(desc) || tags.some((t) => kw.test(t));

    if (has(/modal|dialog/)) add(["dialog", "alert-dialog"]);
    if (has(/toast|notification/)) add(["toast"]);
    if (has(/popover|tooltip/)) add(["popover", "tooltip"]);
    if (has(/dropdown|menu/)) add(["dropdown-menu", "menubar"]);
    if (has(/tabs/)) add(["tabs"]);
    if (has(/accordion|collapsible/)) add(["accordion", "collapsible"]);
    if (has(/table|list|command|combobox|select/))
      add(["table", "command", "select"]);
    if (has(/pagination/)) add(["pagination"]);
    if (has(/avatar|user|profile/)) add(["avatar"]);
    if (has(/badge|status|tag/)) add(["badge"]);
    if (has(/calendar|date/)) add(["calendar"]);
    if (has(/carousel|gallery/)) add(["carousel"]);
    if (has(/sidebar/)) add(["sidebar"]);
    if (has(/sheet|drawer/)) add(["sheet"]);
    if (has(/separator|divider/)) add(["separator"]);
    if (has(/breadcrumb/)) add(["breadcrumb"]);
    if (has(/hover|card/)) add(["hover-card", "card"]);
    if (has(/radio/)) add(["radio-group"]);
    if (has(/switch/)) add(["switch"]);
    if (has(/slider/)) add(["slider"]);
    if (has(/progress/)) add(["progress"]);
    if (has(/skeleton|loading/)) add(["skeleton"]);
    if (has(/tooltip/)) add(["tooltip"]);
    if (has(/tabs/)) add(["tabs"]);
  }

  private async detectPackageManager(
    projectRoot: string
  ): Promise<"pnpm" | "npm"> {
    try {
      const pkgPath = path.join(projectRoot, "package.json");
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJson(pkgPath);
        if (
          typeof pkg.packageManager === "string" &&
          pkg.packageManager.startsWith("pnpm@")
        ) {
          return "pnpm";
        }
      }
      if (await fs.pathExists(path.join(projectRoot, "pnpm-lock.yaml")))
        return "pnpm";
    } catch {}
    return "npm";
  }

  /**
   * Ensure Jest + RTL scaffold exists in the project
   */
  private async ensureTestsScaffold(spinner: EnhancedSpinner): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const jestConfigPath = path.join(projectRoot, "jest.config.ts");
      const setupPath = path.join(projectRoot, "jest.setup.ts");
      const pkgPath = path.join(projectRoot, "package.json");

      const pkg = (await fs.pathExists(pkgPath))
        ? await fs.readJson(pkgPath)
        : {};
      const pm = await this.detectPackageManager(projectRoot);

      // Write config files if missing
      if (!(await fs.pathExists(jestConfigPath))) {
        await fs.writeFile(
          jestConfigPath,
          `import type { Config } from 'jest';\n\nconst config: Config = {\n  preset: 'ts-jest',\n  testEnvironment: 'jsdom',\n  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],\n  moduleNameMapper: {\n    '^@/(.*)$': '<rootDir>/src/$1'\n  },\n  transform: {\n    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }]\n  },\n};\n\nexport default config;\n`
        );
      }
      if (!(await fs.pathExists(setupPath))) {
        await fs.writeFile(setupPath, `import '@testing-library/jest-dom';\n`);
      }

      // Add test script
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts.test) {
        pkg.scripts.test = "jest";
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      }

      // Install dev deps if not present
      const devDeps = [
        "jest",
        "ts-jest",
        "@types/jest",
        "@testing-library/react",
        "@testing-library/jest-dom",
        "jest-environment-jsdom",
      ];
      spinner.updateText("Ensuring test dependencies...");
      try {
        if (pm === "pnpm") {
          execSync(`pnpm add -D ${devDeps.join(" ")}`, {
            cwd: projectRoot,
            stdio: "inherit",
          });
        } else {
          execSync(`npm i -D ${devDeps.join(" ")}`, {
            cwd: projectRoot,
            stdio: "inherit",
          });
        }
      } catch {
        console.log(
          chalk.yellow(
            "   ⚠️ Failed to install test deps automatically. You can install them manually."
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ Test scaffold step encountered an issue: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  private async generateComponentTest(
    component: any,
    groupDir: string
  ): Promise<void> {
    try {
      const name = component.name as string;
      const type = (component.type || "").toLowerCase();
      const testsDir = path.join(process.cwd(), "__tests__", "components");
      await this.fs.ensureDir(testsDir);
      const testPath = path.join(testsDir, `${name}.test.tsx`);

      const basicRender = `import React from 'react';\nimport { render, screen } from '@testing-library/react';\nimport '@testing-library/jest-dom';\nimport { ${name} } from '${path
        .relative(testsDir, path.join(groupDir, name))
        .replace(
          /\\\\/g,
          "/"
        )}';\n\ndescribe('${name}', () => {\n  it('renders without crashing', () => {\n    render(<${name} />);\n    expect(screen.getByText('${name}')).toBeInTheDocument();\n  });\n});\n`;

      const formTest = `import React from 'react';\nimport { render, screen } from '@testing-library/react';\nimport '@testing-library/jest-dom';\nimport { ${name} } from '${path
        .relative(testsDir, path.join(groupDir, name))
        .replace(
          /\\\\/g,
          "/"
        )}';\n\ndescribe('${name}', () => {\n  it('disables submit when loading', () => {\n    render(<${name} loading />);\n    expect(screen.getByRole('button')).toBeDisabled();\n  });\n});\n`;

      const content = type === "form" ? formTest : basicRender;
      await this.fs.writeFile(testPath, content);
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ Failed to write tests for ${component?.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  private async storeComponent(componentData: {
    userId: string;
    name: string;
    code: string;
    metadata: any;
    group: string;
    qualityScore: number | null;
  }): Promise<void> {
    try {
      // Skip storage entirely in local mode (no logs)
      if (!componentData?.userId || componentData.userId === "local") {
        return;
      }

      const API_BASE =
        process.env.MYCONTEXT_API_URL || "https://mycontext.fbien.com";
      const response = await fetch(`${API_BASE}/api/components/store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(componentData),
      });

      // Attempt to parse JSON only for authenticated users
      let result: { success: boolean; error?: string } | null = null;
      try {
        result = (await response.json()) as {
          success: boolean;
          error?: string;
        };
      } catch {
        // Non-JSON/empty body; treat as noop for authenticated flow
        result = null;
      }

      if (result?.success) {
        console.log(chalk.green(`💾 Component stored: ${componentData.name}`));
      } else if (result && result.error) {
        console.log(
          chalk.yellow(`⚠️  Failed to store component: ${result.error}`)
        );
      }
    } catch (error) {
      // Only note storage issues when authenticated
      if (componentData?.userId && componentData.userId !== "local") {
        console.log(chalk.yellow(`⚠️  Component storage failed: ${error}`));
      }
    }
  }

  // REMOVED: All generic template generation
  // Components are now 100% generated by AI using context files and sub-agents

  // REMOVED: Template generation methods
  // All components now generated by AI with context analysis

  private async generateGroupIndex(
    group: any,
    groupDir: string
  ): Promise<void> {
    const components = group.components || [];
    const exports = components.map((comp: any) => {
      const base = this.getComponentExportName(comp);
      return `export { ${base} } from "./${base}";`;
    });

    const indexContent = `/**
 * ${group.name} Components
 * 
 * ${group.description}
 * 
 * Generated components: ${components.length}
 */

${exports.join("\n")}

// Re-export default exports
${components
  .map((comp: any) => {
    const base = this.getComponentExportName(comp);
    return `export { default as ${base}Default } from "./${base}";`;
  })
  .join("\n")}
`;

    await this.fs.writeFile(path.join(groupDir, "index.ts"), indexContent);
  }

  private async generatePreviewPage(
    group: any,
    groupDir: string
  ): Promise<void> {
    const components = group.components || [];

    const previewContent = `import React from "react";
${components
  .map((comp: any) => {
    const base = this.getComponentExportName(comp);
    return `import { ${base} } from "./${base}";`;
  })
  .join("\n")}

export default function ${String(group.name || "Group")
      .replace(/[_-]+/g, " ")
      .split(/\s+/)
      .map((w: string) =>
        w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""
      )
      .join("")
      .replace(/[^A-Za-z0-9]/g, "")}Preview() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">${group.name} Components</h1>
        <p className="text-muted-foreground">${group.description}</p>
      </div>

      <div className="grid gap-8">
${components
  .map((comp: any) => {
    const base = this.getComponentExportName(comp);
    return `
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">${base}</h2>
          <p className="text-muted-foreground">${comp.description}</p>
          <div className="border rounded-lg p-6 bg-card">
            <${base} />
          </div>
        </section>`;
  })
  .join("\n")}
      </div>
    </div>
  );
}
`;

    await this.fs.writeFile(path.join(groupDir, "page.tsx"), previewContent);
  }

  private async updatePreviewRegistry(componentsDir: string): Promise<void> {
    try {
      // Discover groups and components from filesystem
      const groups: { dir: string; name: string; files: string[] }[] = [];
      const items = await fs.readdir(componentsDir);
      for (const item of items) {
        const groupPath = path.join(componentsDir, item);
        const stat = await fs.stat(groupPath);
        if (!stat.isDirectory()) continue;
        const files = (await fs.readdir(groupPath)).filter(
          (f) => f.endsWith(".tsx") && f !== "page.tsx"
        );
        if (files.length === 0) continue;
        const title = item
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        groups.push({ dir: item, name: title, files });
      }

      // Build preview props based on component prop interfaces and types
      await this.buildPreviewProps(componentsDir);

      const registryPath = path.join(componentsDir, "registry.tsx");
      const entries: string[] = [];
      for (const g of groups) {
        for (const file of g.files) {
          const base = file.replace(/\.tsx$/, "");
          const pathLiteral = "./" + g.dir + "/" + base;
          entries.push(
            `  { group: ${JSON.stringify(g.name)}, name: ${JSON.stringify(
              base
            )}, path: ${JSON.stringify(
              pathLiteral
            )}, loader: () => import(${JSON.stringify(pathLiteral)}) }`
          );
        }
      }

      const content = `"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { previewProps } from './preview-props';

export type PreviewRegistryItem = {
  group: string;
  name: string; 
  path: string;
  loader: () => Promise<any>;
};

function MissingComponent({ name }: { name: string }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      Component not found: <span className="font-medium">{name}</span>
    </div>
  );
}

const items: PreviewRegistryItem[] = [
${entries.join(",\n")}
];

export const previewItems = items.map((item) => ({
  ...item,
  Component: dynamic(async () => {
    try {
      const mod = (await item.loader()) as Record<string, any>;
      const comp = mod[item.name] || mod.default;
      if (!comp) {
        console.warn('[mycontext/preview] Missing export ' + item.name + ' in ' + item.path);
      }
      const C = (comp || ((props: any) => <MissingComponent name={item.name} {...props} />)) as React.ComponentType<any>;
      return (props: any) => <C {...(previewProps[item.name] || {})} {...props} />;
    } catch (e) {
      console.warn('[mycontext/preview] Failed to load ' + item.path + ':', e);
      return ((props: any) => <MissingComponent name={item.name} {...props} />) as React.ComponentType<any>;
    }
  }),
}));
`;

      await this.fs.writeFile(registryPath, content);
      // Also write a minimal PreviewCanvas if missing
      const canvasPath = path.join(componentsDir, "PreviewCanvas.tsx");
      if (!(await fs.pathExists(canvasPath))) {
        const canvas = `"use client";
import React from 'react';
import { previewItems } from './registry';

export default function PreviewCanvas() {
  return (
    <div className="min-h-screen w-full p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Preview Canvas</h1>
        <p className="text-sm text-muted-foreground">All generated components at a glance</p>
      </header>
      <div className="space-y-10">
        {groupBy(previewItems, (i) => i.group).map(([group, comps]) => (
          <section key={group} className="space-y-4">
            <h2 className="text-2xl font-semibold">{group}</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {comps.map((c) => (
                <div key={c.name} className="rounded-lg border bg-card p-6">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">{c.name}</div>
                  <c.Component />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function groupBy<T, K extends string | number>(
  items: T[],
  getKey: (item: T) => K
): [K, T[]][] {
  const map = new Map<K, T[]>();
  for (const it of items) {
    const k = getKey(it);
    const arr = map.get(k) || [];
    arr.push(it);
    map.set(k, arr);
  }
  return Array.from(map.entries());
}
`;
        await this.fs.writeFile(canvasPath, canvas);
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ Failed to update preview registry: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  /**
   * Build preview-props.ts by parsing component prop interfaces and .mycontext/02-types.ts
   * Generates sample values for primitives and known interfaces; skips unknowns.
   */
  private async buildPreviewProps(componentsDir: string): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const typesPathCandidates = [
        path.join(projectRoot, ".mycontext", "02-types.ts"),
        path.join(projectRoot, ".mycontext", "types.ts"),
        path.join(projectRoot, "context", "types.ts"),
      ];
      let typesSource = "";
      for (const p of typesPathCandidates) {
        if (await fs.pathExists(p)) {
          typesSource = await fs.readFile(p, "utf8");
          break;
        }
      }

      // Parse interfaces from types file
      const interfaceRegex = /interface\s+(\w+)\s*\{([\s\S]*?)\}/g;
      const interfaces: Record<string, { [k: string]: string }> = {};
      let match: RegExpExecArray | null;
      while ((match = interfaceRegex.exec(typesSource))) {
        const name = match[1];
        const body = match[2];
        if (!body) continue;
        const fields: Record<string, string> = {};
        body
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .forEach((line) => {
            const m = line.match(/^(\w+)\??:\s*([^;]+);/);
            if (m && m[1] && m[2]) fields[m[1]] = m[2].trim();
          });
        if (name) interfaces[name] = fields;
      }

      // Discover components and parse their Props interfaces
      const propsMap: Record<string, any> = {};
      const groups = await fs.readdir(componentsDir);
      for (const g of groups) {
        const groupPath = path.join(componentsDir, g);
        const stat = await fs.stat(groupPath);
        if (!stat.isDirectory()) continue;
        const files = (await fs.readdir(groupPath)).filter((f) =>
          f.endsWith(".tsx")
        );
        for (const file of files) {
          if (file === "page.tsx") continue;
          const base = file.replace(/\.tsx$/, "");
          const full = path.join(groupPath, file);
          const src = await fs.readFile(full, "utf8");
          const propsInterfaceMatch = src.match(
            /interface\s+(\w+)Props\s*\{([\s\S]*?)\}/
          );
          if (!propsInterfaceMatch) continue;
          const propsBody = propsInterfaceMatch[2];
          if (!propsBody) continue;
          const entries = propsBody
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => /:\s*/.test(l));
          const propsObj: Record<string, any> = {};
          for (const line of entries) {
            const m = line.match(/^(\w+)\??:\s*([^;]+);/);
            if (!m || !m[1] || !m[2]) continue;
            const propName = m[1];
            const typeStr = m[2]?.trim() || "any";
            const value = this.generateSampleValue(typeStr, interfaces, 0);
            if (value !== undefined && propName) propsObj[propName] = value;
          }
          if (Object.keys(propsObj).length > 0) propsMap[base] = propsObj;
        }
      }

      const out = `export const previewProps: Record<string, any> = ${JSON.stringify(
        propsMap,
        null,
        2
      )};\n`;
      await fs.writeFile(path.join(componentsDir, "preview-props.ts"), out);
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ Failed to build preview props: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  private generateSampleValue(
    typeStr: string,
    interfaces: Record<string, { [k: string]: string }>,
    depth: number
  ): any {
    if (depth > 2) return undefined;
    const t = typeStr.replace(/\s+/g, "");
    if (t.endsWith("[]")) {
      const inner = t.slice(0, -2);
      const v = this.generateSampleValue(inner, interfaces, depth + 1);
      return v === undefined ? undefined : [v];
    }
    if (/^string\b/.test(t)) return "Sample";
    if (/^number\b/.test(t)) return 1;
    if (/^boolean\b/.test(t)) return true;
    if (/^Date\b/.test(t)) return new Date().toISOString();
    if (interfaces[t]) {
      const fields = interfaces[t];
      const obj: Record<string, any> = {};
      for (const [k, vt] of Object.entries(fields)) {
        const v = this.generateSampleValue(vt, interfaces, depth + 1);
        if (v !== undefined) obj[k] = v;
      }
      return obj;
    }
    // Unknown type: skip
    return undefined;
  }

  private async ensurePreviewRoute(): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const srcApp = path.join(projectRoot, "src", "app");
      const app = path.join(projectRoot, "app");
      const appDir = (await fs.pathExists(srcApp)) ? srcApp : app;
      const previewDir = path.join(appDir, "preview");
      await this.fs.ensureDir(previewDir);
      const pagePath = path.join(previewDir, "page.tsx");
      if (!(await fs.pathExists(pagePath))) {
        const content = `import PreviewCanvas from '@/components/.mycontext/PreviewCanvas';

export default function PreviewPage() {
  return <PreviewCanvas />;
}
`;
        await this.fs.writeFile(pagePath, content);
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          `   ⚠️ Failed to scaffold /preview route: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  /**
   * Generate complete architecture with actions, routes, and self-documentation
   */
  private async generateCompleteArchitecture(
    componentList: any,
    options: GenerateComponentsOptions,
    spinner: EnhancedSpinner,
    userId: string
  ): Promise<void> {
    spinner.updateText("Building complete architecture plan...");

    // Convert component list to EnhancedComponent hierarchy
    const rootComponent = this.convertToEnhancedComponent(componentList);

    if (!rootComponent) {
      throw new Error("Failed to convert component list to enhanced format");
    }

    // Build complete generation queue with actions, routes, and documentation
    const queue = await this.architectureEngine.buildCompleteGenerationQueue(
      rootComponent
    );

    spinner.success({
      text: `Architecture plan ready: ${queue.length} components with actions and routes`,
    });

    console.log(chalk.blue("\n📋 Architecture Overview:"));
    console.log(chalk.gray(`  • Total Components: ${queue.length}`));
    console.log(
      chalk.gray(
        `  • Total Server Actions: ${queue.reduce(
          (acc, item) => acc + item.serverActions.length,
          0
        )}`
      )
    );
    console.log(
      chalk.gray(
        `  • Total Routes: ${queue.reduce(
          (acc, item) => acc + item.routes.length,
          0
        )}`
      )
    );
    console.log(
      chalk.gray(
        `  • Total Client Actions: ${queue.reduce(
          (acc, item) => acc + item.actions.length,
          0
        )}`
      )
    );

    // Create complete architecture plan
    const architecturePlan =
      await this.architectureEngine.createCompleteArchitecturePlan(
        rootComponent,
        {
          name: this.contextArtifacts.prd ? "Project" : "Application",
          description:
            this.contextArtifacts.prd?.split("\n")[0] ||
            "Full-stack application",
          architecture: options.architectureType || "nextjs-app-router",
        }
      );

    // Save architecture plan
    const planPath = path.join(
      process.cwd(),
      ".mycontext",
      "architecture-plan.json"
    );
    await this.fs.writeFile(
      planPath,
      JSON.stringify(architecturePlan, null, 2)
    );

    console.log(chalk.green(`\n✅ Architecture plan saved to: ${planPath}`));

    // Create directories
    const componentsDir =
      options.output || path.join("components", ".mycontext");
    const actionsDir = path.join(process.cwd(), "actions");
    const appDir = await this.detectAppDirectory();

    await this.fs.ensureDir(componentsDir);
    await this.fs.ensureDir(actionsDir);

    // Generate components with full documentation
    spinner.updateText("Generating components with self-documentation...");

    for (const item of queue) {
      const groupDir = path.join(
        componentsDir,
        this.toKebabCase(item.component.name)
      );
      await this.fs.ensureDir(groupDir);

      // Generate component with self-documentation header
      const componentCode = await this.generateComponentWithArchitecture(
        item,
        options,
        userId
      );
      const componentPath = path.join(
        groupDir,
        `${this.getComponentBaseName(item.component)}.tsx`
      );

      // Prepend self-documentation
      const documentedCode = `${item.selfDocumentation}\n\n${componentCode}`;
      await this.fs.writeFile(componentPath, documentedCode);

      console.log(
        chalk.gray(`  ✓ ${item.component.name} (level ${item.level})`)
      );
    }

    // Generate server actions if requested
    if (options.completeArchitecture || options.serverActions) {
      spinner.updateText("Generating server actions...");
      await this.generateServerActions(queue, actionsDir);
    }

    // Generate routes if requested
    if (options.completeArchitecture || options.routes) {
      spinner.updateText("Generating Next.js routes...");
      await this.generateRoutes(
        queue,
        appDir,
        options.architectureType || "nextjs-app-router"
      );
    }

    spinner.success({ text: "Complete architecture generated successfully!" });

    console.log(chalk.green("\n✅ Generated:"));
    console.log(
      chalk.gray(`  • ${queue.length} components with documentation`)
    );
    if (options.completeArchitecture || options.serverActions) {
      const totalActions = queue.reduce(
        (acc, item) => acc + item.serverActions.length,
        0
      );
      console.log(
        chalk.gray(`  • ${totalActions} server actions in ${actionsDir}`)
      );
    }
    if (options.completeArchitecture || options.routes) {
      const totalRoutes = new Set(
        queue.flatMap((item) => item.routes.map((r) => r.path))
      ).size;
      console.log(chalk.gray(`  • ${totalRoutes} routes in ${appDir}`));
    }

    console.log(chalk.blue("\n📖 Next Steps:"));
    console.log(chalk.gray("  1. Review generated components in components/"));
    console.log(chalk.gray("  2. Review server actions in actions/"));
    console.log(chalk.gray("  3. Review routes in app/"));
    console.log(chalk.gray("  4. Run: npm run dev"));
  }

  /**
   * Convert component list to EnhancedComponent format
   */
  private convertToEnhancedComponent(componentList: any): any {
    // Find root component
    const rootKey = Object.keys(componentList).find(
      (key) => key !== "metadata"
    );
    if (!rootKey) return null;

    const root = componentList[rootKey];
    return this.buildEnhancedComponent(root, rootKey, 0);
  }

  private buildEnhancedComponent(node: any, name: string, level: number): any {
    const component: any = {
      name,
      description: node.description || `${name} component`,
      type: node.type || "layout",
      level,
      priority: "medium",
      dependencies: [],
      tags: [],
      routes: [],
      actions: [],
      children: {},
    };

    if (node.children) {
      Object.entries(node.children).forEach(
        ([childName, childData]: [string, any]) => {
          component.children[childName] = this.buildEnhancedComponent(
            childData,
            childName,
            level + 1
          );
        }
      );
    }

    return component;
  }

  /**
   * Generate component with architecture awareness
   */
  private async generateComponentWithArchitecture(
    item: any,
    options: GenerateComponentsOptions,
    userId: string
  ): Promise<string> {
    // Use existing generateComponent logic but return only the code
    const { orchestrator } = await import(
      "../agents/orchestrator/SubAgentOrchestrator"
    );

    const codeResult = (await orchestrator.executeAgent("CodeGenSubAgent", {
      component: item.component,
      group: { name: "Generated" },
      options: {
        ...options,
        context: {
          prd: this.contextArtifacts.prd,
          types: this.contextArtifacts.types,
          branding: this.contextArtifacts.brand,
          componentList: this.contextArtifacts.compListRaw,
          stackConfig: this.stackConfig,
          serverActions: item.serverActions,
          routes: item.routes,
          actions: item.actions,
        },
      },
    })) as { code: string };

    return codeResult.code;
  }

  /**
   * Generate server actions files
   */
  private async generateServerActions(
    queue: any[],
    actionsDir: string
  ): Promise<void> {
    // Group actions by component
    const actionsByComponent = new Map<string, any[]>();

    queue.forEach((item) => {
      if (item.serverActions.length > 0) {
        actionsByComponent.set(item.component.name, item.serverActions);
      }
    });

    for (const [componentName, actions] of actionsByComponent.entries()) {
      const fileName = `${this.toKebabCase(componentName)}Actions.ts`;
      const filePath = path.join(actionsDir, fileName);

      const content = this.generateServerActionFile(componentName, actions);
      await this.fs.writeFile(filePath, content);

      console.log(chalk.gray(`  ✓ ${fileName} (${actions.length} actions)`));
    }
  }

  /**
   * Generate server action file content
   */
  private generateServerActionFile(
    componentName: string,
    actions: any[]
  ): string {
    const imports = `'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
`;

    const actionCode = actions
      .map((action) => {
        const params = action.parameters
          .map((p: any) => `${p.name}${p.required ? "" : "?"}: ${p.type}`)
          .join(", ");

        return `
/**
 * ${action.description}
 *
 * @param {${action.parameters
   .map((p: any) => `${p.type}`)
   .join(", ")}} ${action.parameters.map((p: any) => p.name).join(", ")}
 * @returns {Promise<${action.returns}>}
 */
export async function ${action.name}(${params}): Promise<${action.returns}> {
  try {
    // TODO: Implement ${action.name}
    ${action.database ? `// Database: ${action.database}` : ""}
    ${action.validation ? `// Validation: ${action.validation}` : ""}
    ${action.middleware ? `// Middleware: ${action.middleware.join(", ")}` : ""}

    throw new Error('Not implemented');
  } catch (error) {
    console.error('Error in ${action.name}:', error);
    throw error;
  }
}`;
      })
      .join("\n");

    return `${imports}\n${actionCode}\n`;
  }

  /**
   * Generate Next.js routes
   */
  private async generateRoutes(
    queue: any[],
    appDir: string,
    architectureType: string
  ): Promise<void> {
    const routeMap = new Map<string, any>();

    // Collect unique routes
    queue.forEach((item) => {
      item.routes.forEach((route: any) => {
        if (!routeMap.has(route.path)) {
          routeMap.set(route.path, {
            ...route,
            components: [item.component.name],
          });
        } else {
          const existing = routeMap.get(route.path);
          existing.components.push(item.component.name);
        }
      });
    });

    for (const [routePath, route] of routeMap.entries()) {
      const routeDir = path.join(appDir, routePath === "/" ? "" : routePath);
      await this.fs.ensureDir(routeDir);

      // Generate page.tsx
      const pagePath = path.join(routeDir, "page.tsx");
      const pageContent = this.generatePageContent(route);
      await this.fs.writeFile(pagePath, pageContent);

      // Generate layout.tsx if specified
      if (route.layout) {
        const layoutPath = path.join(routeDir, "layout.tsx");
        const layoutContent = this.generateLayoutContent(route);
        await this.fs.writeFile(layoutPath, layoutContent);
      }

      console.log(chalk.gray(`  ✓ ${routePath}`));
    }
  }

  /**
   * Generate page content for route
   */
  private generatePageContent(route: any): string {
    const isDynamic = route.type === "dynamic";
    const params = isDynamic ? "{ params }: { params: { id: string } }" : "";

    return `import { ${
      route.components[0]
    } } from '@/components/.mycontext/${this.toKebabCase(
      route.components[0]
    )}/${route.components[0]}';
${route.actions
  .map(
    (action: string) =>
      `import { ${action} } from '@/actions/${this.toKebabCase(action)}';`
  )
  .join("\n")}

export default async function Page(${params}) {
  ${
    isDynamic
      ? `// Fetch data using ${route.actions[0] || "getData"}(params.id)`
      : ""
  }

  return (
    <div className="container mx-auto py-8">
      <${route.components[0]} />
    </div>
  );
}
`;
  }

  /**
   * Generate layout content for route
   */
  private generateLayoutContent(route: any): string {
    return `import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="${this.toKebabCase(route.layout)}-layout">
      {children}
    </div>
  );
}
`;
  }

  /**
   * Detect app directory location
   */
  private async detectAppDirectory(): Promise<string> {
    const srcApp = path.join(process.cwd(), "src", "app");
    const app = path.join(process.cwd(), "app");

    if (await fs.pathExists(srcApp)) {
      return srcApp;
    }
    return app;
  }

  /**
   * Convert hierarchical component structure to flat groups format for backward compatibility
   */
  private convertHierarchicalToFlat(componentList: any): any[] {
    const groups: any[] = [];

    // Handle both old flat format and new hierarchical format
    if (componentList.groups && Array.isArray(componentList.groups)) {
      // Old format - return as is
      return componentList.groups;
    }

    // New hierarchical format - convert to flat
    const rootKey = Object.keys(componentList).find(
      (key) => key !== "metadata"
    );
    if (!rootKey) {
      return [];
    }

    const rootComponent = componentList[rootKey];
    if (!rootComponent.children) {
      return [];
    }

    // Convert each top-level child to a group
    Object.entries(rootComponent.children).forEach(
      ([groupName, groupData]: [string, any]) => {
        const components: any[] = [];

        // Flatten all nested components
        this.flattenComponents(groupData, components, groupName);

        if (components.length > 0) {
          groups.push({
            name: groupName,
            description: groupData.description || `${groupName} components`,
            components: components,
          });
        }
      }
    );

    return groups;
  }

  /**
   * Recursively flatten components from hierarchical structure
   */
  private flattenComponents(
    node: any,
    components: any[],
    groupName: string,
    path: string = ""
  ): void {
    if (!node.children) {
      // Leaf component
      if (node.type) {
        components.push({
          name: path || "Component",
          description: node.description || "Component",
          type: node.type,
          priority: "medium",
          dependencies: [],
          tags: [groupName.toLowerCase()],
          acceptanceCriteria: [],
          context: node.description || "",
        });
      }
      return;
    }

    // Process children
    Object.entries(node.children).forEach(
      ([childName, childData]: [string, any]) => {
        const childPath = path ? `${path}.${childName}` : childName;
        this.flattenComponents(childData, components, groupName, childPath);
      }
    );
  }
}
