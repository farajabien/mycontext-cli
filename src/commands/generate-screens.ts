import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs-extra";
import path from "path";
import { CONTEXT_FILES } from "../constants/fileNames";
import { EnhancedSpinner } from "../utils/spinner";
import { logger } from "../utils/logger";
import { GeminiClient } from "../utils/geminiClient";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ScreenGenerationOptions {
  format?: string; // html, png, both
  output?: string;
  screen?: string; // specific screen name
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
}

/**
 * Generate visual screens (HTML/PNG) using Gemini API + nanobanana-style generation
 * Reads context from .mycontext/ and generates screens with realistic previews
 */
export class GenerateScreensCommand {
  private spinner: EnhancedSpinner;
  private geminiClient: GeminiClient;

  constructor() {
    this.spinner = new EnhancedSpinner("Generating screens...");
    this.geminiClient = new GeminiClient();
  }

  async execute(screenName?: string, options: ScreenGenerationOptions = {}): Promise<void> {
    const projectPath = process.cwd();
    const contextDir = path.join(projectPath, ".mycontext");
    const screensDir = path.join(contextDir, "screens");

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

    // Check if Gemini client is available
    if (!this.geminiClient.hasApiKey()) {
      this.spinner.fail("Gemini API key not found");
      console.log(
        chalk.red(
          "\n❌ Gemini API key not found. Set GEMINI_API_KEY in .mycontext/.env"
        )
      );
      console.log(
        chalk.blue(
          "\n💡 Get your free API key at: https://aistudio.google.com/apikey"
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
            options
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

      // Show summary
      console.log(chalk.green(`\n✅ Generated ${generatedScreens.length} screen(s)`));
      console.log(chalk.gray(`   Output: ${screensDir}`));

      // Auto-open in browser if requested
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

    return context;
  }

  /**
   * Determine which screens to generate based on options and context
   */
  private async determineScreens(
    screenName: string | undefined,
    context: any,
    options: ScreenGenerationOptions
  ): Promise<Array<{ name: string; prompt: string }>> {
    const screens: Array<{ name: string; prompt: string }> = [];

    if (screenName) {
      // Generate specific screen
      screens.push({
        name: screenName,
        prompt: `Generate a ${screenName} screen for this application`,
      });
    } else if (options.all) {
      // Generate all screens from flows
      const screenNames = this.extractScreenNamesFromFlows(context.flows);
      screenNames.forEach((name) => {
        screens.push({
          name,
          prompt: `Generate a ${name} screen for this application`,
        });
      });
    } else {
      // Generate common screens
      screens.push(
        { name: "home", prompt: "Generate a home/landing page" },
        { name: "login", prompt: "Generate a login screen" },
        { name: "dashboard", prompt: "Generate a dashboard screen" }
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
    screen: { name: string; prompt: string },
    context: any,
    screensDir: string,
    options: ScreenGenerationOptions
  ): Promise<ScreenMetadata> {
    const includeScreenshot = options.format?.includes("png") || options.includeScreenshot || false;

    // Generate visual screen using Gemini
    const result = await this.geminiClient.generateVisualScreen(
      screen.prompt,
      context,
      { includeScreenshot }
    );

    // Create screen directory
    const screenDir = path.join(screensDir, screen.name);
    await fs.ensureDir(screenDir);

    // Save HTML
    const htmlPath = path.join(screenDir, "index.html");
    await fs.writeFile(htmlPath, result.html, "utf8");

    // Save screenshot if generated
    if (result.screenshot) {
      const pngPath = path.join(screenDir, "preview.png");
      const buffer = Buffer.from(result.screenshot, "base64");
      await fs.writeFile(pngPath, buffer);
    }

    // Save context metadata
    const contextPath = path.join(screenDir, "context.json");
    await fs.writeFile(
      contextPath,
      JSON.stringify(
        {
          prd: context.prd?.substring(0, 1000),
          brand: context.brand?.substring(0, 500),
          sampleData: context.sampleData,
        },
        null,
        2
      ),
      "utf8"
    );

    // Save generation metadata
    const metadataPath = path.join(screenDir, "metadata.json");
    const metadata: ScreenMetadata = {
      name: screen.name,
      prompt: screen.prompt,
      model: result.metadata.model,
      timestamp: result.metadata.timestamp,
      format: ["html", result.screenshot ? "png" : null].filter(
        Boolean
      ) as string[],
      path: screenDir,
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");

    return metadata;
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
    const htmlPath = path.join(screen.path, "index.html");

    if (!fs.existsSync(htmlPath)) {
      logger.warn("HTML file not found, cannot open in browser");
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

      await execAsync(`${command} "${htmlPath}"`);
    } catch (error) {
      logger.warn("Could not auto-open browser:", error);
      console.log(chalk.gray(`\n💡 Manually open: ${htmlPath}`));
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
      "Generate visual screens (HTML/PNG) using Gemini API with full context"
    )
    .option("-a, --all", "Generate all screens from user flows")
    .option(
      "-f, --format <formats>",
      "Output formats: html, png, or both",
      "html"
    )
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
