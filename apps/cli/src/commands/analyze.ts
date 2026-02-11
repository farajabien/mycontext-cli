import chalk from "chalk";
import path from "path";
import * as fs from "fs-extra";
import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";
import { HybridAIClient } from "../utils/hybridAIClient";
import { FileSystemManager } from "../utils/fileSystem";
import { EnvExampleGenerator } from "../utils/envExampleGenerator";

interface AnalyzeOptions extends CommandOptions {
  output?: string;
  generateContext?: boolean;
  includeBrand?: boolean;
  includeTypes?: boolean;
  includeComponents?: boolean;

  verbose?: boolean;
  image?: string; // New image option
}

interface ProjectAnalysis {
  projectType: string;
  framework: string;
  structure: {
    hasAppRouter: boolean;
    hasPagesRouter: boolean;
    hasComponents: boolean;
    hasLib: boolean;
    hasStyles: boolean;
  };
  components: ComponentInfo[];
  types: TypeInfo[];
  styling: StylingInfo;
  dependencies: string[];
  packageJson: any;
  inferredPurpose: string;
  recommendations: string[];
}

interface ComponentInfo {
  name: string;
  path: string;
  type: "page" | "component" | "layout" | "api" | "documentation";
  group?: string;
  props: string[];
  dependencies: string[];
  complexity: number;
  hasState: boolean;
  hasEffects: boolean;
  isClient: boolean;
  isServer: boolean;
}

interface TypeInfo {
  name: string;
  type: "interface" | "type" | "enum" | "class";
  path: string;
  properties: string[];
  isExported: boolean;
  isGeneric: boolean;
}

interface StylingInfo {
  framework:
    | "tailwind"
    | "css-modules"
    | "styled-components"
    | "emotion"
    | "vanilla";
  hasDesignSystem: boolean;
  colors: string[];
  fonts: string[];
  spacing: string[];
  breakpoints: string[];
  customProperties: string[];
}

export class AnalyzeCommand {
  private spinner = new EnhancedSpinner("Analyzing project...");
  private ai: HybridAIClient;
  private fs: FileSystemManager;

  constructor() {
    this.ai = new HybridAIClient();
    this.fs = new FileSystemManager();
  }

  async execute(target: string, options: AnalyzeOptions): Promise<void> {
    const {
      output = ".mycontext",
      generateContext = true,
      includeBrand = true,
      includeTypes = true,
      includeComponents = true,
      verbose = false,
    } = options;

    console.log(chalk.blue.bold("🔍 Analyzing Existing Project\n"));

    try {
      // Special handling for Image Analysis (Vision Mode)
      if (options.image) {
        this.spinner.start().updateText("Analyzing image with Gemini Vision...");
        await this.analyzeImage(options.image, output);
        this.spinner.succeed("Image analysis complete!");
        return;
      }

      // Step 1: Analyze project structure
      this.spinner.start().updateText("Analyzing project structure...");
      const analysis = await this.analyzeProject(target);
      this.spinner.succeed("Project structure analyzed");

      // Step 2: Display analysis results
      this.displayAnalysisResults(analysis);

      // Step 3: Generate context files if requested
      if (generateContext) {
        this.spinner.start().updateText("Generating context files...");
        await this.generateContextFiles(analysis, output, {
          includeBrand,
          includeTypes,
          includeComponents,
        });
        this.spinner.succeed("Context files generated");
      }

      console.log(chalk.green.bold("\n✅ Project analysis completed!"));
      this.printNextSteps(analysis, generateContext);
    } catch (error) {
      this.spinner.fail("Analysis failed");
      throw error;
    }
  }

  private async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    const resolvedPath = path.resolve(projectPath);

    // Check if it's a valid project
    if (!(await this.isValidProject(resolvedPath))) {
      throw new Error("Not a valid Next.js project");
    }

    // Analyze project structure
    const structure = await this.analyzeStructure(resolvedPath);

    // Analyze components
    const components = await this.analyzeComponents(resolvedPath);

    // Analyze types
    const types = await this.analyzeTypes(resolvedPath);

    // Analyze styling
    const styling = await this.analyzeStyling(resolvedPath);

    // Analyze dependencies
    const dependencies = await this.analyzeDependencies(resolvedPath);

    // Get package.json
    const packageJson = await this.getPackageJson(resolvedPath);

    // Infer project purpose using AI
    const inferredPurpose = await this.inferProjectPurpose(
      components,
      types,
      styling,
      packageJson
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      structure,
      components,
      types,
      styling
    );

