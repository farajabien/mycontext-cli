// Webhook Server for mycontext PM Integration
// Handles incoming webhook requests from mycontext PM

import http from "http";
import https from "https";
import { EventEmitter } from "events";
import chalk from "chalk";
import {
  WebhookEvent,
  PMIntegrationError,
  PMIntegrationErrorCodes,
} from "../types/pm-integration";

export interface WebhookServerConfig {
  port: number;
  host?: string;
  ssl?: {
    key: string;
    cert: string;
  };
  authToken?: string;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export class WebhookServer extends EventEmitter {
  private server?: http.Server | https.Server;
  private config: WebhookServerConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor(config: WebhookServerConfig) {
    super();
    this.config = {
      host: "localhost",
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
      },
      ...config,
    };
  }

  // Start the webhook server
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const serverOptions = this.config.ssl
          ? {
              key: this.config.ssl.key,
              cert: this.config.ssl.cert,
            }
          : {};

        this.server = this.config.ssl
          ? https.createServer(serverOptions, this.handleRequest.bind(this))
          : http.createServer(this.handleRequest.bind(this));

        this.server.listen(this.config.port, this.config.host, () => {
          const protocol = this.config.ssl ? "https" : "http";
          const url = `${protocol}://${this.config.host}:${this.config.port}`;
          console.log(chalk.green(`🚀 Webhook server started at ${url}`));
          console.log(
            chalk.gray(
              `   Rate limit: ${this.config.rateLimit?.maxRequests} requests per ${this.config.rateLimit?.windowMs}ms`
            )
          );
          this.emit("started", url);
          resolve();
        });

        this.server.on("error", (error) => {
          console.error(chalk.red("❌ Webhook server error:"), error);
          this.emit("error", error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop the webhook server
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(chalk.blue("🛑 Webhook server stopped"));
          this.emit("stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Handle incoming HTTP requests
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const clientIP = this.getClientIP(req);
    const now = Date.now();

    try {
      // Rate limiting
      if (!this.checkRateLimit(clientIP, now)) {
        this.sendError(res, 429, "Rate limit exceeded");
        return;
      }

      // Health check endpoint
      if (req.url === "/health" && req.method === "GET") {
        this.handleHealthCheck(res);
        return;
      }

      // Webhook endpoint
      if (req.url === "/webhook" && req.method === "POST") {
        await this.handleWebhook(req, res);
        return;
      }

      // Unknown endpoint
      this.sendError(res, 404, "Endpoint not found");
    } catch (error) {
      console.error(chalk.red("❌ Webhook request error:"), error);
      this.sendError(res, 500, "Internal server error");
    }
  }

  // Handle health check requests
  private handleHealthCheck(res: http.ServerResponse): void {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.version,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(healthData));
  }

  // Handle webhook requests
  private async handleWebhook(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    // Authenticate request
    if (!this.authenticateRequest(req)) {
      this.sendError(res, 401, "Unauthorized");
      return;
    }

    // Parse request body
    const body = await this.parseRequestBody(req);
    const event: WebhookEvent = body;

    // Validate webhook event
    if (!this.validateWebhookEvent(event)) {
      this.sendError(res, 400, "Invalid webhook event");
      return;
    }

    console.log(
      chalk.blue(
        `📨 Received webhook: ${event.type} for project ${event.projectId}`
      )
    );

    // Emit event for processing
    this.emit("webhook_received", event);

    // Send success response
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "received",
        eventId: event.timestamp,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // Authenticate incoming requests
  private authenticateRequest(req: http.IncomingMessage): boolean {
    if (!this.config.authToken) {
      return true; // No auth required
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return false;
    }

    const token = authHeader.replace("Bearer ", "");
    return token === this.config.authToken;
  }

  // Validate webhook event structure
  private validateWebhookEvent(event: any): event is WebhookEvent {
    return (
      event &&
      typeof event.type === "string" &&
      typeof event.projectId === "string" &&
      typeof event.timestamp === "string" &&
      event.data !== undefined
    );
  }

  // Parse JSON request body
  private parseRequestBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (error) {
          reject(new Error("Invalid JSON"));
        }
      });

      req.on("error", reject);
    });
  }

  // Check rate limiting
  private checkRateLimit(clientIP: string, now: number): boolean {
    const rateLimit = this.config.rateLimit;
    if (!rateLimit) return true;

    const clientData = this.requestCounts.get(clientIP);

    if (!clientData || now > clientData.resetTime) {
      // Reset or new client
      this.requestCounts.set(clientIP, {
        count: 1,
        resetTime: now + rateLimit.windowMs,
      });
      return true;
    }

    if (clientData.count >= rateLimit.maxRequests) {
      return false;
    }

    clientData.count++;
    return true;
  }

  // Get client IP address
  private getClientIP(req: http.IncomingMessage): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded && typeof forwarded === "string") {
      return forwarded.split(",")[0]?.trim() || "unknown";
    }

    const realIP = req.headers["x-real-ip"];
    if (realIP && typeof realIP === "string") {
      return realIP;
    }

    return req.socket?.remoteAddress || "unknown";
  }

  // Send error response
  private sendError(
    res: http.ServerResponse,
    statusCode: number,
    message: string
  ): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: message,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // Get server status
  getStatus(): { running: boolean; url?: string; connections: number } {
    const running = this.server?.listening || false;
    const url = running
      ? `${this.config.ssl ? "https" : "http"}://${this.config.host}:${
          this.config.port
        }`
      : undefined;

    return {
      running,
      url,
      connections: this.requestCounts.size,
    };
  }
}
