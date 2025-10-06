// PM Integration Service
// Handles communication between mycontext PM and MyContext CLI

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { EventEmitter } from "events";
import chalk from "chalk";
import {
  PMAgentProjectInput,
  PMAgentOutput,
  ProgressSyncRequest,
  ProgressSyncResponse,
  PMIntegrationStatus,
  PMIntegrationError,
  PMIntegrationErrorCodes,
} from "../types/pm-integration";

export interface PMIntegrationConfig {
  pmEndpoint?: string;
  apiKey?: string;
  projectId?: string;
  webhookUrl?: string;
  syncInterval?: number; // minutes
  retryAttempts?: number;
  timeout?: number; // milliseconds
  enableRealTimeSync?: boolean;
}

export interface WebhookEvent {
  type:
    | "progress_update"
    | "task_completed"
    | "phase_completed"
    | "error"
    | "sync_request";
  projectId: string;
  data: any;
  timestamp: string;
}

export class PMIntegrationService extends EventEmitter {
  private config: PMIntegrationConfig;
  private isConnected: boolean = false;
  private lastSyncTimestamp: string = "";
  private syncTimer?: NodeJS.Timeout;

  constructor(config: PMIntegrationConfig = {}) {
    super();
    this.config = {
      syncInterval: 60, // 1 hour default
      retryAttempts: 3,
      timeout: 30000, // 30 seconds
      enableRealTimeSync: true,
      ...config,
    };

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on("webhook_received", this.handleWebhookEvent.bind(this));
    this.on("sync_error", this.handleSyncError.bind(this));
    this.on("connection_lost", this.handleConnectionLost.bind(this));
  }

  // Initialize the integration service
  async initialize(): Promise<void> {
    try {
      console.log(chalk.blue("🔗 Initializing mycontext PM Integration..."));

      if (!this.config.pmEndpoint && !this.config.webhookUrl) {
        throw new PMIntegrationError(
          "PM endpoint or webhook URL is required",
          PMIntegrationErrorCodes.INVALID_PROJECT_ID
        );
      }

      // Test connection
      await this.testConnection();

      this.isConnected = true;

      // Start sync timer if enabled
      if (this.config.enableRealTimeSync && this.config.syncInterval) {
        this.startSyncTimer();
      }

      console.log(chalk.green("✅ PM Integration initialized successfully"));
      this.emit("initialized", this.getStatus());
    } catch (error) {
      console.error(
        chalk.red("❌ Failed to initialize PM integration:"),
        error
      );
      this.emit("initialization_failed", error);
      throw error;
    }
  }

