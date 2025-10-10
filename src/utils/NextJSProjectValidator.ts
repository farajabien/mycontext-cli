import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import { ProjectStructureIssue } from "./ProjectStructureValidator";

export interface NextJSValidationReport {
  isValid: boolean;
  issues: NextJSIssue[];
  recommendations: string[];
  appRouterCompliant: boolean;
  shadcnCompliant: boolean;
}

export interface NextJSIssue {
  type: "error" | "warning" | "info";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  file?: string;
  fix?: string;
  autoFixable: boolean;
  category:
    | "routing"
    | "layout"
    | "components"
    | "configuration"
    | "dependencies";
}

export class NextJSProjectValidator {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Comprehensive Next.js project validation
   */
  async validateNextJSProject(): Promise<NextJSValidationReport> {
    console.log(chalk.blue("🔍 Validating Next.js project structure..."));

    const issues: NextJSIssue[] = [];

    // Run all Next.js specific validation checks
    await this.validateAppRouterStructure(issues);
    await this.validateLayoutFiles(issues);
    await this.validatePageFiles(issues);
    await this.validateComponentStructure(issues);
    await this.validateShadcnIntegration(issues);
    await this.validateNextJSConfiguration(issues);
    await this.validateDependencies(issues);

    const isValid =
      issues.filter((issue) => issue.type === "error").length === 0;
    const appRouterCompliant = this.checkAppRouterCompliance(issues);
    const shadcnCompliant = this.checkShadcnCompliance(issues);

    return {
      isValid,
      issues,
      recommendations: this.generateRecommendations(issues),
      appRouterCompliant,
      shadcnCompliant,
    };
  }

  /**
   * Validate App Router structure
   */
  private async validateAppRouterStructure(
    issues: NextJSIssue[]
  ): Promise<void> {
    console.log(chalk.blue("📁 Validating App Router structure..."));

    const appDir = path.join(this.projectRoot, "app");

    // Check if app directory exists
    if (!(await fs.pathExists(appDir))) {
      issues.push({
        type: "error",
        severity: "critical",
        message:
          "App Router directory 'app' not found. Next.js 13+ requires App Router structure.",
        category: "routing",
        autoFixable: true,
        fix: "Create app directory with root layout.tsx and page.tsx",
      });
      return;
    }

    // Check for root layout.tsx
    const rootLayoutPath = path.join(appDir, "layout.tsx");
    if (!(await fs.pathExists(rootLayoutPath))) {
      issues.push({
        type: "error",
        severity: "critical",
        message: "Root layout.tsx not found in app directory",
        file: rootLayoutPath,
        category: "layout",
        autoFixable: true,
        fix: "Create root layout.tsx file",
      });
    }

    // Check for root page.tsx
    const rootPagePath = path.join(appDir, "page.tsx");
    if (!(await fs.pathExists(rootPagePath))) {
      issues.push({
        type: "error",
        severity: "critical",
        message: "Root page.tsx not found in app directory",
        file: rootPagePath,
        category: "routing",
        autoFixable: true,
        fix: "Create root page.tsx file",
      });
    }

    // Check for pages directory (conflict with App Router)
    const pagesDir = path.join(this.projectRoot, "pages");
    if (await fs.pathExists(pagesDir)) {
      issues.push({
        type: "warning",
        severity: "high",
        message:
          "Both 'app' and 'pages' directories found. This can cause routing conflicts.",
        file: pagesDir,
        category: "routing",
        autoFixable: true,
        fix: "Remove pages directory or migrate to App Router",
      });
    }

    // Validate nested routes structure
    await this.validateNestedRoutes(appDir, issues);
  }

