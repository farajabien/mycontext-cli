/**
 * Assemble Features Command
 *
 * Combines generated components into complete working features
 * with actions, hooks, routes, and role-based permissions.
 */

import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";
import {
  FeatureAssemblyAgent,
  FeatureAssemblyContext,
} from "../agents/implementations/FeatureAssemblyAgent";
import {
  RoleBasedGenerator,
  RoleBasedGenerationContext,
} from "../agents/implementations/RoleBasedGenerator";
import { FeatureBundle, FeatureAssemblyOptions } from "../types/feature-bundle";
import { Role, RoleHierarchy } from "../types/role-permissions";
import { AdminStarterBundle } from "../types/feature-bundle";

export interface AssembleFeaturesOptions {
  fromComponents?: boolean;
  useStarter?: boolean;
  role?: Role;
  feature?: string;
  output?: string;
  template?: string;
  includeTests?: boolean;
  includeDocs?: boolean;
  verbose?: boolean;
}

export class AssembleFeaturesCommand {
  private command: Command;

  constructor() {
    this.command = new Command("assemble-features");
    this.setupCommand();
  }

  private setupCommand() {
    this.command
      .description("Assemble components into complete working features")
      .option("--from-components", "Assemble from generated components")
      .option("--use-starter", "Use admin starter template")
      .option(
        "--role <role>",
        "Generate for specific role (admin/user/guest)",
        "admin"
      )
      .option("--feature <name>", "Generate specific feature")
      .option("--output <path>", "Output directory for features", "./features")
      .option("--template <name>", "Use specific feature template")
      .option("--include-tests", "Include test files")
      .option("--include-docs", "Include documentation")
      .option("--verbose", "Verbose output")
      .action(async (options: AssembleFeaturesOptions) => {
        await this.execute(options);
      });
  }

  async execute(options: AssembleFeaturesOptions): Promise<void> {
    console.log(chalk.cyan("🔧 Feature Assembly starting..."));

    try {
      const projectPath = process.cwd();
      const outputPath = path.resolve(options.output || "./features");

      // Ensure output directory exists
      await fs.mkdir(outputPath, { recursive: true });

      if (options.useStarter) {
        await this.assembleFromStarter(projectPath, outputPath, options);
      } else if (options.fromComponents) {
        await this.assembleFromComponents(projectPath, outputPath, options);
      } else {
        // Auto-detect approach
        const hasComponents = await this.hasGeneratedComponents(projectPath);
        const hasStarter = await this.hasAdminStarter(projectPath);

        if (hasStarter) {
          console.log(chalk.blue("  📦 Using admin starter template"));
          await this.assembleFromStarter(projectPath, outputPath, options);
        } else if (hasComponents) {
          console.log(chalk.blue("  🧩 Using generated components"));
          await this.assembleFromComponents(projectPath, outputPath, options);
        } else {
          throw new Error(
            'No components or starter found. Run "mycontext generate-components" first or use --use-starter'
          );
        }
      }

      console.log(chalk.green("✅ Feature assembly completed successfully!"));
      this.showNextSteps(outputPath, options);
    } catch (error) {
      console.log(chalk.red(`❌ Feature assembly failed: ${error}`));
      process.exit(1);
    }
  }

  private async assembleFromStarter(
    projectPath: string,
    outputPath: string,
    options: AssembleFeaturesOptions
  ): Promise<void> {
    console.log(chalk.gray("  📦 Loading admin starter template..."));

    // Load admin starter bundle
    const starterBundle = await this.loadAdminStarterBundle();

    // Extract features from starter
    const adminFeatures = await this.extractFeaturesFromStarter(
      starterBundle,
      projectPath
    );

    // Generate role-based features
    const roleHierarchy = RoleBasedGenerator.createDefaultRoleHierarchy();
    const targetRoles = this.getTargetRoles(options.role);

    const roleGenerator = new RoleBasedGenerator(projectPath);
    const roleContext: RoleBasedGenerationContext = {
      projectPath,
      adminFeatures,
      targetRoles,
      roleHierarchy,
      outputPath,
    };

    const roleResult = await roleGenerator.run(roleContext);

    if (!roleResult.success) {
      throw new Error(
        `Role-based generation failed: ${roleResult.errors.join(", ")}`
      );
    }

    // Save feature bundles
    await this.saveFeatureBundles(roleResult.roleFeatures, outputPath);

    console.log(
      chalk.green(
        `  ✓ Generated features for ${roleResult.metadata.totalRoles} roles`
      )
    );
    console.log(
      chalk.green(`  ✓ Total features: ${roleResult.metadata.totalFeatures}`)
    );
  }

