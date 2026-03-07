import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { CONTEXT_FILES } from "../constants/fileNames";
import { EnhancedSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import { HybridAIClient } from "../utils/hybridAIClient";
import { exec } from "child_process";
import { promisify } from "util";
import { AICore } from "../core/ai/AICore";
import { ContextRenderer } from "../utils/contextRenderer";
import { LivingContext } from "../types/living-context";
import { BrainClient } from "../core/brain/BrainClient";
import { BrainRole } from "@myycontext/core";

const execAsync = promisify(exec);

interface ScreenGenerationOptions {
  format?: string; // html, png, both
  output?: string;
  screen?: string; // specific screen name
  group?: string; // screen group
  all?: boolean;
  includeScreenshot?: boolean;
  screenshot?: boolean; // alias for includeScreenshot
  verbose?: boolean;
  open?: boolean; // auto-open in browser
}

interface ScreenMetadata {
  name: string;
  prompt: string;
  model: string;
  timestamp: string;
  format: string[];
  path: string;
  group?: string;
}

interface ScreenToGenerate {
  name: string;
  prompt: string;
  group?: string;
}

/**
 * Generate visual screens (HTML/PNG) using Gemini API + nanobanana-style generation
 * Reads context from .mycontext/ and generates screens with realistic previews
 */
export class GenerateScreensCommand {
  private spinner: EnhancedSpinner;
  private ai: HybridAIClient;
  private brain: BrainClient;

  constructor() {
    this.spinner = new EnhancedSpinner("Generating screens...");
    this.ai = new HybridAIClient();
    this.brain = BrainClient.getInstance();
  }

  async execute(screenName?: string, options: ScreenGenerationOptions = {}): Promise<void> {
    const projectPath = process.cwd();
    const contextDir = path.join(projectPath, ".mycontext");
    const screensDir = path.join(contextDir, "screens");
    const brain = await AICore.getInstance().getLivingContext();

    this.spinner.start();

    // Check if .mycontext directory exists
    if (!fs.existsSync(contextDir)) {
      this.spinner.fail("No .mycontext directory found");
      console.log(
        chalk.red(
          "\n❌ No .mycontext directory found. Run 'mycontext init' first."
        )
      );
      return;
    }

    // Check if AI client is available (has at least one provider)
    const providerName = await this.ai.getActiveProviderName();
    if (providerName === "unknown") {
      this.spinner.fail("No AI providers configured");
      console.log(
        chalk.red(
          "\n❌ No AI providers configured. Set GITHUB_TOKEN or GEMINI_API_KEY."
        )
      );
      return;
    }

    try {
      // Create screens directory if it doesn't exist
      await fs.ensureDir(screensDir);

      // Load context files
      const context = await this.loadContext(contextDir);

      // Determine which screens to generate
      const screensToGenerate = await this.determineScreens(
        screenName,
        context,
        options
      );

      this.spinner.succeed("Context loaded");
      console.log(
        chalk.blue(`\n🎨 Generating ${screensToGenerate.length} screen(s)...\n`)
      );

      // Generate screens
      const generatedScreens: ScreenMetadata[] = [];
      for (const screen of screensToGenerate) {
        const screenSpinner = new EnhancedSpinner(
          `Generating ${screen.name}...`
        );
        screenSpinner.start();

        try {
          const metadata = await this.generateScreen(
            screen,
            context,
            screensDir,
            options,
            brain
          );
          generatedScreens.push(metadata);
          screenSpinner.succeed(`Generated ${screen.name}`);
        } catch (error: any) {
          screenSpinner.fail(`Failed to generate ${screen.name}`);
          logger.error(`Screen generation error:`, error.message);
        }
      }

      // Update screens manifest
      await this.updateScreensManifest(screensDir, generatedScreens);

      // Sync with context.json (Living Brain)
      await this.syncWithLivingBrain(projectPath, generatedScreens);

      // Show summary
      console.log(chalk.green(`\n✅ Generated ${generatedScreens.length} screen(s)`));
      console.log(chalk.gray(`   Output: ${screensDir}`));

      // Show hosted Studio preview link
      console.log(chalk.blue(`\n🎨 Preview your screens at: ${chalk.bold("https://studio.mycontext.app")}`));
      console.log(chalk.gray(`   Upload your .mycontext/ directory to preview all generated screens`));

      // Auto-open in browser if requested (opens local HTML files)
      if (options.open !== false && generatedScreens.length > 0) {
        await this.openInBrowser(screensDir, generatedScreens[0]!);
      }
    } catch (error: any) {
      this.spinner.fail("Screen generation failed");
      logger.error("Error generating screens:", error.message);
      throw error;
    }
  }

  /**
   * Load context files for screen generation
   */
  private async loadContext(contextDir: string): Promise<{
    prd?: string;
    brand?: string;
    flows?: string;
    features?: string;
    sampleData?: any;
  }> {
    const context: any = {};

    // Load PRD
    const prdPath = path.join(contextDir, CONTEXT_FILES.PRD);
    if (fs.existsSync(prdPath)) {
      context.prd = fs.readFileSync(prdPath, "utf8");
    }

    // Load brand guidelines
    const brandPath = path.join(contextDir, CONTEXT_FILES.BRANDING);
    if (fs.existsSync(brandPath)) {
      context.brand = fs.readFileSync(brandPath, "utf8");
    }

    // Load user flows
    const flowsPath = path.join(contextDir, CONTEXT_FILES.USER_FLOWS);
    if (fs.existsSync(flowsPath)) {
      context.flows = fs.readFileSync(flowsPath, "utf8");
    }

    // Load features
    const featuresPath = path.join(contextDir, CONTEXT_FILES.FEATURES);
    if (fs.existsSync(featuresPath)) {
      context.features = fs.readFileSync(featuresPath, "utf8");
    }

    // Load sample data
    const sampleDataPath = path.join(contextDir, "sample-data.json");
    if (fs.existsSync(sampleDataPath)) {
      try {
        context.sampleData = JSON.parse(
          fs.readFileSync(sampleDataPath, "utf8")
        );
      } catch (error) {
        logger.warn("Could not load sample data");
      }
    }

    // Load screens from context.json if present
    const contextJsonPath = path.join(contextDir, "context.json");
    if (fs.existsSync(contextJsonPath)) {
      try {
        const contextJson = await fs.readJson(contextJsonPath);
        if (contextJson.screens) {
          context.screens = contextJson.screens;
        }
      } catch (error) {
        // Not a big deal
      }
    }

    return context;
  }

  /**
   * Determine which screens to generate based on options and context
   */
  private async determineScreens(
    screenName: string | undefined,
    context: any,
    options: ScreenGenerationOptions
  ): Promise<ScreenToGenerate[]> {
    const screens: ScreenToGenerate[] = [];

    if (screenName) {
      // Generate specific screen
      screens.push({
        name: screenName,
        prompt: `Generate a ${screenName} screen for this application`,
        group: options.group || "custom",
      });
    } else if (options.all) {
      // Generate all screens from flows
      const screenNames = this.extractScreenNamesFromFlows(context.flows);
      screenNames.forEach((name) => {
        screens.push({
          name,
          prompt: `Generate a ${name} screen for this application`,
          group: "flow",
        });
      });
    } else if (context.screens && Array.isArray(context.screens)) {
      // Use screens defined in context.json
      context.screens.forEach((s: any) => {
        screens.push({
          name: s.name,
          prompt: s.prompt || `Generate a ${s.name} screen`,
          group: s.group || "context",
        });
      });
    } else {
      // Generate common screens
      screens.push(
        { name: "home", prompt: "Generate a home/landing page", group: "core" },
        { name: "login", prompt: "Generate a login screen", group: "core" },
        { name: "dashboard", prompt: "Generate a dashboard screen", group: "core" }
      );
    }

    return screens;
  }

  /**
   * Extract screen names from user flows
   */
  private extractScreenNamesFromFlows(flows?: string): string[] {
    if (!flows) return [];

    const screenNames: string[] = [];
    const lines = flows.split("\n");

    // Look for screen mentions in flows
    lines.forEach((line) => {
      // Match patterns like "1. Login Screen", "- Dashboard", etc.
      const match = line.match(/(?:^|\s)([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*(?:Screen|Page|View)/i);
      if (match && match[1]) {
        const name = match[1].toLowerCase().replace(/\s+/g, "-");
        if (!screenNames.includes(name)) {
          screenNames.push(name);
        }
      }
    });

    return screenNames.length > 0 ? screenNames : ["home", "dashboard"];
  }

  /**
   * Generate a single screen
   */
  private async generateScreen(
    screen: ScreenToGenerate,
    context: any,
    screensDir: string,
    options: ScreenGenerationOptions,
    brain?: LivingContext | null
  ): Promise<ScreenMetadata> {
    const includeScreenshot = options.format?.includes("png") || options.includeScreenshot || false;
    const format = options.format || "html";

    // Load images manifest if it exists
    let imagesContext = "";
    const manifestPath = path.join(process.cwd(), ".mycontext", "images-manifest.json");
    let imagesManifest = null;
    if (fs.existsSync(manifestPath)) {
      try {
        imagesManifest = await fs.readJson(manifestPath);
        const assets = Array.isArray(imagesManifest.assets) ? imagesManifest.assets : (imagesManifest.visualAssets || imagesManifest);
        if (Array.isArray(assets)) {
          imagesContext = "\nLOCAL ASSETS AVAILABLE (Use these paths instead of placeholders):\n";
          assets.forEach((a: any) => {
            imagesContext += `- ${a.id}: /assets/images/${a.id}.png (${a.description})\n`;
          });
        }
      } catch (err) {
        logger.warn("Could not load images manifest");
      }
    }

    // Build prompt based on format
    let finalPrompt = screen.prompt;
    
    // Global Design System Context
    const designSystem = `
      ## GLOBAL DESIGN SYSTEM (PREMIUM STANDARDS):
      - Typography: Use modern sans-serif fonts (e.g., Inter, Outfit, System-UI).
      - Color Palette: Deep rich colors, vibrant accents, sleek dark modes.
      - Contrast: Ensure high contrast for text visibility. AVOID white-on-light or black-on-dark issues.
      - Aesthetics: Use Glassmorphism (backdrop-blur), soft shadows, and subtle gradients.
      - Spacing: Expertly balanced whitespace and grid systems.
    `;

    // Standardized Layout Context
    const layoutContext = `
      ## STANDARDIZED LAYOUT REQUIREMENTS:
      - All screens MUST be wrapped in a consistent 'Layout' structure.
      - HEADER: Include a professional logo, navigation links, and a functional-looking 'ThemeToggle' (Light/Dark).
      - FOOTER: Include company info, links, social icons, and copyright.
      - Ensure the layout is responsive and works world-class on mobile and desktop.
    `;

    finalPrompt = `${designSystem}\n${layoutContext}\n\n## SCREEN SPECIFIC REQUEST:\n${finalPrompt}`;

    if (imagesContext) {
      finalPrompt += `\n\nCRITICAL: ${imagesContext}\n\nSTRICT REQUIREMENT: You MUST use the local asset paths provided above for ALL images in this screen. DO NOT use Unsplash, Placehold.it, or any other external image services. If a local asset matches the intended use (e.g., 'hero-background' for a hero section), YOU MUST USE IT. For the hero background, use: \`<body style="background-image: url('/assets/images/hero-background.png'); background-size: cover;">\` or a similar high-impact implementation.`;
    }
    if (format === "jsx") {
      finalPrompt += ". Use React, Tailwind CSS, and Lucide/Radix components. Export as a default functional component.";
    }

    // Generate visual screen using HybridAIClient
    let result;
    const enrichedContext = { ...context, imagesManifest };

    if (format === "html") {
      // For HTML, we can still use Gemini if available for best visual results, or fallback to generic text
      const provider = await this.ai.getActiveProviderName();
      if (provider === "gemini") {
        const gemini = (this.ai as any).providers.find((p: any) => p.name === "gemini").client;
        result = await gemini.generateVisualScreen(finalPrompt, enrichedContext, { includeScreenshot });
      } else {
        const response = await this.ai.generateText(this.buildVisualHtmlPrompt(finalPrompt, enrichedContext, brain), options);
        result = {
          html: this.extractCodeBlock(response.text, "html"),
          metadata: { model: response.provider, timestamp: new Date().toISOString() }
        };
      }
    } else {
      // JSX format
      const response = await this.ai.generateText(this.buildVisualJsxPrompt(finalPrompt, context, brain), options);
      result = {
        html: this.extractCodeBlock(response.text, "tsx") || this.extractCodeBlock(response.text, "jsx") || response.text,
        metadata: { model: response.provider, timestamp: new Date().toISOString() }
      };
    }

    // Create screen directory
    const screenDir = path.join(screensDir, screen.name);
    await fs.ensureDir(screenDir);

    // Save File
    const fileName = format === "jsx" ? "index.tsx" : "index.html";
    const filePath = path.join(screenDir, fileName);
    await fs.writeFile(filePath, result.html, "utf8");

    // Save screenshot if generated
    if ((result as any).screenshot) {
      const pngPath = path.join(screenDir, "preview.png");
      const buffer = Buffer.from((result as any).screenshot, "base64");
      await fs.writeFile(pngPath, buffer);
    }

    // Save generation metadata
    const metadataPath = path.join(screenDir, "metadata.json");
    const metadata: ScreenMetadata = {
      name: screen.name,
      prompt: screen.prompt,
      model: result.metadata.model,
      timestamp: result.metadata.timestamp,
      format: [format, (result as any).screenshot ? "png" : null].filter(
        Boolean
      ) as string[],
      path: screenDir,
      group: (screen as any).group,
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");

    // Sync with Brain
    await this.brain.addUpdate(
      "ScreenGenerator",
      "builder",
      "action",
      `Generated ${format.toUpperCase()} screen for '${screen.name}' in group '${screen.group || 'default'}'.`,
      { path: filePath, model: result.metadata.model }
    );
    
    await this.brain.updateArtifact("code", result.html, filePath);

    return metadata;
  }

  private buildVisualHtmlPrompt(userPrompt: string, context: any, brain?: LivingContext | null): string {
    const prd = brain ? ContextRenderer.renderPRD(brain) : context.prd;
    const brand = brain ? ContextRenderer.renderBrandGuide(brain) : context.brand;
    const features = brain ? ContextRenderer.renderFeatures(brain) : context.features;
    const aesthetic = brain?.aestheticPreference || "modern";
    const projectType = brain?.projectType || "application";

    return `You are an elite UI/UX engineer building a ${aesthetic} ${projectType}.
    
USER INSTRUCTION: ${userPrompt}

FULL PROJECT CONTEXT (Living Brain):
${prd}

DESIGN SYSTEM & BRANDING:
${brand}

CORE FEATURES TO HIGHLIGHT:
${features}

REQUIREMENTS:
1. Use BEAUTIFUL, high-quality Tailwind CSS.
2. Incorporate the specific aesthetic: ${aesthetic}.
3. NO generic placeholders like "Application Name". Use the real project name: ${brain?.metadata?.projectConfig?.name || "The App"}.
4. Use realistic, industry-specific copy and imagery (via Unsplash/Placehold.co).
5. Ensure the layout is premium and follows modern web design trends (e.g., glassmorphism, dynamic gradients, perfect spacing).

Return ONLY the HTML code wrapped in \`\`\`html blocks.`;
  }

  private buildVisualJsxPrompt(userPrompt: string, context: any, brain?: LivingContext | null): string {
    const prd = brain ? ContextRenderer.renderPRD(brain) : context.prd;
    const brand = brain ? ContextRenderer.renderBrandGuide(brain) : context.brand;
    const aesthetic = brain?.aestheticPreference || "modern";

    return `You are an elite Full-Stack UI Architect. Generate a production-ready, highly-polished React component (TSX) using Tailwind CSS.

USER INSTRUCTION: ${userPrompt}

AESTHETIC GOAL: ${aesthetic} (High-Fidelity, Premium)

BRAIN CONTEXT:
${prd}

BRANDING DATA:
${brand}

TECHNICAL REQUIREMENTS:
- Use React (Functional Components)
- Use Tailwind CSS for all styling (Premium patterns)
- Use Lucide-React for icons
- Implementation MUST BE high-fidelity - avoid "dull" or "generic" layouts.
- Use the actual Project Name: ${brain?.metadata?.projectConfig?.name || "The App"}.

CRITICAL: Return the COMPLETE file content. DO NOT TRUNCATE. Ensure all components (Layout, Header, Hero, Features, Footer) are fully implemented in the same file.

Return ONLY the TSX code wrapped in \`\`\`tsx blocks.`;
  }

  private extractCodeBlock(content: string, lang: string): string {
    const pattern = new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\\n\`\`\``);
    const match = content.match(pattern);
    return match && match[1] ? match[1].trim() : content;
  }

  /**
   * Update screens manifest file
   */
  private async updateScreensManifest(
    screensDir: string,
    screens: ScreenMetadata[]
  ): Promise<void> {
    const manifestPath = path.join(screensDir, "screens-manifest.json");

    // Load existing manifest if it exists
    let manifest: { screens: ScreenMetadata[]; lastUpdated: string } = {
      screens: [],
      lastUpdated: new Date().toISOString(),
    };

    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      } catch (error) {
        logger.warn("Could not load existing manifest");
      }
    }

    // Update manifest with new screens
    screens.forEach((newScreen) => {
      const existingIndex = manifest.screens.findIndex(
        (s) => s.name === newScreen.name
      );
      if (existingIndex >= 0) {
        manifest.screens[existingIndex] = newScreen;
      } else {
        manifest.screens.push(newScreen);
      }
    });

    manifest.lastUpdated = new Date().toISOString();

    // Save manifest
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  }

  /**
   * Open generated screen in browser
   */
  private async openInBrowser(
    screensDir: string,
    screen: ScreenMetadata
  ): Promise<void> {
    if (!screen) return;
    const fileName = screen.format.includes("jsx") ? "index.tsx" : "index.html";
    const filePath = path.join(screen.path, fileName);

    if (!fs.existsSync(filePath)) {
      logger.warn("HTML/JSX file not found, cannot open in browser");
      return;
    }

    try {
      console.log(chalk.blue("\n🌐 Opening screen in browser..."));

      // Platform-specific open command
      const command =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
          ? "start"
          : "xdg-open";

      await execAsync(`${command} "${filePath}"`);
    } catch (error) {
      logger.warn("Could not auto-open browser:", error);
      console.log(chalk.gray(`\n💡 Manually open: ${filePath}`));
    }
  }

  /**
   * Sync generated screens back to the Living Brain (context.json)
   */
  private async syncWithLivingBrain(projectPath: string, screens: ScreenMetadata[]): Promise<void> {
    const contextPath = path.join(projectPath, ".mycontext", "context.json");
    if (!fs.existsSync(contextPath)) return;

    try {
      const context = await fs.readJson(contextPath);
      
      if (!context.screens) context.screens = [];
      
      screens.forEach(screen => {
        const existingIndex = context.screens.findIndex((s: any) => s.name === screen.name);
        if (existingIndex >= 0) {
          context.screens[existingIndex] = screen;
        } else {
          context.screens.push(screen);
        }
      });
      
      if (!context.metadata) context.metadata = {};
      context.metadata.lastUpdatedAt = new Date().toISOString();
      await fs.writeJson(contextPath, context, { spaces: 2 });
      console.log(chalk.gray("   Brain synchronized with new screens."));
    } catch (error) {
      logger.error("Failed to sync with Living Brain:", error);
    }
  }
}

/**
 * Register the generate:screens command
 */
export function registerGenerateScreensCommand(program: Command): void {
  program
    .command("generate:screens [screen-name]")
    .alias("gs")
    .description(
      "Generate visual screens (HTML/JSX) - Preview at https://studio.mycontext.app"
    )
    .option("-a, --all", "Generate all screens from user flows")
    .option(
      "-f, --format <formats>",
      "Output formats: html, png, jsx, or both",
      "html"
    )
    .option("-g, --group <name>", "Group name for the screen")
    .option(
      "-o, --output <path>",
      "Output directory (default: .mycontext/screens)"
    )
    .option("-s, --screenshot", "Include PNG screenshots (requires puppeteer)")
    .option("--no-open", "Don't auto-open in browser")
    .option("-v, --verbose", "Show detailed output")
    .action(async (screenName: string | undefined, options: ScreenGenerationOptions) => {
      const command = new GenerateScreensCommand();
      await command.execute(screenName, {
        ...options,
        includeScreenshot: options.screenshot || options.format?.includes("png"),
      });
    });
}