  /**
   * Validate nested routes structure
   */
  private async validateNestedRoutes(
    appDir: string,
    issues: NextJSIssue[]
  ): Promise<void> {
    const routeDirs = await this.findRouteDirectories(appDir);

    for (const routeDir of routeDirs) {
      const relativePath = path.relative(appDir, routeDir);

      // Check for page.tsx in route directories
      const pagePath = path.join(routeDir, "page.tsx");
      if (!(await fs.pathExists(pagePath))) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: `Route directory '${relativePath}' missing page.tsx file`,
          file: routeDir,
          category: "routing",
          autoFixable: true,
          fix: `Create page.tsx in ${relativePath} directory`,
        });
      }

      // Check for layout.tsx in route directories
      const layoutPath = path.join(routeDir, "layout.tsx");
      if (await fs.pathExists(layoutPath)) {
        // Validate layout structure
        await this.validateLayoutFile(layoutPath, issues);
      }
    }
  }

  /**
   * Validate layout files
   */
  private async validateLayoutFiles(issues: NextJSIssue[]): Promise<void> {
    console.log(chalk.blue("🎨 Validating layout files..."));

    const layoutFiles = await this.findFiles("**/layout.tsx");

    for (const layoutFile of layoutFiles) {
      await this.validateLayoutFile(layoutFile, issues);
    }
  }

  /**
   * Validate individual layout file
   */
  private async validateLayoutFile(
    layoutPath: string,
    issues: NextJSIssue[]
  ): Promise<void> {
    try {
      const content = await fs.readFile(layoutPath, "utf-8");

      // Check for proper layout structure
      if (!content.includes("children")) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "Layout file missing 'children' prop",
          file: layoutPath,
          category: "layout",
          autoFixable: true,
          fix: "Add children prop to layout component",
        });
      }

      // Check for proper export
      if (!content.includes("export default")) {
        issues.push({
          type: "error",
          severity: "high",
          message: "Layout file missing default export",
          file: layoutPath,
          category: "layout",
          autoFixable: true,
          fix: "Add default export to layout component",
        });
      }

      // Check for metadata export (recommended)
      if (!content.includes("export const metadata")) {
        issues.push({
          type: "info",
          severity: "low",
          message: "Layout file missing metadata export (recommended for SEO)",
          file: layoutPath,
          category: "layout",
          autoFixable: true,
          fix: "Add metadata export for better SEO",
        });
      }
    } catch (error) {
      issues.push({
        type: "error",
        severity: "medium",
        message: `Failed to read layout file: ${error}`,
        file: layoutPath,
        category: "layout",
        autoFixable: false,
      });
    }
  }

  /**
   * Validate page files
   */
  private async validatePageFiles(issues: NextJSIssue[]): Promise<void> {
    console.log(chalk.blue("📄 Validating page files..."));

    const pageFiles = await this.findFiles("**/page.tsx");

    for (const pageFile of pageFiles) {
      await this.validatePageFile(pageFile, issues);
    }
  }

  /**
   * Validate individual page file
   */
  private async validatePageFile(
    pagePath: string,
    issues: NextJSIssue[]
  ): Promise<void> {
    try {
      const content = await fs.readFile(pagePath, "utf-8");

      // Check for proper export
      if (!content.includes("export default")) {
        issues.push({
          type: "error",
          severity: "high",
          message: "Page file missing default export",
          file: pagePath,
          category: "routing",
          autoFixable: true,
          fix: "Add default export to page component",
        });
      }

      // Check for metadata export (recommended)
      if (!content.includes("export const metadata")) {
        issues.push({
          type: "info",
          severity: "low",
          message: "Page file missing metadata export (recommended for SEO)",
          file: pagePath,
          category: "routing",
          autoFixable: true,
          fix: "Add metadata export for better SEO",
        });
      }

      // Check for proper component structure
      if (
        !content.includes("function") &&
        !content.includes("const") &&
        !content.includes("=>")
      ) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "Page file doesn't appear to contain a React component",
          file: pagePath,
          category: "routing",
          autoFixable: false,
        });
      }
    } catch (error) {
      issues.push({
        type: "error",
        severity: "medium",
        message: `Failed to read page file: ${error}`,
        file: pagePath,
        category: "routing",
        autoFixable: false,
      });
    }
  }

  /**
   * Validate component structure
   */
  private async validateComponentStructure(
    issues: NextJSIssue[]
  ): Promise<void> {
    console.log(chalk.blue("🧩 Validating component structure..."));

    // Check for components directory
    const componentsDir = path.join(this.projectRoot, "components");
    if (!(await fs.pathExists(componentsDir))) {
      issues.push({
        type: "warning",
        severity: "medium",
        message: "Components directory not found",
        category: "components",
        autoFixable: true,
        fix: "Create components directory for reusable components",
      });
    }

    // Check for UI components directory (shadcn/ui pattern)
    const uiDir = path.join(this.projectRoot, "components", "ui");
    if (!(await fs.pathExists(uiDir))) {
      issues.push({
        type: "info",
        severity: "low",
        message:
          "UI components directory not found (recommended for shadcn/ui)",
        category: "components",
        autoFixable: true,
        fix: "Create components/ui directory for shadcn/ui components",
      });
    }

    // Validate component files
    const componentFiles = await this.findFiles("**/*.tsx");
    for (const componentFile of componentFiles) {
      if (
        !componentFile.includes("page.tsx") &&
        !componentFile.includes("layout.tsx")
      ) {
        await this.validateComponentFile(componentFile, issues);
      }
    }
  }

  /**
   * Validate individual component file
   */
  private async validateComponentFile(
    componentPath: string,
    issues: NextJSIssue[]
  ): Promise<void> {
    try {
      const content = await fs.readFile(componentPath, "utf-8");

      // Check for proper export
      if (!content.includes("export")) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "Component file missing export statement",
          file: componentPath,
          category: "components",
          autoFixable: false,
        });
      }

      // Check for TypeScript types
      if (
        !content.includes("interface") &&
        !content.includes("type") &&
        !content.includes("Props")
      ) {
        issues.push({
          type: "info",
          severity: "low",
          message: "Component file missing TypeScript prop types",
          file: componentPath,
          category: "components",
          autoFixable: true,
          fix: "Add TypeScript prop interface",
        });
      }
    } catch (error) {
      issues.push({
        type: "error",
        severity: "medium",
        message: `Failed to read component file: ${error}`,
        file: componentPath,
        category: "components",
        autoFixable: false,
      });
    }
  }

  /**
   * Validate shadcn/ui integration
   */
  private async validateShadcnIntegration(
    issues: NextJSIssue[]
  ): Promise<void> {
    console.log(chalk.blue("🎨 Validating shadcn/ui integration..."));

    // Check for components.json
    const componentsJsonPath = path.join(this.projectRoot, "components.json");
    if (!(await fs.pathExists(componentsJsonPath))) {
      issues.push({
        type: "warning",
        severity: "medium",
        message: "components.json not found (required for shadcn/ui)",
        category: "configuration",
        autoFixable: true,
        fix: "Run 'pnpm dlx shadcn@latest init' to setup shadcn/ui",
      });
    } else {
      // Validate components.json content
      await this.validateComponentsJson(componentsJsonPath, issues);
    }

    // Check for lib/utils.ts
    const utilsPath = path.join(this.projectRoot, "lib", "utils.ts");
    if (!(await fs.pathExists(utilsPath))) {
      issues.push({
        type: "warning",
        severity: "medium",
        message: "lib/utils.ts not found (required for shadcn/ui)",
        category: "configuration",
        autoFixable: true,
        fix: "Create lib/utils.ts with cn utility function",
      });
    }

    // Check for Tailwind CSS configuration
    const tailwindConfigPath = path.join(
      this.projectRoot,
      "tailwind.config.ts"
    );
    if (!(await fs.pathExists(tailwindConfigPath))) {
      issues.push({
        type: "warning",
        severity: "medium",
        message:
          "Tailwind CSS configuration not found (required for shadcn/ui)",
        category: "configuration",
        autoFixable: true,
        fix: "Create tailwind.config.ts for shadcn/ui",
      });
    }

    // Check for CSS variables
    const globalCssPath = path.join(this.projectRoot, "app", "globals.css");
    if (await fs.pathExists(globalCssPath)) {
      await this.validateGlobalCSS(globalCssPath, issues);
    }
  }

  /**
   * Validate components.json
   */
  private async validateComponentsJson(
    componentsJsonPath: string,
    issues: NextJSIssue[]
  ): Promise<void> {
    try {
      const content = await fs.readJson(componentsJsonPath);

      // Check required fields
      if (!content.style) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "components.json missing 'style' field",
          file: componentsJsonPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add style field to components.json",
        });
      }

      if (!content.rsc) {
        issues.push({
          type: "warning",
          severity: "medium",
          message:
            "components.json missing 'rsc' field (React Server Components)",
          file: componentsJsonPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add rsc: true to components.json",
        });
      }

      if (!content.tsx) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "components.json missing 'tsx' field",
          file: componentsJsonPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add tsx: true to components.json",
        });
      }
    } catch (error) {
      issues.push({
        type: "error",
        severity: "medium",
        message: `Failed to read components.json: ${error}`,
        file: componentsJsonPath,
        category: "configuration",
        autoFixable: false,
      });
    }
  }

  /**
   * Validate global CSS
   */
  private async validateGlobalCSS(
    globalCssPath: string,
    issues: NextJSIssue[]
  ): Promise<void> {
    try {
      const content = await fs.readFile(globalCssPath, "utf-8");

      // Check for CSS variables
      if (
        !content.includes("--background") ||
        !content.includes("--foreground")
      ) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "Global CSS missing shadcn/ui CSS variables",
          file: globalCssPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add shadcn/ui CSS variables to globals.css",
        });
      }

      // Check for Tailwind directives
      if (
        !content.includes("@tailwind base") ||
        !content.includes("@tailwind components")
      ) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "Global CSS missing Tailwind directives",
          file: globalCssPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add Tailwind directives to globals.css",
        });
      }
    } catch (error) {
      issues.push({
        type: "error",
        severity: "medium",
        message: `Failed to read global CSS: ${error}`,
        file: globalCssPath,
        category: "configuration",
        autoFixable: false,
      });
    }
  }

  /**
   * Validate Next.js configuration
   */
  private async validateNextJSConfiguration(
    issues: NextJSIssue[]
  ): Promise<void> {
    console.log(chalk.blue("⚙️ Validating Next.js configuration..."));

    const nextConfigPath = path.join(this.projectRoot, "next.config.ts");
    if (await fs.pathExists(nextConfigPath)) {
      await this.validateNextConfig(nextConfigPath, issues);
    }

    // Check for TypeScript configuration
    const tsConfigPath = path.join(this.projectRoot, "tsconfig.json");
    if (await fs.pathExists(tsConfigPath)) {
      await this.validateTsConfig(tsConfigPath, issues);
    }
  }

  /**
   * Validate Next.js config
   */
  private async validateNextConfig(
    nextConfigPath: string,
    issues: NextJSIssue[]
  ): Promise<void> {
    try {
      const content = await fs.readFile(nextConfigPath, "utf-8");

      // Check for proper TypeScript configuration
      if (!content.includes("NextConfig")) {
        issues.push({
          type: "warning",
          severity: "low",
          message: "Next.js config missing TypeScript types",
          file: nextConfigPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add NextConfig type import",
        });
      }

      // Check for experimental features
      if (!content.includes("experimental")) {
        issues.push({
          type: "info",
          severity: "low",
          message: "Next.js config missing experimental features (turbo, etc.)",
          file: nextConfigPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add experimental features for better performance",
        });
      }
    } catch (error) {
      issues.push({
        type: "error",
        severity: "medium",
        message: `Failed to read Next.js config: ${error}`,
        file: nextConfigPath,
        category: "configuration",
        autoFixable: false,
      });
    }
  }

  /**
   * Validate TypeScript configuration
   */
  private async validateTsConfig(
    tsConfigPath: string,
    issues: NextJSIssue[]
  ): Promise<void> {
    try {
      const content = await fs.readJson(tsConfigPath);

      // Check for proper Next.js TypeScript configuration
      if (
        !content.compilerOptions?.plugins?.some(
          (plugin: any) => plugin.name === "next"
        )
      ) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "TypeScript config missing Next.js plugin",
          file: tsConfigPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add Next.js plugin to TypeScript config",
        });
      }

      // Check for path mapping
      if (!content.compilerOptions?.paths?.["@/*"]) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "TypeScript config missing path mapping for @/*",
          file: tsConfigPath,
          category: "configuration",
          autoFixable: true,
          fix: "Add @/* path mapping to TypeScript config",
        });
      }
    } catch (error) {
      issues.push({
        type: "error",
        severity: "medium",
        message: `Failed to read TypeScript config: ${error}`,
        file: tsConfigPath,
        category: "configuration",
        autoFixable: false,
      });
    }
  }

  /**
   * Validate dependencies
   */
  private async validateDependencies(issues: NextJSIssue[]): Promise<void> {
    console.log(chalk.blue("📦 Validating dependencies..."));

    const packageJsonPath = path.join(this.projectRoot, "package.json");
    if (!(await fs.pathExists(packageJsonPath))) {
      return;
    }

    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for Next.js
      if (!dependencies.next) {
        issues.push({
          type: "error",
          severity: "critical",
          message: "Next.js not found in dependencies",
          category: "dependencies",
          autoFixable: true,
          fix: "Install Next.js: pnpm add next",
        });
      }

      // Check for React
      if (!dependencies.react || !dependencies["react-dom"]) {
        issues.push({
          type: "error",
          severity: "critical",
          message: "React dependencies missing",
          category: "dependencies",
          autoFixable: true,
          fix: "Install React: pnpm add react react-dom",
        });
      }

      // Check for TypeScript
      if (!dependencies.typescript) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: "TypeScript not found in devDependencies",
          category: "dependencies",
          autoFixable: true,
          fix: "Install TypeScript: pnpm add -D typescript @types/react @types/node",
        });
      }

      // Check for Tailwind CSS (if shadcn/ui is expected)
      if (await fs.pathExists(path.join(this.projectRoot, "components.json"))) {
        if (!dependencies.tailwindcss) {
          issues.push({
            type: "warning",
            severity: "medium",
            message: "Tailwind CSS not found (required for shadcn/ui)",
            category: "dependencies",
            autoFixable: true,
            fix: "Install Tailwind CSS: pnpm add -D tailwindcss autoprefixer postcss",
          });
        }
      }
    } catch (error) {
      issues.push({
        type: "error",
        severity: "medium",
        message: `Failed to read package.json: ${error}`,
        file: packageJsonPath,
        category: "dependencies",
        autoFixable: false,
      });
    }
  }

  /**
   * Check App Router compliance
   */
  private checkAppRouterCompliance(issues: NextJSIssue[]): boolean {
    const criticalIssues = issues.filter(
      (issue) => issue.category === "routing" && issue.severity === "critical"
    );
    return criticalIssues.length === 0;
  }

  /**
   * Check shadcn/ui compliance
   */
  private checkShadcnCompliance(issues: NextJSIssue[]): boolean {
    const shadcnIssues = issues.filter(
      (issue) =>
        issue.message.includes("shadcn") ||
        issue.message.includes("components.json") ||
        issue.message.includes("Tailwind")
    );
    return shadcnIssues.length === 0;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(issues: NextJSIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(
      (issue) => issue.severity === "critical"
    );
    if (criticalIssues.length > 0) {
      recommendations.push(
        "Address critical issues immediately to ensure proper Next.js functionality"
      );
    }

    const routingIssues = issues.filter(
      (issue) => issue.category === "routing"
    );
    if (routingIssues.length > 0) {
      recommendations.push(
        "Review App Router structure and ensure proper page.tsx and layout.tsx files"
      );
    }

    const shadcnIssues = issues.filter((issue) =>
      issue.message.includes("shadcn")
    );
    if (shadcnIssues.length > 0) {
      recommendations.push(
        "Run 'pnpm dlx shadcn@latest init' to properly setup shadcn/ui"
      );
    }

    const configIssues = issues.filter(
      (issue) => issue.category === "configuration"
    );
    if (configIssues.length > 0) {
      recommendations.push(
        "Update configuration files to follow Next.js 13+ best practices"
      );
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private async findFiles(pattern: string): Promise<string[]> {
    try {
      const globModule = await import("glob");
      const { glob } = globModule;
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: ["**/node_modules/**"],
      });
      return matches;
    } catch (error) {
      console.warn(
        "Glob import failed in NextJSProjectValidator, returning empty array:",
        error
      );
      return [];
    }
  }

  private async findRouteDirectories(appDir: string): Promise<string[]> {
    const routeDirs: string[] = [];

    const findDirs = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          routeDirs.push(fullPath);
          await findDirs(fullPath);
        }
      }
    };

    await findDirs(appDir);
    return routeDirs;
  }
}