  private async assembleFromComponents(
    projectPath: string,
    outputPath: string,
    options: AssembleFeaturesOptions
  ): Promise<void> {
    console.log(chalk.gray("  🧩 Loading generated components..."));

    // Load components and context files
    const components = await this.loadGeneratedComponents(projectPath);
    const contextFiles = await this.loadContextFiles(projectPath);
    const designManifest = await this.loadDesignManifest(projectPath);

    // Load feature templates
    const featureTemplates = await this.loadFeatureTemplates();

    // Generate features
    const assemblyAgent = new FeatureAssemblyAgent(projectPath);
    const assemblyContext: FeatureAssemblyContext = {
      projectPath,
      components,
      contextFiles,
      designManifest,
      targetRole: options.role || "admin",
      featureTemplates,
      outputPath,
    };

    const result = await assemblyAgent.run(assemblyContext);

    if (!result.success) {
      throw new Error(`Feature assembly failed: ${result.errors.join(", ")}`);
    }

    console.log(
      chalk.green(`  ✓ Generated ${result.metadata.totalFeatures} features`)
    );
    console.log(
      chalk.green(`  ✓ Generated ${result.metadata.totalComponents} components`)
    );
    console.log(
      chalk.green(`  ✓ Generated ${result.metadata.totalActions} actions`)
    );
    console.log(
      chalk.green(`  ✓ Generated ${result.metadata.totalHooks} hooks`)
    );
    console.log(
      chalk.green(`  ✓ Generated ${result.metadata.totalRoutes} routes`)
    );
  }

  private async loadAdminStarterBundle(): Promise<AdminStarterBundle> {
    const bundlePath = path.join(
      __dirname,
      "../../templates/admin-starter-bundle.json"
    );
    const bundleContent = await fs.readFile(bundlePath, "utf-8");
    return JSON.parse(bundleContent);
  }

  private async extractFeaturesFromStarter(
    starterBundle: AdminStarterBundle,
    projectPath: string
  ): Promise<FeatureBundle[]> {
    const features: FeatureBundle[] = [];

    for (const [featureName, template] of Object.entries(
      starterBundle.features
    )) {
      const featureTemplate = template as any;
      const feature: FeatureBundle = {
        name: featureName,
        description: featureTemplate.description,
        role: "admin",
        components: featureTemplate.components.map((c: any) => c.name),
        types: featureTemplate.components.map((c: any) => c.name),
        actions: featureTemplate.actions.map((a: any) => ({
          name: a.name,
          description: a.description,
          file: `actions/${a.name}.ts`,
          function: a.name,
          parameters: a.parameters,
          returnType: a.returnType,
          permissions: a.permissions,
          validation: undefined,
        })),
        hooks: featureTemplate.hooks.map((h: any) => ({
          name: h.name,
          description: h.description,
          file: `hooks/${h.name}.ts`,
          function: h.name,
          parameters: h.parameters,
          returnType: h.returnType,
          dependencies: h.dependencies,
        })),
        routes: featureTemplate.routes.map((r: any) => ({
          path: r.path,
          method: r.method as any,
          description: r.description,
          file: `app/api${r.path}/route.ts`,
          function: r.path.replace(/\//g, "_").replace(/\[.*?\]/g, "id"),
          parameters: r.parameters,
          responseType: r.responseType,
          permissions: r.permissions,
          middleware: undefined,
        })),
        database: {
          schema: JSON.stringify(featureTemplate.database, null, 2),
          queries: featureTemplate.database.tables.map(
            (t: any) => `SELECT * FROM ${t.name}`
          ),
          mutations: featureTemplate.database.tables.map(
            (t: any) => `INSERT INTO ${t.name}`
          ),
        },
        permissions: featureTemplate.permissions.map((p: any) => ({
          id: `${featureName}-${p.role}-${p.resource}`,
          resource: p.resource as any,
          action: p.actions[0] as any,
          conditions: p.conditions,
          description: `Permission for ${p.role} on ${p.resource}`,
        })),
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: "1.0.0",
          dependencies: featureTemplate.dependencies,
        },
      };

      features.push(feature);
    }

    return features;
  }

  private async loadGeneratedComponents(
    projectPath: string
  ): Promise<string[]> {
    const componentsDir = path.join(projectPath, "components");

    try {
      const files = await fs.readdir(componentsDir, { recursive: true });
      return files
        .filter((file) => typeof file === "string" && file.endsWith(".tsx"))
        .map((file) => file.replace(".tsx", ""));
    } catch {
      return [];
    }
  }

