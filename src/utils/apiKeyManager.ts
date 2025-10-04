/**
 * Secure API Key Management System for MyContext CLI
 *
 * Handles storage, validation, and secure access to API keys for multiple AI providers.
 * Supports environment variables, encrypted local storage, and secure key rotation.
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { createError, ErrorType } from "./errorHandler";
import { logger } from "./logger";

export interface APIKeyConfig {
  provider: string;
  key: string;
  environment?: string;
  createdAt: string;
  lastUsed?: string;
  isValid?: boolean;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface APIKeyValidation {
  isValid: boolean;
  provider: string;
  permissions?: string[];
  rateLimit?: {
    requests: number;
    window: number;
    resetTime?: string;
  };
  error?: string;
}

export interface ProviderConfig {
  name: string;
  envVar: string;
  validationUrl?: string;
  requiredPermissions?: string[];
  rateLimits?: {
    requests: number;
    window: number; // seconds
  };
}

export class APIKeyManager {
  private static instance: APIKeyManager;
  private keys: Map<string, APIKeyConfig> = new Map();
  private configPath: string;
  private encryptionKey: string;
  private providers: Map<string, ProviderConfig> = new Map();

  private constructor() {
    this.configPath = path.join(os.homedir(), ".mycontext", "api-keys.json");
    this.encryptionKey = this.getEncryptionKey();
    this.initializeProviders();
  }

  public static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  /**
   * Initialize supported AI providers
   */
  private initializeProviders(): void {
    const providers: ProviderConfig[] = [
      {
        name: "qwen",
        envVar: "MYCONTEXT_QWEN_API_KEY",
        validationUrl: "https://openrouter.ai/api/v1/models",
        requiredPermissions: ["chat:completions"],
        rateLimits: { requests: 1000, window: 3600 },
      },
      {
        name: "xai",
        envVar: "XAI_API_KEY",
        validationUrl: "https://api.x.ai/v1/models",
        requiredPermissions: ["chat:completions"],
        rateLimits: { requests: 100, window: 3600 },
      },
      {
        name: "openai",
        envVar: "OPENAI_API_KEY",
        validationUrl: "https://api.openai.com/v1/models",
        requiredPermissions: ["chat:completions"],
        rateLimits: { requests: 3000, window: 3600 },
      },
      {
        name: "anthropic",
        envVar: "ANTHROPIC_API_KEY",
        validationUrl: "https://api.anthropic.com/v1/models",
        requiredPermissions: ["messages"],
        rateLimits: { requests: 100, window: 3600 },
      },
      {
        name: "google",
        envVar: "GOOGLE_API_KEY",
        validationUrl:
          "https://generativelanguage.googleapis.com/v1beta/models",
        requiredPermissions: ["generateContent"],
        rateLimits: { requests: 1000, window: 3600 },
      },
    ];

    providers.forEach((provider) => {
      this.providers.set(provider.name, provider);
    });
  }

  /**
   * Get or generate encryption key for secure storage
   */
  private getEncryptionKey(): string {
    const keyPath = path.join(os.homedir(), ".mycontext", ".encryption-key");

    try {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, "utf-8");
      }
    } catch (error) {
      logger.verbose("Could not read existing encryption key:", error);
    }

    // Generate new encryption key
    const newKey = crypto.randomBytes(32).toString("hex");

    try {
      fs.ensureDirSync(path.dirname(keyPath));
      fs.writeFileSync(keyPath, newKey, { mode: 0o600 }); // Read/write for owner only
      return newKey;
    } catch (error) {
      logger.verbose("Could not save encryption key, using fallback:", error);
      // Fallback to environment-based key
      return (
        process.env.MYCONTEXT_ENCRYPTION_KEY ||
        crypto.randomBytes(32).toString("hex")
      );
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    // Use PBKDF2 to derive a key from the encryption key
    const key = crypto.pbkdf2Sync(this.encryptionKey, iv, 100000, 32, "sha256");
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedData: string): string {
    try {
      const [ivHex, encrypted] = encryptedData.split(":");
      const iv = Buffer.from(ivHex, "hex");
      // Use PBKDF2 to derive the same key from the encryption key
      const key = crypto.pbkdf2Sync(
        this.encryptionKey,
        iv,
        100000,
        32,
        "sha256"
      );
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      throw new Error("Failed to decrypt API key data");
    }
  }

  /**
   * Load API keys from secure storage
   */
  async loadKeys(): Promise<void> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return;
      }

      const encryptedData = await fs.readFile(this.configPath, "utf-8");
      const decryptedData = this.decrypt(encryptedData);
      const keysData = JSON.parse(decryptedData);

      this.keys.clear();
      Object.entries(keysData).forEach(([provider, config]) => {
        this.keys.set(provider, config as APIKeyConfig);
      });

      logger.verbose(`Loaded ${this.keys.size} API keys from secure storage`);
    } catch (error) {
      logger.verbose("Failed to load API keys from storage:", error);
      // Continue with environment variables only
    }
  }

  /**
   * Save API keys to secure storage
   */
  async saveKeys(): Promise<void> {
    try {
      const keysData: Record<string, APIKeyConfig> = {};
      this.keys.forEach((config, provider) => {
        keysData[provider] = config;
      });

      const jsonData = JSON.stringify(keysData, null, 2);
      const encryptedData = this.encrypt(jsonData);

      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeFile(this.configPath, encryptedData, { mode: 0o600 });

      logger.verbose(`Saved ${this.keys.size} API keys to secure storage`);
    } catch (error) {
      throw createError(
        error,
        { operation: "save_api_keys" },
        ErrorType.FILE_SYSTEM_ERROR
      );
    }
  }

  /**
   * Get API key for a provider
   */
  async getKey(provider: string): Promise<string | null> {
    // Check environment variables first
    const envKey = this.getKeyFromEnvironment(provider);
    if (envKey) {
      return envKey;
    }

    // Check stored keys
    const storedKey = this.keys.get(provider);
    if (storedKey?.key) {
      // Update last used timestamp
      storedKey.lastUsed = new Date().toISOString();
      await this.saveKeys();
      return storedKey.key;
    }

    return null;
  }

  /**
   * Get API key from environment variables
   */
  private getKeyFromEnvironment(provider: string): string | null {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      return null;
    }

    return process.env[providerConfig.envVar] || null;
  }

  /**
   * Set API key for a provider
   */
  async setKey(
    provider: string,
    key: string,
    options: Partial<APIKeyConfig> = {}
  ): Promise<void> {
    // Validate the key format
    if (!this.validateKeyFormat(provider, key)) {
      throw createError(
        new Error(`Invalid API key format for ${provider}`),
        { operation: "set_api_key", provider },
        ErrorType.VALIDATION_ERROR
      );
    }

    const config: APIKeyConfig = {
      provider,
      key,
      createdAt: new Date().toISOString(),
      isValid: true,
      ...options,
    };

    this.keys.set(provider, config);
    await this.saveKeys();

    logger.success(`API key set for ${provider}`);
  }

  /**
   * Validate API key format
   */
  private validateKeyFormat(provider: string, key: string): boolean {
    if (!key || typeof key !== "string" || key.length < 10) {
      return false;
    }

    // Provider-specific validation
    switch (provider) {
      case "xai":
        return key.startsWith("xai_") && key.length >= 50;
      case "openai":
        return key.startsWith("sk-") && key.length >= 50;
      case "anthropic":
        return key.startsWith("sk-ant-") && key.length >= 50;
      case "google":
        return key.length >= 30; // Google API keys vary in format
      default:
        return key.length >= 20; // Generic minimum
    }
  }

  /**
   * Validate API key with provider
   */
  async validateKey(provider: string, key?: string): Promise<APIKeyValidation> {
    const apiKey = key || (await this.getKey(provider));

    if (!apiKey) {
      return {
        isValid: false,
        provider,
        error: "No API key found",
      };
    }

    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      return {
        isValid: false,
        provider,
        error: "Unknown provider",
      };
    }

    // Basic format validation
    if (!this.validateKeyFormat(provider, apiKey)) {
      return {
        isValid: false,
        provider,
        error: "Invalid key format",
      };
    }

    // Online validation if URL is provided
    if (providerConfig.validationUrl) {
      try {
        const isValid = await this.validateWithProvider(
          provider,
          apiKey,
          providerConfig.validationUrl
        );
        return {
          isValid,
          provider,
          permissions: providerConfig.requiredPermissions,
          rateLimit: providerConfig.rateLimits,
          error: isValid ? undefined : "Key validation failed",
        };
      } catch (error) {
        return {
          isValid: false,
          provider,
          error: `Validation error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    }

    // Offline validation only
    return {
      isValid: true,
      provider,
      permissions: providerConfig.requiredPermissions,
      rateLimit: providerConfig.rateLimits,
    };
  }

  /**
   * Validate API key with provider's API
   */
  private async validateWithProvider(
    provider: string,
    key: string,
    validationUrl: string
  ): Promise<boolean> {
    try {
      const response = await fetch(validationUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          "User-Agent": "MyContext-CLI/1.0.0",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      return response.ok;
    } catch (error) {
      logger.verbose(`Failed to validate ${provider} API key:`, error);
      return false;
    }
  }

  /**
   * Remove API key for a provider
   */
  async removeKey(provider: string): Promise<void> {
    if (this.keys.has(provider)) {
      this.keys.delete(provider);
      await this.saveKeys();
      logger.success(`API key removed for ${provider}`);
    } else {
      logger.info(`No stored API key found for ${provider}`);
    }
  }

  /**
   * List all configured API keys
   */
  listKeys(): Array<{
    provider: string;
    hasKey: boolean;
    source: "environment" | "storage" | "none";
  }> {
    const result: Array<{
      provider: string;
      hasKey: boolean;
      source: "environment" | "storage" | "none";
    }> = [];

    this.providers.forEach((config, provider) => {
      const envKey = this.getKeyFromEnvironment(provider);
      const storedKey = this.keys.get(provider);

      let source: "environment" | "storage" | "none" = "none";
      let hasKey = false;

      if (envKey) {
        source = "environment";
        hasKey = true;
      } else if (storedKey?.key) {
        source = "storage";
        hasKey = true;
      }

      result.push({ provider, hasKey, source });
    });

    return result;
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider: string): ProviderConfig | undefined {
    return this.providers.get(provider);
  }

  /**
   * List all supported providers
   */
  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear all stored API keys
   */
  async clearAllKeys(): Promise<void> {
    this.keys.clear();
    await this.saveKeys();
    logger.success("All stored API keys cleared");
  }

  /**
   * Export API keys (for backup purposes)
   */
  async exportKeys(password: string): Promise<string> {
    const keysData: Record<string, APIKeyConfig> = {};
    this.keys.forEach((config, provider) => {
      keysData[provider] = config;
    });

    const jsonData = JSON.stringify(keysData, null, 2);
    const encryptedData = this.encrypt(jsonData);

    // Additional encryption with user password
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(encryptedData, "utf8", "hex");
    encrypted += cipher.final("hex");
    encrypted =
      salt.toString("hex") + ":" + iv.toString("hex") + ":" + encrypted;

    return JSON.stringify({
      version: "1.0",
      salt: salt.toString("hex"),
      data: encrypted,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Import API keys from backup
   */
  async importKeys(backupData: string, password: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);

      if (backup.version !== "1.0") {
        throw new Error("Unsupported backup version");
      }

      // Decrypt with user password
      const [saltHex, ivHex, encrypted] = backup.data.split(":");
      const salt = Buffer.from(saltHex, "hex");
      const iv = Buffer.from(ivHex, "hex");
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      // Decrypt with internal key
      const keysData = JSON.parse(this.decrypt(decrypted));

      // Validate and import keys
      for (const [provider, config] of Object.entries(keysData)) {
        if (this.validateKeyFormat(provider, (config as APIKeyConfig).key)) {
          this.keys.set(provider, config as APIKeyConfig);
        }
      }

      await this.saveKeys();
      logger.success(
        `Imported ${Object.keys(keysData).length} API keys from backup`
      );
    } catch (error) {
      throw createError(
        error,
        { operation: "import_api_keys" },
        ErrorType.VALIDATION_ERROR
      );
    }
  }
}

// Export singleton instance
export const apiKeyManager = APIKeyManager.getInstance();

// Utility functions
export const getAPIKey = (provider: string) => apiKeyManager.getKey(provider);
export const setAPIKey = (
  provider: string,
  key: string,
  options?: Partial<APIKeyConfig>
) => apiKeyManager.setKey(provider, key, options);
export const validateAPIKey = (provider: string, key?: string) =>
  apiKeyManager.validateKey(provider, key);
export const removeAPIKey = (provider: string) =>
  apiKeyManager.removeKey(provider);
export const listAPIKeys = () => apiKeyManager.listKeys();