    return {
      projectType: "nextjs",
      framework: "nextjs",
      structure,
      components,
      types,
      styling,
      dependencies,
      packageJson,
      inferredPurpose,
      recommendations,
    };
  }

  private async isValidProject(projectPath: string): Promise<boolean> {
    const packageJsonPath = path.join(projectPath, "package.json");
    const nextConfigPath = path.join(projectPath, "next.config.js");
    const nextConfigTsPath = path.join(projectPath, "next.config.ts");

    const hasPackageJson = await fs.pathExists(packageJsonPath);
    const hasNextConfig =
      (await fs.pathExists(nextConfigPath)) ||
      (await fs.pathExists(nextConfigTsPath));

    if (!hasPackageJson) return false;

    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    const hasNextDependency =
      packageJson.dependencies?.next || packageJson.devDependencies?.next;

    return hasNextDependency && hasNextConfig;
  }

  private async analyzeStructure(
    projectPath: string
  ): Promise<ProjectAnalysis["structure"]> {
    // Check for both src/ and root-level directories
    const srcPath = path.join(projectPath, "src");
    const hasSrcDir = await fs.pathExists(srcPath);

    // Use src/ if it exists, otherwise use root
    const basePath = hasSrcDir ? srcPath : projectPath;

    const appPath = path.join(basePath, "app");
    const pagesPath = path.join(basePath, "pages");
    const componentsPath = path.join(basePath, "components");
    const libPath = path.join(basePath, "lib");
    const stylesPath = path.join(basePath, "styles");

    // Also check for app directory in root if we're using src/
    const rootAppPath = path.join(projectPath, "app");
    const rootComponentsPath = path.join(projectPath, "components");
    const rootLibPath = path.join(projectPath, "lib");

    return {
      hasAppRouter:
        (await fs.pathExists(appPath)) ||
        (hasSrcDir && (await fs.pathExists(rootAppPath))),
      hasPagesRouter: await fs.pathExists(pagesPath),
      hasComponents:
        (await fs.pathExists(componentsPath)) ||
        (hasSrcDir && (await fs.pathExists(rootComponentsPath))),
      hasLib:
        (await fs.pathExists(libPath)) ||
        (hasSrcDir && (await fs.pathExists(rootLibPath))),
      hasStyles: await fs.pathExists(stylesPath),
    };
  }

  private async analyzeComponents(
    projectPath: string
  ): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = [];

    // Check for both src/ and root-level directories
    const srcPath = path.join(projectPath, "src");
    const hasSrcDir = await fs.pathExists(srcPath);
    const basePath = hasSrcDir ? srcPath : projectPath;

    // Analyze app directory (App Router) - can be in src/ or root
    const appPath = path.join(basePath, "app");
    if (await fs.pathExists(appPath)) {
      const appComponents = await this.scanDirectory(appPath, "page", "app");
      components.push(...appComponents);
    }

    // Also check for app directory in root if we're using src/
    if (hasSrcDir) {
      const rootAppPath = path.join(projectPath, "app");
      if (await fs.pathExists(rootAppPath)) {
        const rootAppComponents = await this.scanDirectory(
          rootAppPath,
          "page",
          "app"
        );
        components.push(...rootAppComponents);
      }
    }

    // Analyze pages directory (Pages Router)
    const pagesPath = path.join(basePath, "pages");
    if (await fs.pathExists(pagesPath)) {
      const pageComponents = await this.scanDirectory(
        pagesPath,
        "page",
        "pages"
      );
      components.push(...pageComponents);
    }

    // Analyze components directory
    const componentsPath = path.join(basePath, "components");
    if (await fs.pathExists(componentsPath)) {
      const componentFiles = await this.scanDirectory(
        componentsPath,
        "component",
        "components"
      );
      components.push(...componentFiles);
    }

    // Analyze docs directory
    const docsPath = path.join(basePath, "docs");
    if (await fs.pathExists(docsPath)) {
      const docFiles = await this.scanDocsDirectory(docsPath);
      components.push(...docFiles);
    }

    return components;
  }

  private async scanDirectory(
    dirPath: string,
    type: ComponentInfo["type"],
    group: string
  ): Promise<ComponentInfo[]> {
    const components: ComponentInfo[] = [];

    // Check if directory exists before scanning
    if (!(await fs.pathExists(dirPath))) {
      return components;
    }

    const scan = async (
      currentPath: string,
      relativePath: string = ""
    ): Promise<void> => {
      try {
        const items = await fs.readdir(currentPath);

        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const stat = await fs.stat(itemPath);

          if (stat.isDirectory()) {
            await scan(itemPath, path.join(relativePath, item));
          } else if (item.endsWith(".tsx") || item.endsWith(".jsx")) {
            const component = await this.analyzeComponentFile(
              itemPath,
              type,
              group,
              relativePath
            );
            if (component) {
              components.push(component);
            }
          }
        }
      } catch (error) {
        // Silently skip directories that can't be read
        console.warn(
          `Warning: Could not scan directory ${currentPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    await scan(dirPath);
    return components;
  }

  private async scanDocsDirectory(docsPath: string): Promise<ComponentInfo[]> {
    const docs: ComponentInfo[] = [];

    // Check if directory exists before scanning
    if (!(await fs.pathExists(docsPath))) {
      return docs;
    }

    const scan = async (
      currentPath: string,
      relativePath: string = ""
    ): Promise<void> => {
      try {
        const items = await fs.readdir(currentPath);

        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const stat = await fs.stat(itemPath);

          if (stat.isDirectory()) {
            await scan(itemPath, path.join(relativePath, item));
          } else if (item.endsWith(".md") || item.endsWith(".mdx")) {
            const doc = await this.analyzeDocFile(itemPath, relativePath);
            if (doc) {
              docs.push(doc);
            }
          }
        }
      } catch (error) {
        // Silently skip directories that can't be read
        console.warn(
          `Warning: Could not scan docs directory ${currentPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    await scan(docsPath);
    return docs;
  }

  private async analyzeDocFile(
    filePath: string,
    relativePath: string
  ): Promise<ComponentInfo | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const fileName = path.basename(filePath, path.extname(filePath));

      // Extract basic information from markdown content
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName;

      // Count sections and complexity
      const sections = (content.match(/^#{1,6}\s+/gm) || []).length;
      const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
      const links = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;

      const complexity = Math.min(
        100,
        sections * 10 + codeBlocks * 5 + links * 2
      );

      return {
        name: fileName,
        path: filePath,
        type: "documentation" as ComponentInfo["type"],
        group: "docs",
        props: [],
        dependencies: this.extractDependencies(content),
        complexity,
        hasState: false,
        hasEffects: false,
        isClient: false,
        isServer: true,
      };
    } catch (error) {
      console.warn(
        `Warning: Could not analyze doc file ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  private async analyzeComponentFile(
    filePath: string,
    type: ComponentInfo["type"],
    group: string,
    relativePath: string
  ): Promise<ComponentInfo | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const fileName = path.basename(filePath, path.extname(filePath));

      // Extract component name
      const componentName = this.extractComponentName(content, fileName);

      // Analyze props
      const props = this.extractProps(content);

      // Analyze dependencies
      const dependencies = this.extractDependencies(content);

      // Analyze complexity
      const complexity = this.calculateComplexity(content);

      // Check for hooks and state
      const hasState = this.hasStateManagement(content);
      const hasEffects = this.hasSideEffects(content);

      // Check if it's client or server component
      const isClient = content.includes("'use client'");
      const isServer = !isClient && type === "component";

      return {
        name: componentName,
        path: filePath,
        type,
        group,
        props,
        dependencies,
        complexity,
        hasState,
        hasEffects,
        isClient,
        isServer,
      };
    } catch (error) {
      console.warn(`Failed to analyze component ${filePath}:`, error);
      return null;
    }
  }

  private extractComponentName(content: string, fileName: string): string {
    // Try to extract from function declaration
    const functionMatch = content.match(/function\s+(\w+)/);
    if (functionMatch && functionMatch[1]) return functionMatch[1];

    // Try to extract from const declaration
    const constMatch = content.match(/const\s+(\w+)\s*=/);
    if (constMatch && constMatch[1]) return constMatch[1];

    // Try to extract from export default
    const exportMatch = content.match(/export\s+default\s+(\w+)/);
    if (exportMatch && exportMatch[1]) return exportMatch[1];

    // Fallback to filename
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }

  private extractProps(content: string): string[] {
    const props: string[] = [];

    // Extract from interface/type definitions
    const interfaceMatch = content.match(
      /interface\s+(\w+)Props\s*\{([^}]+)\}/
    );
    if (interfaceMatch && interfaceMatch[2]) {
      const propsContent = interfaceMatch[2];
      const propMatches = propsContent.match(/(\w+)\s*:/g);
      if (propMatches) {
        props.push(
          ...propMatches.map((match) => match.replace(":", "").trim())
        );
      }
    }

    // Extract from function parameters
    const functionMatch = content.match(/function\s+\w+\s*\(\s*\{([^}]+)\}/);
    if (functionMatch && functionMatch[1]) {
      const paramsContent = functionMatch[1];
      const paramMatches = paramsContent.match(/(\w+)/g);
      if (paramMatches) {
        props.push(...paramMatches);
      }
    }

    return [...new Set(props)];
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];

    // Extract imports
    const importMatches = content.match(
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
    );
    if (importMatches) {
      dependencies.push(
        ...importMatches
          .map((match) => {
            const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/);
            return fromMatch && fromMatch[1] ? fromMatch[1] : "";
          })
          .filter(Boolean)
      );
    }

    return dependencies;
  }

  /**
   * Analyze an image and generate context from it (Vision Mode)
   */
  private async analyzeImage(imagePath: string, outputDir: string): Promise<void> {
    try {
      // Lazy load Gemini Client to check for specific support
      const { GeminiClient } = await import("../utils/geminiClient");
      const gemini = new GeminiClient();

      if (!gemini.hasApiKey()) {
        throw new Error("Gemini API key required for image analysis. Set GEMINI_API_KEY.");
      }

      // 1. Generate PRD from Image
      this.spinner.updateText(" extract UI/UX requirements from image...");
      const prdPrompt = `
        Analyze this UI screenshot and reverse-engineer a detailed Project Requirements Document (PRD).
        Focus on:
        1. Key Features visible or implied
        2. User Roles (who would use this?)
        3. User Flows (what are the primary actions?)
        4. Information Architecture (what data is displayed?)
        
        Format as a professional Markdown PRD.
      `;
      const prdRes = await gemini.generateFromImage(prdPrompt, imagePath);
      
      // 2. Generate Brand System from Image
      this.spinner.updateText("Extracting brand identification (colors, fonts, vibes)...");
      const brandPrompt = `
        Analyze this UI screenshot and extract the Brand System.
        Focus on:
        1. Color Palette (Primary, Secondary, Backgrounds - give Hex codes)
        2. Typography (Fonts, weights, sizes)
        3. Component Styling (Radius, Shadows, Spacing)
        4. Overall "Vibe" (Modern, Corporate, Playful, etc.)
        
        Format as clear Markdown recommendations.
      `;
      const brandRes = await gemini.generateFromImage(brandPrompt, imagePath);

       // 3. Save artifacts
       const fs = new FileSystemManager();
       await fs.ensureDir(path.join(process.cwd(), outputDir));
       
       await fs.writeFile(path.join(process.cwd(), outputDir, "01-prd.md"), prdRes.content);
       await fs.writeFile(path.join(process.cwd(), outputDir, "03-branding.md"), brandRes.content);
       
       console.log(chalk.green(`\n✅ Generated .mycontext/01-prd.md from image`));
       console.log(chalk.green(`✅ Generated .mycontext/03-branding.md from image`));

       // Next steps
       console.log(chalk.blue("\n➡️  Next Step: Generate Component List"));
       console.log(chalk.gray("    mycontext generate components-list"));

    } catch (error: any) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  private calculateComplexity(content: string): number {
    let complexity = 0;

    // Count conditional statements
    complexity += (content.match(/\b(if|else|switch|case)\b/g) || []).length;

    // Count loops
    complexity += (content.match(/\b(for|while|do)\b/g) || []).length;

    // Count function calls
    complexity += (content.match(/\w+\(/g) || []).length;

    // Count JSX elements
    complexity += (content.match(/<[A-Z]\w*/g) || []).length;

    return complexity;
  }

  private hasStateManagement(content: string): boolean {
    return (
      content.includes("useState") ||
      content.includes("useReducer") ||
      content.includes("useContext")
    );
  }

  private hasSideEffects(content: string): boolean {
    return content.includes("useEffect") || content.includes("useLayoutEffect");
  }

  private async analyzeTypes(projectPath: string): Promise<TypeInfo[]> {
    const types: TypeInfo[] = [];

    // Check for both src/ and root-level directories
    const srcPath = path.join(projectPath, "src");
    const hasSrcDir = await fs.pathExists(srcPath);
    const basePath = hasSrcDir ? srcPath : projectPath;

    const scanTypes = async (dirPath: string): Promise<void> => {
      if (!(await fs.pathExists(dirPath))) {
        return;
      }

      try {
        const items = await fs.readdir(dirPath);

        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = await fs.stat(itemPath);

          if (stat.isDirectory()) {
            await scanTypes(itemPath);
          } else if (item.endsWith(".ts") || item.endsWith(".tsx")) {
            const fileTypes = await this.extractTypesFromFile(itemPath);
            types.push(...fileTypes);
          }
        }
      } catch {
        // Silently skip directories that can't be read
      }
    };

    await scanTypes(basePath);
    return types;
  }

  private async extractTypesFromFile(filePath: string): Promise<TypeInfo[]> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const types: TypeInfo[] = [];

      // Extract interfaces
      const interfaceMatches = content.match(
        /export\s+interface\s+(\w+)\s*\{([^}]+)\}/g
      );
      if (interfaceMatches) {
        interfaceMatches.forEach((match) => {
          const nameMatch = match.match(/interface\s+(\w+)/);
          const propsMatch = match.match(/\{([^}]+)\}/);
          if (nameMatch && nameMatch[1]) {
            types.push({
              name: nameMatch[1],
              type: "interface",
              path: filePath,
              properties:
                propsMatch && propsMatch[1]
                  ? propsMatch[1].split(",").map((p) => p.trim())
                  : [],
              isExported: true,
              isGeneric: match.includes("<"),
            });
          }
        });
      }

      // Extract types
      const typeMatches = content.match(/export\s+type\s+(\w+)\s*=/g);
      if (typeMatches) {
        typeMatches.forEach((match) => {
          const nameMatch = match.match(/type\s+(\w+)/);
          if (nameMatch && nameMatch[1]) {
            types.push({
              name: nameMatch[1],
              type: "type",
              path: filePath,
              properties: [],
              isExported: true,
              isGeneric: match.includes("<"),
            });
          }
        });
      }

      return types;
    } catch (error) {
      console.warn(`Failed to extract types from ${filePath}:`, error);
      return [];
    }
  }

  private async analyzeStyling(projectPath: string): Promise<StylingInfo> {
    // Check for both src/ and root-level directories
    const srcPath = path.join(projectPath, "src");
    const hasSrcDir = await fs.pathExists(srcPath);
    const basePath = hasSrcDir ? srcPath : projectPath;

    const stylesPath = path.join(basePath, "styles");
    const appPath = path.join(basePath, "app");

    let framework: StylingInfo["framework"] = "vanilla";
    let hasDesignSystem = false;
    const colors: string[] = [];
    const fonts: string[] = [];
    const spacing: string[] = [];
    const breakpoints: string[] = [];
    const customProperties: string[] = [];

    // Check for Tailwind
    const tailwindConfig =
      (await fs.pathExists(path.join(projectPath, "tailwind.config.js"))) ||
      (await fs.pathExists(path.join(projectPath, "tailwind.config.ts")));
    if (tailwindConfig) {
      framework = "tailwind";
      hasDesignSystem = true;
    }

    // Check for CSS modules
    const cssModules = await this.hasCSSModules(basePath);
    if (cssModules) {
      framework = "css-modules";
    }

    // Check for styled-components
    const styledComponents = await this.hasStyledComponents(basePath);
    if (styledComponents) {
      framework = "styled-components";
    }

    // Analyze CSS files
    if (await fs.pathExists(stylesPath)) {
      const cssFiles = await this.findCSSFiles(stylesPath);
      for (const cssFile of cssFiles) {
        const content = await fs.readFile(cssFile, "utf-8");
        colors.push(...this.extractColors(content));
        fonts.push(...this.extractFonts(content));
        spacing.push(...this.extractSpacing(content));
        breakpoints.push(...this.extractBreakpoints(content));
        customProperties.push(...this.extractCustomProperties(content));
      }
    }

    return {
      framework,
      hasDesignSystem,
      colors: [...new Set(colors)],
      fonts: [...new Set(fonts)],
      spacing: [...new Set(spacing)],
      breakpoints: [...new Set(breakpoints)],
      customProperties: [...new Set(customProperties)],
    };
  }

  private async hasCSSModules(srcPath: string): Promise<boolean> {
    if (!(await fs.pathExists(srcPath))) {
      return false;
    }
    try {
      const items = await fs.readdir(srcPath);
      return items.some((item) => item.endsWith(".module.css"));
    } catch {
      return false;
    }
  }

  private async hasStyledComponents(srcPath: string): Promise<boolean> {
    if (!(await fs.pathExists(srcPath))) {
      return false;
    }
    try {
      const items = await fs.readdir(srcPath);
      return items.some((item) => item.includes("styled"));
    } catch {
      return false;
    }
  }

  private async findCSSFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    if (!(await fs.pathExists(dirPath))) {
      return files;
    }

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);

        if (stat.isDirectory()) {
          files.push(...(await this.findCSSFiles(itemPath)));
        } else if (
          item.endsWith(".css") ||
          item.endsWith(".scss") ||
          item.endsWith(".sass")
        ) {
          files.push(itemPath);
        }
      }
    } catch {
      // Silently skip directories that can't be read
    }

    return files;
  }

  private extractColors(content: string): string[] {
    const colorRegex =
      /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;
    return content.match(colorRegex) || [];
  }

  private extractFonts(content: string): string[] {
    const fontRegex = /font-family:\s*([^;]+)/g;
    const matches = content.match(fontRegex) || [];
    return matches.map((match) => match.replace("font-family:", "").trim());
  }

  private extractSpacing(content: string): string[] {
    const spacingRegex = /(?:margin|padding|gap):\s*([^;]+)/g;
    const matches = content.match(spacingRegex) || [];
    return matches.map((match) =>
      match.replace(/(?:margin|padding|gap):/, "").trim()
    );
  }

  private extractBreakpoints(content: string): string[] {
    const breakpointRegex = /@media\s+\([^)]+\)/g;
    return content.match(breakpointRegex) || [];
  }

  private extractCustomProperties(content: string): string[] {
    const customPropRegex = /--[a-zA-Z-]+/g;
    return content.match(customPropRegex) || [];
  }

  private async analyzeDependencies(projectPath: string): Promise<string[]> {
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));

    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});

    return [...dependencies, ...devDependencies];
  }

  private async getPackageJson(projectPath: string): Promise<any> {
    const packageJsonPath = path.join(projectPath, "package.json");
    return JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
  }

  private async inferProjectPurpose(
    components: ComponentInfo[],
    types: TypeInfo[],
    styling: StylingInfo,
    packageJson: any
  ): Promise<string> {
    // Limit data to prevent token overflow
    const maxComponents = 20;
    const maxTypes = 10;
    const maxDependencies = 15;

    const context = {
      // Only include key components (limit to prevent token overflow)
      components: components.slice(0, maxComponents).map((c) => ({
        name: c.name,
        type: c.type,
        group: c.group,
      })),
      // Only include key types
      types: types.slice(0, maxTypes).map((t) => ({
        name: t.name,
        type: t.type,
      })),
      styling: styling.framework,
      // Only include key dependencies (exclude dev dependencies)
      dependencies: Object.keys(packageJson.dependencies || {})
        .slice(0, maxDependencies)
        .filter((dep) => !dep.startsWith("@types/") && !dep.includes("eslint")),
      name: packageJson.name,
      description: packageJson.description,
      // Add summary info
      totalComponents: components.length,
      totalTypes: types.length,
      hasAppRouter: components.some((c) => c.group === "app"),
      hasPagesRouter: components.some((c) => c.group === "pages"),
    };

    const prompt = `Analyze this Next.js project and infer its purpose:

Project Context:
${JSON.stringify(context, null, 2)}

Based on the components, types, styling, and dependencies, what is this project's main purpose? Provide a brief 2-3 sentence description of what this application does.`;

    try {
      const response = await this.ai.generateText(prompt);
      return response.text.trim();
    } catch (error) {
      console.warn("Failed to infer project purpose with AI, using fallback");

      // Generate a more intelligent fallback based on available data
      const fallbackDescription = this.generateFallbackDescription(context);
      return fallbackDescription;
    }
  }

  private generateFallbackDescription(context: any): string {
    const {
      name,
      description,
      totalComponents,
      hasAppRouter,
      hasPagesRouter,
      styling,
    } = context;

    let fallback = `A Next.js application`;

    if (name && name !== "mm-business") {
      fallback += ` called "${name}"`;
    }

    if (description) {
      fallback += ` - ${description}`;
    }

    if (hasAppRouter) {
      fallback += ` using the App Router`;
    } else if (hasPagesRouter) {
      fallback += ` using the Pages Router`;
    }

    if (styling && styling !== "css") {
      fallback += ` with ${styling} styling`;
    }

    if (totalComponents > 0) {
      fallback += ` featuring ${totalComponents} custom components`;
    }

    return fallback;
  }

  private generateRecommendations(
    structure: ProjectAnalysis["structure"],
    components: ComponentInfo[],
    types: TypeInfo[],
    styling: StylingInfo
  ): string[] {
    const recommendations: string[] = [];

    if (!structure.hasComponents) {
      recommendations.push(
        "Consider organizing components in a dedicated src/components directory"
      );
    }

    if (!structure.hasLib) {
      recommendations.push(
        "Consider creating a src/lib directory for utilities and shared functions"
      );
    }

    if (components.length === 0) {
      recommendations.push(
        "No components found - consider creating reusable UI components"
      );
    }

    if (types.length === 0) {
      recommendations.push(
        "Consider adding TypeScript interfaces for better type safety"
      );
    }

    if (styling.framework === "vanilla") {
      recommendations.push(
        "Consider using a CSS framework like Tailwind CSS for better styling"
      );
    }

    return recommendations;
  }

  private displayAnalysisResults(analysis: ProjectAnalysis): void {
    console.log(chalk.blue.bold("\n📊 Project Analysis Results"));
    console.log(chalk.gray("=".repeat(50)));

    console.log(chalk.yellow("\n🏗️  Structure:"));
    console.log(
      chalk.gray(
        `  • App Router: ${analysis.structure.hasAppRouter ? "✅" : "❌"}`
      )
    );
    console.log(
      chalk.gray(
        `  • Pages Router: ${analysis.structure.hasPagesRouter ? "✅" : "❌"}`
      )
    );
    console.log(
      chalk.gray(
        `  • Components: ${analysis.structure.hasComponents ? "✅" : "❌"}`
      )
    );
    console.log(
      chalk.gray(`  • Lib: ${analysis.structure.hasLib ? "✅" : "❌"}`)
    );
    console.log(
      chalk.gray(`  • Styles: ${analysis.structure.hasStyles ? "✅" : "❌"}`)
    );

    console.log(chalk.yellow("\n🧩 Components:"));
    console.log(chalk.gray(`  • Total: ${analysis.components.length}`));
    console.log(
      chalk.gray(
        `  • Pages: ${
          analysis.components.filter((c) => c.type === "page").length
        }`
      )
    );
    console.log(
      chalk.gray(
        `  • Components: ${
          analysis.components.filter((c) => c.type === "component").length
        }`
      )
    );
    console.log(
      chalk.gray(
        `  • Client: ${analysis.components.filter((c) => c.isClient).length}`
      )
    );
    console.log(
      chalk.gray(
        `  • Server: ${analysis.components.filter((c) => c.isServer).length}`
      )
    );

    console.log(chalk.yellow("\n📝 Types:"));
    console.log(chalk.gray(`  • Total: ${analysis.types.length}`));
    console.log(
      chalk.gray(
        `  • Interfaces: ${
          analysis.types.filter((t) => t.type === "interface").length
        }`
      )
    );
    console.log(
      chalk.gray(
        `  • Types: ${analysis.types.filter((t) => t.type === "type").length}`
      )
    );

    console.log(chalk.yellow("\n🎨 Styling:"));
    console.log(chalk.gray(`  • Framework: ${analysis.styling.framework}`));
    console.log(
      chalk.gray(
        `  • Design System: ${analysis.styling.hasDesignSystem ? "✅" : "❌"}`
      )
    );
    console.log(chalk.gray(`  • Colors: ${analysis.styling.colors.length}`));
    console.log(chalk.gray(`  • Fonts: ${analysis.styling.fonts.length}`));

    console.log(chalk.yellow("\n🎯 Inferred Purpose:"));
    console.log(chalk.gray(`  ${analysis.inferredPurpose}`));

    if (analysis.recommendations.length > 0) {
      console.log(chalk.yellow("\n💡 Recommendations:"));
      analysis.recommendations.forEach((rec) => {
        console.log(chalk.gray(`  • ${rec}`));
      });
    }
  }

  private async generateContextFiles(
    analysis: ProjectAnalysis,
    outputDir: string,
    options: {
      includeBrand: boolean;
      includeTypes: boolean;
      includeComponents: boolean;
    }
  ): Promise<void> {
    const contextDir = path.join(process.cwd(), outputDir);
    await fs.ensureDir(contextDir);

    // Generate PRD
    const prdContent = this.generatePRD(analysis);
    await fs.writeFile(path.join(contextDir, "01-prd.md"), prdContent);

    // Generate types
    if (options.includeTypes) {
      const typesContent = this.generateTypes(analysis);
      await fs.writeFile(path.join(contextDir, "02-types.ts"), typesContent);
    }

    // Generate brand guidelines
    if (options.includeBrand) {
      const brandContent = this.generateBrand(analysis);
      await fs.writeFile(path.join(contextDir, "03-brand.md"), brandContent);
    }

    // Generate component list
    if (options.includeComponents) {
      const componentListContent = this.generateComponentList(analysis);
      await fs.writeFile(
        path.join(contextDir, "04-component-list.json"),
        componentListContent
      );
    }

    // Generate environment example
    const envExampleContent = EnvExampleGenerator.generateEnvExample(
      analysis.packageJson
    );
    await fs.writeFile(
      path.join(contextDir, "05-env.example"),
      envExampleContent
    );
  }

  private generatePRD(analysis: ProjectAnalysis): string {
    return `# Product Requirements Document

## Project Overview
**Name:** ${analysis.packageJson.name || "MyContext Project"}
**Description:** ${analysis.inferredPurpose}
**Framework:** ${analysis.framework}
**Analysis Date:** ${new Date().toISOString()}

## Current State Analysis

### Project Structure
- **App Router:** ${analysis.structure.hasAppRouter ? "Yes" : "No"}
- **Pages Router:** ${analysis.structure.hasPagesRouter ? "Yes" : "No"}
- **Components Directory:** ${analysis.structure.hasComponents ? "Yes" : "No"}
- **Lib Directory:** ${analysis.structure.hasLib ? "Yes" : "No"}

### Components Inventory
Total Components: ${analysis.components.length}

#### Pages (${analysis.components.filter((c) => c.type === "page").length})
${analysis.components
  .filter((c) => c.type === "page")
  .map((c) => `- ${c.name} (${c.group})`)
  .join("\n")}

#### UI Components (${
      analysis.components.filter((c) => c.type === "component").length
    })
${analysis.components
  .filter((c) => c.type === "component")
  .map((c) => `- ${c.name} (${c.group})`)
  .join("\n")}

### Type System
Total Types: ${analysis.types.length}

#### Interfaces (${analysis.types.filter((t) => t.type === "interface").length})
${analysis.types
  .filter((t) => t.type === "interface")
  .map((t) => `- ${t.name}`)
  .join("\n")}

#### Type Aliases (${analysis.types.filter((t) => t.type === "type").length})
${analysis.types
  .filter((t) => t.type === "type")
  .map((t) => `- ${t.name}`)
  .join("\n")}

### Styling System
- **Framework:** ${analysis.styling.framework}
- **Design System:** ${analysis.styling.hasDesignSystem ? "Yes" : "No"}
- **Custom Colors:** ${analysis.styling.colors.length}
- **Custom Fonts:** ${analysis.styling.fonts.length}

## Recommendations

${analysis.recommendations.map((rec) => `- ${rec}`).join("\n")}

## Next Steps

1. Review and refine the generated context files
2. Implement missing server actions and hooks
3. Enhance component functionality
4. Improve type safety where needed
5. Consider implementing a design system

## Dependencies

${analysis.dependencies.map((dep) => `- ${dep}`).join("\n")}
`;
  }

  private generateTypes(analysis: ProjectAnalysis): string {
    let content = `// Generated types from existing project analysis
// Date: ${new Date().toISOString()}

`;

    // Generate interfaces from existing types
    analysis.types.forEach((type) => {
      if (type.type === "interface") {
        content += `export interface ${type.name} {\n`;
        type.properties.forEach((prop) => {
          content += `  ${prop};\n`;
        });
        content += `}\n\n`;
      } else if (type.type === "type") {
        content += `export type ${type.name} = any; // TODO: Define proper type\n\n`;
      }
    });

    // Generate component prop interfaces
    analysis.components.forEach((component) => {
      if (component.props.length > 0) {
        content += `export interface ${component.name}Props {\n`;
        component.props.forEach((prop) => {
          content += `  ${prop}: any; // TODO: Define proper type\n`;
        });
        content += `}\n\n`;
      }
    });

    return content;
  }

  private generateBrand(analysis: ProjectAnalysis): string {
    return `# Brand Guidelines

## Color Palette
${analysis.styling.colors.map((color) => `- ${color}`).join("\n")}

## Typography
${analysis.styling.fonts.map((font) => `- ${font}`).join("\n")}

## Spacing System
${analysis.styling.spacing.map((space) => `- ${space}`).join("\n")}

## Breakpoints
${analysis.styling.breakpoints.map((bp) => `- ${bp}`).join("\n")}

## Custom Properties
${analysis.styling.customProperties.map((prop) => `- ${prop}`).join("\n")}

## Design System Status
- **Framework:** ${analysis.styling.framework}
- **Has Design System:** ${analysis.styling.hasDesignSystem ? "Yes" : "No"}

## Recommendations
${
  analysis.styling.framework === "vanilla"
    ? "- Consider implementing a design system with consistent tokens"
    : ""
}
${
  !analysis.styling.hasDesignSystem
    ? "- Consider using a design system like Tailwind CSS or Chakra UI"
    : ""
}
`;
  }

  private generateComponentList(analysis: ProjectAnalysis): string {
    const componentList = {
      groups: analysis.components.reduce((acc, component) => {
        const group = component.group || "default";
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push({
          name: component.name,
          description: `${component.type} component`,
          type: component.type,
          priority: "medium",
          dependencies: component.dependencies,
          tags: [component.type, component.isClient ? "client" : "server"],
        });
        return acc;
      }, {} as Record<string, any[]>),
    };

    return JSON.stringify(componentList, null, 2);
  }

  private printNextSteps(
    analysis: ProjectAnalysis,
    generateContext: boolean
  ): void {
    console.log(chalk.yellow("\n📋 Next Steps:"));

    if (generateContext) {
      console.log(
        chalk.gray("1. Review the generated context files in .mycontext/")
      );
      console.log(
        chalk.gray("2. Update the PRD with your specific requirements")
      );
      console.log(chalk.gray("3. Refine the types and interfaces"));
      console.log(chalk.gray("4. Customize the brand guidelines"));
    }

    console.log(
      chalk.gray(
        "5. Run 'mycontext generate context --full' to enhance context"
      )
    );
    console.log(
      chalk.gray(
        "6. Run 'mycontext generate components-list' to plan new components"
      )
    );
    console.log(
      chalk.gray(
        "7. Run 'mycontext generate-components' to create new components"
      )
    );
    console.log(
      chalk.gray("8. Use 'mycontext promote' to move components to production")
    );
  }
}