  private async loadContextFiles(projectPath: string): Promise<any> {
    const contextDir = path.join(projectPath, ".mycontext");
    const contextFiles: any = {};

    try {
      const files = ["prd.md", "types.ts", "brand.md", "component-list.json"];

      for (const file of files) {
        const filePath = path.join(contextDir, file);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          contextFiles[file.replace(/\.(md|ts|json)$/, "")] = content;
        } catch {
          // File doesn't exist, skip
        }
      }
    } catch {
      // Context directory doesn't exist
    }

    return contextFiles;
  }

  private async loadDesignManifest(projectPath: string): Promise<any> {
    const manifestPath = path.join(
      projectPath,
      ".mycontext",
      "design-manifest.json"
    );

    try {
      const content = await fs.readFile(manifestPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async loadFeatureTemplates(): Promise<any[]> {
    // Load feature templates from templates directory
    const templatesDir = path.join(
      __dirname,
      "../../templates/feature-templates"
    );

    try {
      const files = await fs.readdir(templatesDir);
      const templates = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await fs.readFile(
            path.join(templatesDir, file),
            "utf-8"
          );
          templates.push(JSON.parse(content));
        }
      }

      return templates;
    } catch {
      return [];
    }
  }

  private getTargetRoles(role?: Role): Role[] {
    if (role) {
      return [role];
    }

    // Default to all roles
    return ["admin", "user", "guest"];
  }

  private async saveFeatureBundles(
    roleFeatures: Map<Role, FeatureBundle[]>,
    outputPath: string
  ): Promise<void> {
    const bundlesDir = path.join(outputPath, ".mycontext", "feature-bundles");
    await fs.mkdir(bundlesDir, { recursive: true });

    for (const [role, features] of roleFeatures) {
      const roleDir = path.join(bundlesDir, role);
      await fs.mkdir(roleDir, { recursive: true });

      for (const feature of features) {
        const featureFile = path.join(roleDir, `${feature.name}.json`);
        await fs.writeFile(featureFile, JSON.stringify(feature, null, 2));
      }

      // Save role summary
      const summary = {
        role,
        features: features.map((f) => ({
          name: f.name,
          description: f.description,
          components: f.components.length,
          actions: f.actions.length,
          hooks: f.hooks.length,
          routes: f.routes.length,
        })),
        metadata: {
          totalFeatures: features.length,
          totalComponents: features.reduce(
            (sum, f) => sum + f.components.length,
            0
          ),
          totalActions: features.reduce((sum, f) => sum + f.actions.length, 0),
          totalHooks: features.reduce((sum, f) => sum + f.hooks.length, 0),
          totalRoutes: features.reduce((sum, f) => sum + f.routes.length, 0),
          generatedAt: new Date().toISOString(),
        },
      };

      const summaryFile = path.join(roleDir, "summary.json");
      await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
    }
  }

  private async hasGeneratedComponents(projectPath: string): Promise<boolean> {
    const componentsDir = path.join(projectPath, "components");
    try {
      const files = await fs.readdir(componentsDir);
      return files.some((file) => file.endsWith(".tsx"));
    } catch {
      return false;
    }
  }

  private async hasAdminStarter(projectPath: string): Promise<boolean> {
    const starterPath = path.join(
      projectPath,
      ".mycontext",
      "admin-starter.json"
    );
    try {
      await fs.access(starterPath);
      return true;
    } catch {
      return false;
    }
  }

  private showNextSteps(
    outputPath: string,
    options: AssembleFeaturesOptions
  ): void {
    console.log(chalk.blue("\n📋 Next Steps:"));
    console.log(chalk.cyan("  1. Review generated features:"));
    console.log(chalk.white(`     cd ${outputPath}`));
    console.log(chalk.cyan("  2. Install dependencies:"));
    console.log(chalk.white("     npm install"));
    console.log(chalk.cyan("  3. Set up database:"));
    console.log(chalk.white("     mycontext setup-database"));
    console.log(chalk.cyan("  4. Start development:"));
    console.log(chalk.white("     npm run dev"));

    if (options.includeTests) {
      console.log(chalk.cyan("  5. Run tests:"));
      console.log(chalk.white("     npm test"));
    }

    if (options.includeDocs) {
      console.log(chalk.cyan("  6. Generate documentation:"));
      console.log(chalk.white("     mycontext docs generate"));
    }

    console.log(chalk.gray("\n  Additional:"));
    console.log(
      chalk.gray("  • Review feature bundles in .mycontext/feature-bundles/")
    );
    console.log(chalk.gray("  • Customize features for your specific needs"));
    console.log(chalk.gray("  • Deploy with: mycontext deploy"));
  }

  getCommand(): Command {
    return this.command;
  }
}
