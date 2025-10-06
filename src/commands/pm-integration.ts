// PM Integration Command
// Manages the integration between MyContext CLI and mycontext PM

import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import {
  PMIntegrationService,
  PMIntegrationConfig,
} from "../services/PMIntegrationService";
import { WebhookServer, WebhookServerConfig } from "../services/WebhookServer";
import { PMIntegrationError } from "../types/pm-integration";

interface PMIntegrationCommandOptions {
  config?: string;
  pmEndpoint?: string;
  webhookUrl?: string;
  apiKey?: string;
  projectId?: string;
  port?: number;
  enableWebhookServer?: boolean;
  syncInterval?: number;
  verbose?: boolean;
}

export class PMIntegrationCommand {
  private integrationService?: PMIntegrationService;
  private webhookServer?: WebhookServer;

  public register(program: Command): void {
    const command = program
      .command("pm-integration")
      .description("Manage mycontext PM integration with MyContext CLI")
      .option("-c, --config <file>", "Path to integration config file")
      .option("--pm-endpoint <url>", "mycontext PM API endpoint")
      .option("--webhook-url <url>", "Webhook URL for progress updates")
      .option("--api-key <key>", "API key for PM authentication")
      .option("--project-id <id>", "Project ID for integration")
      .option("-p, --port <number>", "Port for webhook server", "8080")
      .option("--enable-webhook-server", "Enable local webhook server")
      .option("--sync-interval <minutes>", "Sync interval in minutes", "60")
      .option("--verbose", "Enable verbose output");

    command
      .command("start")
      .description("Start PM integration service")
      .action(async (options: PMIntegrationCommandOptions) => {
        await this.startIntegration(options);
      });

    command
      .command("stop")
      .description("Stop PM integration service")
      .action(async () => {
        await this.stopIntegration();
      });

    command
      .command("status")
      .description("Show integration status")
      .action(async () => {
        await this.showStatus();
      });

    command
      .command("test")
      .description("Test connection to mycontext PM")
      .action(async (options: PMIntegrationCommandOptions) => {
        await this.testConnection(options);
      });

    command
      .command("sync")
      .description("Manually sync with mycontext PM")
      .option("--project-id <id>", "Project ID to sync")
      .option("--include-tasks", "Include task details in sync")
      .option("--include-components", "Include component details in sync")
      .action(async (syncOptions) => {
        await this.manualSync(syncOptions);
      });

    command
      .command("config")
      .description("Manage integration configuration")
      .option("--create", "Create default config file")
      .option("--validate", "Validate existing config file")
      .option("--path <file>", "Config file path", "./pm-integration.json")
      .action(async (configOptions) => {
        await this.manageConfig(configOptions);
      });
  }

