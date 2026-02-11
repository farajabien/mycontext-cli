import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { ProjectStructureValidator } from "./ProjectStructureValidator";

export interface ProjectInitializationOptions {
  projectName: string;
  projectPath: string;
  framework: string;
  withShadcn: boolean;
  scaffoldNext: boolean;
  skipShadcn: boolean;
  force: boolean;
}

export interface InitializationResult {
  success: boolean;
  warnings: string[];
  errors: string[];
  projectPath: string;
  structureValid: boolean;
}

export class ProjectInitializationSafeguards {
  private validator: ProjectStructureValidator;

  constructor() {
    this.validator = new ProjectStructureValidator();
  }

  /**
   * Comprehensive project initialization with safeguards
   */
  async initializeProject(
    options: ProjectInitializationOptions
  ): Promise<InitializationResult> {
    const result: InitializationResult = {
      success: false,
      warnings: [],
      errors: [],
      projectPath: options.projectPath,
      structureValid: false,
    };

    console.log(chalk.blue("🛡️  Initializing project with safeguards..."));
    console.log(chalk.blue("==========================================\n"));

    try {
      // Step 1: Validate target location
      await this.validateTargetLocation(options.projectPath, result);

      // Step 2: Check for existing project conflicts
      await this.checkExistingProjectConflicts(options.projectPath, result);

      // Step 3: Create project structure safely
      await this.createProjectStructure(options, result);

      // Step 4: Initialize package.json with safeguards
      await this.initializePackageJson(options, result);

      // Step 5: Set up framework-specific configuration
      await this.setupFrameworkConfiguration(options, result);

      // Step 6: Initialize MyContext configuration
      await this.initializeMyContextConfig(options, result);

      // Step 7: Final validation
      await this.performFinalValidation(options.projectPath, result);

      if (result.errors.length === 0) {
        result.success = true;
        console.log(
          chalk.green("\n✅ Project initialization completed successfully!")
        );
      } else {
        console.log(
          chalk.red("\n❌ Project initialization completed with errors")
        );
      }

      return result;
    } catch (error) {
      result.errors.push(`Initialization failed: ${error}`);
      console.log(chalk.red(`❌ Project initialization failed: ${error}`));
      return result;
    }
  }

  /**
   * Validate target location for project creation
   */
  private async validateTargetLocation(
    projectPath: string,
    result: InitializationResult
  ): Promise<void> {
    console.log(chalk.blue("📍 Validating target location..."));

    // Check if path contains spaces
    if (projectPath.includes(" ")) {
      result.warnings.push(
        "Project path contains spaces, which may cause issues with some tools"
      );
    }

    // Check path length
    if (projectPath.length > 200) {
      result.warnings.push(
        "Project path is very long, consider using a shorter path"
      );
    }

    // Check for invalid characters
    if (/[<>:"|?*]/.test(projectPath)) {
      result.errors.push("Project path contains invalid characters");
      return;
    }

    // Check if directory exists and is writable
    try {
      if (await fs.pathExists(projectPath)) {
        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) {
          result.errors.push("Target path exists but is not a directory");
          return;
        }
      } else {
        // Create parent directory if it doesn't exist
        const parentDir = path.dirname(projectPath);
        if (!(await fs.pathExists(parentDir))) {
          await fs.ensureDir(parentDir);
        }
      }
    } catch (error) {
      result.errors.push(`Cannot access target location: ${error}`);
      return;
    }

    console.log(chalk.green("✅ Target location validated"));
  }

  /**
   * Check for existing project conflicts
   */
  private async checkExistingProjectConflicts(
    projectPath: string,
    result: InitializationResult
  ): Promise<void> {
    console.log(chalk.blue("🔍 Checking for existing project conflicts..."));

    const conflictFiles = [
      "package.json",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "bun.lockb",
      "tsconfig.json",
      "next.config.js",
      "next.config.ts",
      ".mycontext",
    ];

    const existingFiles: string[] = [];

    for (const file of conflictFiles) {
      const filePath = path.join(projectPath, file);
      if (await fs.pathExists(filePath)) {
        existingFiles.push(file);
      }
    }

    if (existingFiles.length > 0) {
      result.warnings.push(
        `Found existing project files: ${existingFiles.join(", ")}`
      );

      // Check if this looks like a MyContext project
      if (existingFiles.includes(".mycontext")) {
        result.warnings.push(
          "This appears to be an existing MyContext project"
        );
      }

      // Check for package manager conflicts
      const lockFiles = existingFiles.filter(
        (file) => file.includes("lock") || file.includes("lockb")
      );

      if (lockFiles.length > 1) {
        result.errors.push(
          `Multiple package managers detected: ${lockFiles.join(", ")}`
        );
      }
    }

    console.log(chalk.green("✅ Conflict check completed"));
  }