  // Test connection to PM service
  private async testConnection(): Promise<void> {
    if (!this.config.pmEndpoint) return;

    return new Promise((resolve, reject) => {
      const url = new URL(`${this.config.pmEndpoint}/health`);

      const options = {
        method: "GET",
        headers: this.getAuthHeaders(),
        timeout: this.config.timeout,
      };

      const req = (url.protocol === "https:" ? https : http).request(
        url,
        options,
        (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Health check failed: ${res.statusCode}`));
          }
        }
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Connection timeout"));
      });

      req.end();
    });
  }

  // Import project plan from PM
  async importProjectPlan(planPath: string): Promise<PMAgentProjectInput> {
    try {
      console.log(chalk.blue(`📥 Importing project plan from ${planPath}...`));

      if (!fs.existsSync(planPath)) {
        throw new PMIntegrationError(
          `Project plan file not found: ${planPath}`,
          PMIntegrationErrorCodes.INVALID_PLAN_FORMAT
        );
      }

      const planData = fs.readFileSync(planPath, "utf-8");
      const plan: PMAgentProjectInput = JSON.parse(planData);

      // Validate plan structure
      await this.validateProjectPlan(plan);

      console.log(
        chalk.green(`✅ Project plan imported: ${plan.project.name}`)
      );
      this.emit("plan_imported", plan);

      return plan;
    } catch (error) {
      console.error(chalk.red("❌ Failed to import project plan:"), error);
      this.emit("plan_import_failed", error);
      throw error;
    }
  }

  // Export progress to PM
  async exportProgress(
    output: PMAgentOutput,
    webhookUrl?: string
  ): Promise<void> {
    const targetUrl = webhookUrl || this.config.webhookUrl;

    if (!targetUrl) {
      throw new PMIntegrationError(
        "No webhook URL configured for progress export",
        PMIntegrationErrorCodes.SYNC_FAILED
      );
    }

    try {
      console.log(chalk.blue("📤 Exporting progress to mycontext PM..."));

      await this.sendWebhook(targetUrl, {
        type: "progress_update",
        projectId: output.projectId,
        data: output,
        timestamp: new Date().toISOString(),
      });

      this.lastSyncTimestamp = new Date().toISOString();
      console.log(chalk.green("✅ Progress exported successfully"));
      this.emit("progress_exported", output);
    } catch (error) {
      console.error(chalk.red("❌ Failed to export progress:"), error);
      this.emit("progress_export_failed", error);
      throw error;
    }
  }

  // Sync progress with PM (bidirectional)
  async syncProgress(
    request: ProgressSyncRequest
  ): Promise<ProgressSyncResponse> {
    if (!this.config.pmEndpoint) {
      throw new PMIntegrationError(
        "PM endpoint not configured",
        PMIntegrationErrorCodes.SYNC_FAILED
      );
    }

    try {
      console.log(chalk.blue("🔄 Syncing progress with mycontext PM..."));

      const response = await this.makeAuthenticatedRequest(
        `${this.config.pmEndpoint}/api/sync`,
        "POST",
        request
      );

      this.lastSyncTimestamp = new Date().toISOString();
      console.log(chalk.green("✅ Progress sync completed"));
      this.emit("progress_synced", response);

      return response;
    } catch (error) {
      console.error(chalk.red("❌ Progress sync failed:"), error);
      this.emit("progress_sync_failed", error);
      throw error;
    }
  }

  // Send webhook with retry logic
  private async sendWebhook(
    url: string,
    event: WebhookEvent,
    attempt: number = 1
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(event);

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...this.getAuthHeaders(),
        },
        timeout: this.config.timeout,
      };

      const req = (url.startsWith("https:") ? https : http).request(
        url,
        options,
        (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve();
            } else {
              reject(new Error(`Webhook failed: ${res.statusCode} ${data}`));
            }
          });
        }
      );

      req.on("error", reject);

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Webhook timeout"));
      });

      req.write(payload);
      req.end();
    });
  }

  // Make authenticated HTTP request
  private async makeAuthenticatedRequest(
    url: string,
    method: string = "GET",
    data?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : undefined;

      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
          ...(payload && { "Content-Length": Buffer.byteLength(payload) }),
        },
        timeout: this.config.timeout,
      };

      const req = (url.startsWith("https:") ? https : http).request(
        url,
        options,
        (res) => {
          let responseData = "";

          res.on("data", (chunk) => {
            responseData += chunk;
          });

          res.on("end", () => {
            try {
              if (
                res.statusCode &&
                res.statusCode >= 200 &&
                res.statusCode < 300
              ) {
                const result = responseData ? JSON.parse(responseData) : {};
                resolve(result);
              } else {
                reject(
                  new Error(`Request failed: ${res.statusCode} ${responseData}`)
                );
              }
            } catch (error) {
              reject(new Error(`Invalid response: ${error}`));
            }
          });
        }
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  // Get authentication headers
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  // Validate project plan structure
  private async validateProjectPlan(plan: PMAgentProjectInput): Promise<void> {
    if (!plan.project || !plan.project.name || !plan.project.description) {
      throw new PMIntegrationError(
        "Invalid project plan: missing required project fields",
        PMIntegrationErrorCodes.PLAN_VALIDATION_FAILED
      );
    }

    if (!plan.myContext || !plan.myContext.framework) {
      throw new PMIntegrationError(
        "Invalid project plan: missing MyContext configuration",
        PMIntegrationErrorCodes.PLAN_VALIDATION_FAILED
      );
    }

    // Validate framework compatibility
    const supportedFrameworks = ["nextjs", "react", "vue", "angular"];
    if (!supportedFrameworks.includes(plan.myContext.framework)) {
      throw new PMIntegrationError(
        `Unsupported framework: ${plan.myContext.framework}`,
        PMIntegrationErrorCodes.PLAN_VALIDATION_FAILED
      );
    }

    // Validate architecture compatibility
    const supportedArchitectures = [
      "nextjs-app-router",
      "nextjs-pages",
      "react-spa",
    ];
    if (
      plan.myContext.architecture &&
      !supportedArchitectures.includes(plan.myContext.architecture)
    ) {
      throw new PMIntegrationError(
        `Unsupported architecture: ${plan.myContext.architecture}`,
        PMIntegrationErrorCodes.PLAN_VALIDATION_FAILED
      );
    }
  }

  // Start periodic sync timer
  private startSyncTimer(): void {
    if (!this.config.syncInterval) return;

    const intervalMs = this.config.syncInterval * 60 * 1000; // Convert minutes to milliseconds

    this.syncTimer = setInterval(async () => {
      try {
        if (this.config.projectId) {
          await this.syncProgress({
            projectId: this.config.projectId,
            syncTimestamp: this.lastSyncTimestamp,
            includeTasks: true,
            includeComponents: true,
            includeMetrics: true,
          });
        }
      } catch (error) {
        console.warn(chalk.yellow("⚠️  Periodic sync failed:"), error);
      }
    }, intervalMs);

    console.log(
      chalk.gray(
        `⏰ Periodic sync enabled (${this.config.syncInterval} minutes)`
      )
    );
  }

  // Event handlers
  private handleWebhookEvent(event: WebhookEvent): void {
    console.log(chalk.blue(`📨 Received webhook event: ${event.type}`));

    switch (event.type) {
      case "sync_request":
        this.handleSyncRequest(event);
        break;
      case "error":
        this.handleRemoteError(event);
        break;
      default:
        this.emit("webhook_event", event);
    }
  }

  private handleSyncRequest(event: WebhookEvent): void {
    // Respond to sync requests from PM
    if (event.data.requestId) {
      this.emit("sync_requested", event);
    }
  }

  private handleRemoteError(event: WebhookEvent): void {
    console.error(chalk.red("🚨 Remote PM error:"), event.data);
    this.emit("remote_error", event.data);
  }

  private handleSyncError(error: Error): void {
    console.error(chalk.red("🔄 Sync error:"), error);
    this.isConnected = false;
    this.emit("connection_lost");
  }

  private handleConnectionLost(): void {
    console.warn(
      chalk.yellow("⚠️  Connection to PM lost, attempting to reconnect...")
    );

    // Attempt to reconnect after a delay
    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        console.error(chalk.red("❌ Reconnection failed:"), error);
      }
    }, 5000);
  }

  // Public API methods
  getStatus(): PMIntegrationStatus {
    return {
      connected: this.isConnected,
      lastSync: this.lastSyncTimestamp,
      projectId: this.config.projectId,
      pendingUpdates: 0,
    };
  }

  updateConfig(newConfig: Partial<PMIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart sync timer if interval changed
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.startSyncTimer();
    }
  }

  disconnect(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.isConnected = false;
    this.emit("disconnected");
  }

  // Utility method to create integration from config file
  static fromConfigFile(configPath: string): PMIntegrationService {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const configData = fs.readFileSync(configPath, "utf-8");
    const config: PMIntegrationConfig = JSON.parse(configData);

    return new PMIntegrationService(config);
  }
}