  private async startIntegration(
    options: PMIntegrationCommandOptions
  ): Promise<void> {
    try {
      console.log(chalk.blue.bold("🚀 Starting mycontext PM Integration...\n"));

      // Load configuration
      const config = await this.loadConfiguration(options);

      // Initialize integration service
      this.integrationService = new PMIntegrationService(config);

      // Start integration service
      await this.integrationService.initialize();

      // Start webhook server if enabled
      if (options.enableWebhookServer || config.webhookUrl) {
        await this.startWebhookServer({
          port: options.port || 8080,
          authToken: config.apiKey,
        });
      }

      console.log(
        chalk.green.bold("\n✅ PM Integration started successfully!")
      );
      console.log(chalk.cyan("🔗 Integration Status:"));
      console.log(`   Service: ${chalk.green("Running")}`);
      console.log(
        `   Webhook Server: ${
          this.webhookServer ? chalk.green("Running") : chalk.gray("Disabled")
        }`
      );
      console.log(
        `   Project ID: ${config.projectId || chalk.gray("Not set")}`
      );
      console.log(`   Sync Interval: ${config.syncInterval} minutes`);

      if (this.webhookServer) {
        const status = this.webhookServer.getStatus();
        if (status.url) {
          console.log(
            `   Webhook URL: ${chalk.white(status.url + "/webhook")}`
          );
        }
      }

      // Keep process alive for real-time sync
      console.log(chalk.gray("\n📡 Integration active. Press Ctrl+C to stop."));
      console.log(
        chalk.gray("   Real-time sync and webhook handling enabled.\n")
      );

      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        console.log(chalk.blue("\n🛑 Shutting down PM integration..."));
        await this.stopIntegration();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        console.log(chalk.blue("\n🛑 Shutting down PM integration..."));
        await this.stopIntegration();
        process.exit(0);
      });
    } catch (error) {
      console.error(chalk.red("❌ Failed to start PM integration:"), error);
      process.exit(1);
    }
  }

  private async stopIntegration(): Promise<void> {
    try {
      if (this.integrationService) {
        this.integrationService.disconnect();
        this.integrationService = undefined;
      }

      if (this.webhookServer) {
        await this.webhookServer.stop();
        this.webhookServer = undefined;
      }

      console.log(chalk.green("✅ PM Integration stopped successfully"));
    } catch (error) {
      console.error(chalk.red("❌ Error stopping integration:"), error);
      throw error;
    }
  }

  private async showStatus(): Promise<void> {
    console.log(chalk.blue.bold("📊 mycontext PM Integration Status\n"));

    if (!this.integrationService) {
      console.log(chalk.red("❌ Integration service not running"));
      console.log(
        chalk.gray(
          "   Run 'mycontext pm-integration start' to start the service"
        )
      );
      return;
    }

    const serviceStatus = this.integrationService.getStatus();
    const webhookStatus = this.webhookServer?.getStatus();

    console.log(chalk.cyan("🔗 Service Status:"));
    console.log(
      `   Connected: ${
        serviceStatus.connected ? chalk.green("Yes") : chalk.red("No")
      }`
    );
    console.log(
      `   Last Sync: ${serviceStatus.lastSync || chalk.gray("Never")}`
    );
    console.log(
      `   Project ID: ${serviceStatus.projectId || chalk.gray("Not set")}`
    );
    console.log(`   Pending Updates: ${serviceStatus.pendingUpdates || 0}`);

    if (webhookStatus) {
      console.log(chalk.cyan("\n🌐 Webhook Server:"));
      console.log(
        `   Running: ${
          webhookStatus.running ? chalk.green("Yes") : chalk.red("No")
        }`
      );
      console.log(
        `   URL: ${webhookStatus.url || chalk.gray("Not available")}`
      );
      console.log(`   Active Connections: ${webhookStatus.connections}`);
    } else {
      console.log(chalk.cyan("\n🌐 Webhook Server:"));
      console.log(`   Status: ${chalk.gray("Not enabled")}`);
    }

    if (serviceStatus.errors && serviceStatus.errors.length > 0) {
      console.log(chalk.cyan("\n🚨 Recent Errors:"));
      serviceStatus.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${chalk.red(error)}`);
      });
    }
  }

  private async testConnection(
    options: PMIntegrationCommandOptions
  ): Promise<void> {
    try {
      console.log(chalk.blue("🔍 Testing connection to mycontext PM..."));

      const config = await this.loadConfiguration(options);
      const testService = new PMIntegrationService(config);

      await testService.initialize();
      testService.disconnect();

      console.log(chalk.green("✅ Connection test successful!"));
      console.log(chalk.gray("   mycontext PM is reachable and responding"));
    } catch (error) {
      console.error(chalk.red("❌ Connection test failed:"), error);
      console.log(
        chalk.gray("   Check your configuration and network connection")
      );
      process.exit(1);
    }
  }

  private async manualSync(syncOptions: any): Promise<void> {
    if (!this.integrationService) {
      console.error(chalk.red("❌ Integration service not running"));
      console.log(
        chalk.gray(
          "   Start the service first with 'mycontext pm-integration start'"
        )
      );
      return;
    }

    try {
      console.log(chalk.blue("🔄 Starting manual sync..."));

      const syncRequest = {
        projectId:
          syncOptions.projectId ||
          this.integrationService.getStatus().projectId,
        syncTimestamp: new Date().toISOString(),
        includeTasks: syncOptions.includeTasks,
        includeComponents: syncOptions.includeComponents,
        includeMetrics: true,
      };

      const result = await this.integrationService.syncProgress(syncRequest);

      console.log(chalk.green("✅ Manual sync completed!"));
      console.log(chalk.cyan("📊 Sync Results:"));
      console.log(`   New Tasks: ${result.changes.newTasks?.length || 0}`);
      console.log(
        `   Updated Tasks: ${result.changes.updatedTasks?.length || 0}`
      );
      console.log(
        `   Completed Tasks: ${result.changes.completedTasks?.length || 0}`
      );
      console.log(`   Total Tasks: ${result.changes.metrics.totalTasks}`);
      console.log(
        `   Completion: ${result.changes.metrics.completionPercentage}%`
      );
    } catch (error) {
      console.error(chalk.red("❌ Manual sync failed:"), error);
      throw error;
    }
  }

  private async manageConfig(options: any): Promise<void> {
    const configPath = options.path || "./pm-integration.json";

    if (options.create) {
      await this.createDefaultConfig(configPath);
    } else if (options.validate) {
      await this.validateConfig(configPath);
    } else {
      console.log(chalk.yellow("Usage:"));
      console.log("  mycontext pm-integration config --create");
      console.log("  mycontext pm-integration config --validate");
      console.log("  mycontext pm-integration config --path <file>");
    }
  }

  private async createDefaultConfig(configPath: string): Promise<void> {
    try {
      // Load template config
      const templatePath = path.join(
        __dirname,
        "../templates/pm-integration-config.json"
      );
      const templateData = fs.readFileSync(templatePath, "utf-8");
      const defaultConfig = JSON.parse(templateData);

      // Remove comments from the config
      const { _comments, ...cleanConfig } = defaultConfig;

      fs.writeFileSync(configPath, JSON.stringify(cleanConfig, null, 2));
      console.log(chalk.green(`✅ Default config created: ${configPath}`));
      console.log(
        chalk.yellow("⚠️  Please edit the config file with your actual values")
      );
      console.log(chalk.gray("   Required: pmEndpoint, apiKey, projectId"));
      console.log(
        chalk.gray(
          "   See template at: src/templates/pm-integration-config.json"
        )
      );
    } catch (error) {
      console.error(chalk.red("❌ Failed to create config file:"), error);
      throw error;
    }
  }

  private async validateConfig(configPath: string): Promise<void> {
    try {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
      }

      const configData = fs.readFileSync(configPath, "utf-8");
      const config: PMIntegrationConfig = JSON.parse(configData);

      // Validate required fields
      const requiredFields = ["pmEndpoint", "apiKey", "projectId"];
      const missingFields = requiredFields.filter(
        (field) => !config[field as keyof PMIntegrationConfig]
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      console.log(chalk.green(`✅ Config file is valid: ${configPath}`));
      console.log(chalk.cyan("📋 Configuration:"));
      console.log(`   PM Endpoint: ${config.pmEndpoint}`);
      console.log(`   Project ID: ${config.projectId}`);
      console.log(`   Sync Interval: ${config.syncInterval} minutes`);
      console.log(
        `   Real-time Sync: ${
          config.enableRealTimeSync ? "Enabled" : "Disabled"
        }`
      );
    } catch (error) {
      console.error(chalk.red("❌ Config validation failed:"), error);
      throw error;
    }
  }

  private async loadConfiguration(
    options: PMIntegrationCommandOptions
  ): Promise<PMIntegrationConfig> {
    let config: PMIntegrationConfig = {};

    // Load from config file if specified
    if (options.config) {
      if (!fs.existsSync(options.config)) {
        throw new Error(`Config file not found: ${options.config}`);
      }

      const configData = fs.readFileSync(options.config, "utf-8");
      config = JSON.parse(configData);
    }

    // Override with command line options
    if (options.pmEndpoint) config.pmEndpoint = options.pmEndpoint;
    if (options.webhookUrl) config.webhookUrl = options.webhookUrl;
    if (options.apiKey) config.apiKey = options.apiKey;
    if (options.projectId) config.projectId = options.projectId;
    if (options.syncInterval) config.syncInterval = options.syncInterval;

    // Set defaults
    config.syncInterval = config.syncInterval || 60;
    config.enableRealTimeSync = config.enableRealTimeSync !== false;

    return config;
  }

  private async startWebhookServer(config: WebhookServerConfig): Promise<void> {
    this.webhookServer = new WebhookServer(config);

    // Set up event handlers
    this.webhookServer.on("webhook_received", (event) => {
      console.log(chalk.blue(`📨 Webhook received: ${event.type}`));

      // Forward to integration service
      if (this.integrationService) {
        this.integrationService.emit("webhook_received", event);
      }
    });

    this.webhookServer.on("error", (error) => {
      console.error(chalk.red("🌐 Webhook server error:"), error);
    });

    await this.webhookServer.start();
  }

  public static getHelpText(): string {
    return `
${chalk.blue.bold("📡 MyContext PM Integration Command")}

${chalk.yellow("Description:")}
  Manage the integration between MyContext CLI and mycontext PM for real-time
  project management and progress synchronization.

${chalk.yellow("Usage:")}
  mycontext pm-integration <command> [options]

${chalk.yellow("Commands:")}
  start                   Start the integration service
  stop                    Stop the integration service
  status                  Show current integration status
  test                    Test connection to mycontext PM
  sync                    Manually sync with mycontext PM
  config                  Manage integration configuration

${chalk.yellow("Global Options:")}
  -c, --config <file>     Path to integration config file
  --pm-endpoint <url>     mycontext PM API endpoint
  --webhook-url <url>     Webhook URL for progress updates
  --api-key <key>         API key for PM authentication
  --project-id <id>       Project ID for integration
  -p, --port <number>     Port for webhook server (default: 8080)
  --enable-webhook-server Enable local webhook server
  --sync-interval <min>   Sync interval in minutes (default: 60)
  --verbose               Enable verbose output

${chalk.yellow("Configuration File:")}
  Create a config file with: \`mycontext pm-integration config --create\`
  Example config file:
  \`\`\`json
  {
    "pmEndpoint": "https://your-pm-instance.com",
    "webhookUrl": "https://your-pm-instance.com/webhook",
    "apiKey": "your-api-key",
    "projectId": "your-project-id",
    "syncInterval": 60,
    "enableRealTimeSync": true
  }
  \`\`\`

${chalk.yellow("Examples:")}
  ${chalk.gray("# Start integration with config file")}
  ${chalk.cyan("mycontext pm-integration start --config ./pm-integration.json")}

  ${chalk.gray("# Start with webhook server")}
  ${chalk.cyan(
    "mycontext pm-integration start --enable-webhook-server --port 8080"
  )}

  ${chalk.gray("# Test connection")}
  ${chalk.cyan(
    "mycontext pm-integration test --pm-endpoint https://pm.example.com"
  )}

  ${chalk.gray("# Manual sync")}
  ${chalk.cyan("mycontext pm-integration sync --project-id my-project")}

  ${chalk.gray("# Show status")}
  ${chalk.cyan("mycontext pm-integration status")}

${chalk.yellow("Integration Features:")}
  • Real-time progress synchronization
  • Webhook-based event handling
  • Automatic retry with exponential backoff
  • Rate limiting protection
  • Authentication and authorization
  • Bidirectional communication
  • Configurable sync intervals
`;
  }
}