  /**
   * Create project structure safely
   */
  private async createProjectStructure(
    options: ProjectInitializationOptions,
    result: InitializationResult
  ): Promise<void> {
    console.log(chalk.blue("🏗️  Creating project structure..."));

    try {
      // Ensure project directory exists
      await fs.ensureDir(options.projectPath);

      // Create essential directories
      const directories = [
        "src",
        "components",
        "lib",
        "hooks",
        "types",
        "public",
        ".mycontext",
      ];

      for (const dir of directories) {
        const dirPath = path.join(options.projectPath, dir);
        await fs.ensureDir(dirPath);
      }

      // Create .gitignore if it doesn't exist
      const gitignorePath = path.join(options.projectPath, ".gitignore");
      if (!(await fs.pathExists(gitignorePath))) {
        const gitignoreContent = this.generateGitignoreContent();
        await fs.writeFile(gitignorePath, gitignoreContent);
      }

      console.log(chalk.green("✅ Project structure created"));
    } catch (error) {
      result.errors.push(`Failed to create project structure: ${error}`);
    }
  }

  /**
   * Initialize package.json with safeguards
   */
  private async initializePackageJson(
    options: ProjectInitializationOptions,
    result: InitializationResult
  ): Promise<void> {
    console.log(chalk.blue("📦 Initializing package.json..."));

    const packageJsonPath = path.join(options.projectPath, "package.json");

    // Check if package.json already exists
    if (await fs.pathExists(packageJsonPath)) {
      result.warnings.push(
        "package.json already exists, skipping initialization"
      );
      return;
    }

    try {
      const packageJson = this.generatePackageJson(options);
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      console.log(chalk.green("✅ package.json initialized"));
    } catch (error) {
      result.errors.push(`Failed to initialize package.json: ${error}`);
    }
  }

  /**
   * Set up framework-specific configuration
   */
  private async setupFrameworkConfiguration(
    options: ProjectInitializationOptions,
    result: InitializationResult
  ): Promise<void> {
    console.log(chalk.blue("⚙️  Setting up framework configuration..."));

    try {
      if (options.framework === "nextjs") {
        await this.setupNextJSConfiguration(options.projectPath, result);
      }

      // Set up TypeScript configuration
      await this.setupTypeScriptConfiguration(options.projectPath, result);

      // Set up Tailwind CSS if requested
      if (options.withShadcn && !options.skipShadcn) {
        await this.setupTailwindConfiguration(options.projectPath, result);
      }

      console.log(chalk.green("✅ Framework configuration completed"));
    } catch (error) {
      result.errors.push(`Failed to setup framework configuration: ${error}`);
    }
  }

  /**
   * Set up Next.js configuration
   */
  private async setupNextJSConfiguration(
    projectPath: string,
    result: InitializationResult
  ): Promise<void> {
    const nextConfigPath = path.join(projectPath, "next.config.ts");

    if (await fs.pathExists(nextConfigPath)) {
      result.warnings.push("next.config.ts already exists");
      return;
    }

    const nextConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
`;

    await fs.writeFile(nextConfigPath, nextConfig);
  }

  /**
   * Set up TypeScript configuration
   */
  private async setupTypeScriptConfiguration(
    projectPath: string,
    result: InitializationResult
  ): Promise<void> {
    const tsConfigPath = path.join(projectPath, "tsconfig.json");

    if (await fs.pathExists(tsConfigPath)) {
      result.warnings.push("tsconfig.json already exists");
      return;
    }

    const tsConfig = {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "es6"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [
          {
            name: "next",
          },
        ],
        paths: {
          "@/*": ["./*"],
        },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    };

    await fs.writeJson(tsConfigPath, tsConfig, { spaces: 2 });
  }

  /**
   * Set up Tailwind CSS configuration
   */
  private async setupTailwindConfiguration(
    projectPath: string,
    result: InitializationResult
  ): Promise<void> {
    const tailwindConfigPath = path.join(projectPath, "tailwind.config.ts");

    if (await fs.pathExists(tailwindConfigPath)) {
      result.warnings.push("tailwind.config.ts already exists");
      return;
    }

    const tailwindConfig = `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};

export default config;
`;

    await fs.writeFile(tailwindConfigPath, tailwindConfig);

    // Create postcss.config.js
    const postcssConfigPath = path.join(projectPath, "postcss.config.js");
    if (!(await fs.pathExists(postcssConfigPath))) {
      const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
      await fs.writeFile(postcssConfigPath, postcssConfig);
    }
  }

  /**
   * Initialize MyContext configuration
   */
  private async initializeMyContextConfig(
    options: ProjectInitializationOptions,
    result: InitializationResult
  ): Promise<void> {
    console.log(chalk.blue("🎯 Initializing MyContext configuration..."));

    try {
      const myContextDir = path.join(options.projectPath, ".mycontext");
      await fs.ensureDir(myContextDir);

      // Create initial context files
      const contextFiles = [
        "01-prd.md",
        "02-user-stories.md",
        "03-technical-specs.md",
        "04-edge-cases.md",
      ];

      for (const file of contextFiles) {
        const filePath = path.join(myContextDir, file);
        if (!(await fs.pathExists(filePath))) {
          await fs.writeFile(
            filePath,
            `# ${file.replace(".md", "").replace("-", " ").toUpperCase()}\n\n<!-- Add your content here -->\n`
          );
        }
      }

      // Create component list
      const componentListPath = path.join(myContextDir, "component-list.json");
      if (!(await fs.pathExists(componentListPath))) {
        const componentList = {
          components: [],
          groups: [],
          metadata: {
            created: new Date().toISOString(),
            version: "1.0.0",
          },
        };
        await fs.writeJson(componentListPath, componentList, { spaces: 2 });
      }

      console.log(chalk.green("✅ MyContext configuration initialized"));
    } catch (error) {
      result.errors.push(
        `Failed to initialize MyContext configuration: ${error}`
      );
    }
  }

  /**
   * Perform final validation
   */
  private async performFinalValidation(
    projectPath: string,
    result: InitializationResult
  ): Promise<void> {
    console.log(chalk.blue("🔍 Performing final validation..."));

    try {
      // Update validator to use the new project path
      this.validator = new ProjectStructureValidator(projectPath);
      const validationReport = await this.validator.validate();

      result.structureValid = validationReport.isValid;

      if (!validationReport.isValid) {
        result.warnings.push(
          `Project structure validation found ${validationReport.issues.length} issues`
        );

        // Auto-fix if possible
        if (validationReport.autoFixable) {
          const fixResult = await this.validator.autoFix();
          if (fixResult.fixed > 0) {
            result.warnings.push(`Auto-fixed ${fixResult.fixed} issues`);
          }
        }
      }

      console.log(chalk.green("✅ Final validation completed"));
    } catch (error) {
      result.errors.push(`Final validation failed: ${error}`);
    }
  }

  /**
   * Generate package.json content
   */
  private generatePackageJson(options: ProjectInitializationOptions): any {
    const basePackageJson: any = {
      name: options.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        "type-check": "tsc --noEmit",
      },
      packageManager: "pnpm@10.11.0",
    };

    if (options.framework === "nextjs") {
      basePackageJson.dependencies = {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        next: "^14.0.0",
      };

      basePackageJson.devDependencies = {
        typescript: "^5.0.0",
        "@types/node": "^20.0.0",
        "@types/react": "^18.0.0",
        "@types/react-dom": "^18.0.0",
        eslint: "^8.0.0",
        "eslint-config-next": "^14.0.0",
      };

      if (options.withShadcn && !options.skipShadcn) {
        basePackageJson.devDependencies = {
          ...basePackageJson.devDependencies,
          tailwindcss: "^3.0.0",
          autoprefixer: "^10.0.0",
          postcss: "^8.0.0",
        };
      }
    }

    return basePackageJson;
  }

  /**
   * Generate .gitignore content
   */
  private generateGitignoreContent(): string {
    return `# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# MyContext specific
.mycontext/.env
.mycontext/logs/
.mycontext/cache/
`;
  }

  /**
   * Check if a directory is safe to initialize a project in
   */
  async isSafeToInitialize(
    projectPath: string
  ): Promise<{ safe: boolean; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Check if directory exists and is writable
      if (await fs.pathExists(projectPath)) {
        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) {
          errors.push("Target path exists but is not a directory");
          return { safe: false, warnings, errors };
        }
      }

      // Check for existing project files
      const conflictFiles = ["package.json", "tsconfig.json", ".mycontext"];
      const existingFiles: string[] = [];

      for (const file of conflictFiles) {
        const filePath = path.join(projectPath, file);
        if (await fs.pathExists(filePath)) {
          existingFiles.push(file);
        }
      }

      if (existingFiles.length > 0) {
        warnings.push(
          `Found existing project files: ${existingFiles.join(", ")}`
        );
      }

      // Check path issues
      if (projectPath.includes(" ")) {
        warnings.push("Project path contains spaces");
      }

      if (projectPath.length > 200) {
        warnings.push("Project path is very long");
      }

      if (/[<>:"|?*]/.test(projectPath)) {
        errors.push("Project path contains invalid characters");
      }

      return {
        safe: errors.length === 0,
        warnings,
        errors,
      };
    } catch (error) {
      errors.push(`Cannot access target location: ${error}`);
      return { safe: false, warnings, errors };
    }
  }
}
