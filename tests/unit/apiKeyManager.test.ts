/**
 * API Key Manager Unit Tests
 *
 * Tests for the secure API key management system
 */

import {
  APIKeyManager,
  apiKeyManager,
  APIKeyConfig,
  APIKeyValidation,
  ProviderConfig,
} from "../../src/utils/apiKeyManager";
import { createError, ErrorType } from "../../src/utils/errorHandler";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

// Mock fetch globally
global.fetch = jest.fn();

describe("APIKeyManager", () => {
  let tempDir: string;
  let originalConfigPath: string;

  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = await (global as any).testUtils.createTempDir();

    // Mock the config path to use temp directory
    originalConfigPath = path.join(os.homedir(), ".mycontext", "api-keys.json");

    // Clear any existing keys
    apiKeyManager["keys"].clear();

    // Mock fetch
    (fetch as jest.Mock).mockClear();
  });

  afterEach(async () => {
    await (global as any).testUtils.cleanupTempDir(tempDir);
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = APIKeyManager.getInstance();
      const instance2 = APIKeyManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("provider initialization", () => {
    it("should initialize supported providers", () => {
      const providers = apiKeyManager.getSupportedProviders();

      expect(providers).toContain("xai");
      expect(providers).toContain("openai");
      expect(providers).toContain("anthropic");
      expect(providers).toContain("google");
    });

    it("should get provider configuration", () => {
      const xaiConfig = apiKeyManager.getProviderConfig("xai");

      expect(xaiConfig).toBeDefined();
      expect(xaiConfig?.name).toBe("xai");
      expect(xaiConfig?.envVar).toBe("XAI_API_KEY");
      expect(xaiConfig?.validationUrl).toBe("https://api.x.ai/v1/models");
    });

    it("should return undefined for unknown provider", () => {
      const config = apiKeyManager.getProviderConfig("unknown");
      expect(config).toBeUndefined();
    });
  });

  describe("key format validation", () => {
    it("should validate XAI key format", async () => {
      const validKey = "xai_" + "a".repeat(50);
      const invalidKey = "invalid_key";

      await expect(
        apiKeyManager.setKey("xai", validKey)
      ).resolves.not.toThrow();
      await expect(apiKeyManager.setKey("xai", invalidKey)).rejects.toThrow();
    });

    it("should validate OpenAI key format", async () => {
      const validKey = "sk-" + "a".repeat(50);
      const invalidKey = "invalid_key";

      await expect(
        apiKeyManager.setKey("openai", validKey)
      ).resolves.not.toThrow();
      await expect(
        apiKeyManager.setKey("openai", invalidKey)
      ).rejects.toThrow();
    });

    it("should validate Anthropic key format", async () => {
      const validKey = "sk-ant-" + "a".repeat(50);
      const invalidKey = "invalid_key";

      await expect(
        apiKeyManager.setKey("anthropic", validKey)
      ).resolves.not.toThrow();
      await expect(
        apiKeyManager.setKey("anthropic", invalidKey)
      ).rejects.toThrow();
    });

    it("should validate Google key format", async () => {
      const validKey = "a".repeat(30);
      const invalidKey = "short";

      await expect(
        apiKeyManager.setKey("google", validKey)
      ).resolves.not.toThrow();
      await expect(
        apiKeyManager.setKey("google", invalidKey)
      ).rejects.toThrow();
    });

    it("should reject empty or too short keys", async () => {
      await expect(apiKeyManager.setKey("xai", "")).rejects.toThrow();
      await expect(apiKeyManager.setKey("xai", "short")).rejects.toThrow();
    });
  });

  describe("key storage and retrieval", () => {
    it("should store and retrieve API key", async () => {
      const testKey = "xai_" + "a".repeat(50);

      await apiKeyManager.setKey("xai", testKey);
      const retrievedKey = await apiKeyManager.getKey("xai");

      expect(retrievedKey).toBe(testKey);
    });

    it("should prioritize environment variables", async () => {
      const envKey = "xai_env_key_" + "a".repeat(50);
      const storedKey = "xai_stored_key_" + "a".repeat(50);

      // Set environment variable
      process.env.XAI_API_KEY = envKey;

      // Set stored key
      await apiKeyManager.setKey("xai", storedKey);

      // Should return environment key
      const retrievedKey = await apiKeyManager.getKey("xai");
      expect(retrievedKey).toBe(envKey);

      // Cleanup
      delete process.env.XAI_API_KEY;
    });

    it("should return null for non-existent key", async () => {
      const key = await apiKeyManager.getKey("nonexistent");
      expect(key).toBeNull();
    });

    it("should update last used timestamp", async () => {
      const testKey = "xai_" + "a".repeat(50);
      await apiKeyManager.setKey("xai", testKey);

      const before = new Date();
      await apiKeyManager.getKey("xai");
      const after = new Date();

      const storedKey = apiKeyManager["keys"].get("xai");
      expect(storedKey?.lastUsed).toBeDefined();

      const lastUsed = new Date(storedKey!.lastUsed!);
      expect(lastUsed.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastUsed.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("key validation", () => {
    it("should validate key format offline", async () => {
      const validKey = "xai_" + "a".repeat(50);
      const validation = await apiKeyManager.validateKey("xai", validKey);

      expect(validation.isValid).toBe(true);
      expect(validation.provider).toBe("xai");
      expect(validation.permissions).toContain("chat:completions");
      expect(validation.rateLimit).toBeDefined();
    });

    it("should validate key with provider API", async () => {
      const validKey = "xai_" + "a".repeat(50);

      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const validation = await apiKeyManager.validateKey("xai", validKey);

      expect(validation.isValid).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/models",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${validKey}`,
          }),
        })
      );
    });

    it("should handle API validation failure", async () => {
      const validKey = "xai_" + "a".repeat(50);

      // Mock failed API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const validation = await apiKeyManager.validateKey("xai", validKey);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Key validation failed");
    });

    it("should handle API validation timeout", async () => {
      const validKey = "xai_" + "a".repeat(50);

      // Mock timeout
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("timeout"));

      const validation = await apiKeyManager.validateKey("xai", validKey);

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain("Validation error");
    });

    it("should return error for missing key", async () => {
      const validation = await apiKeyManager.validateKey("xai");

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("No API key found");
    });

    it("should return error for unknown provider", async () => {
      const validation = await apiKeyManager.validateKey("unknown", "some_key");

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe("Unknown provider");
    });
  });

  describe("key management", () => {
    it("should remove stored key", async () => {
      const testKey = "xai_" + "a".repeat(50);
      await apiKeyManager.setKey("xai", testKey);

      expect(await apiKeyManager.getKey("xai")).toBe(testKey);

      await apiKeyManager.removeKey("xai");
      expect(await apiKeyManager.getKey("xai")).toBeNull();
    });

    it("should list all keys", () => {
      const keys = apiKeyManager.listKeys();

      expect(keys).toBeInstanceOf(Array);
      expect(keys.length).toBeGreaterThan(0);

      const xaiKey = keys.find((k) => k.provider === "xai");
      expect(xaiKey).toBeDefined();
      expect(xaiKey?.hasKey).toBe(false); // No key set initially
      expect(xaiKey?.source).toBe("none");
    });

    it("should clear all keys", async () => {
      const testKey = "xai_" + "a".repeat(50);
      await apiKeyManager.setKey("xai", testKey);

      expect(apiKeyManager["keys"].size).toBe(1);

      await apiKeyManager.clearAllKeys();
      expect(apiKeyManager["keys"].size).toBe(0);
    });
  });

  describe("encryption and storage", () => {
    it("should encrypt and decrypt data", () => {
      const testData = "sensitive data";
      const encrypted = apiKeyManager["encrypt"](testData);
      const decrypted = apiKeyManager["decrypt"](encrypted);

      expect(decrypted).toBe(testData);
      expect(encrypted).not.toBe(testData);
    });

    it("should handle decryption errors", () => {
      expect(() => {
        apiKeyManager["decrypt"]("invalid_encrypted_data");
      }).toThrow("Failed to decrypt API key data");
    });

    it("should save and load keys", async () => {
      const testKey = "xai_" + "a".repeat(50);
      await apiKeyManager.setKey("xai", testKey);

      // Save keys
      await apiKeyManager.saveKeys();

      // Clear in-memory keys
      apiKeyManager["keys"].clear();

      // Load keys
      await apiKeyManager.loadKeys();

      // Verify key was restored
      const retrievedKey = await apiKeyManager.getKey("xai");
      expect(retrievedKey).toBe(testKey);
    });

    it("should handle storage errors gracefully", async () => {
      // Mock fs.writeFile to throw error
      const writeFileSpy = jest
        .spyOn(fs, "writeFile")
        .mockRejectedValue(new Error("Write error") as never);

      await expect(apiKeyManager.saveKeys()).rejects.toThrow();

      // Restore original function
      writeFileSpy.mockRestore();
    });
  });

  describe("backup and restore", () => {
    it("should export keys with password", async () => {
      const testKey = "xai_" + "a".repeat(50);
      await apiKeyManager.setKey("xai", testKey);

      const password = "test_password_123";
      const backup = await apiKeyManager.exportKeys(password);

      expect(backup).toBeDefined();
      expect(typeof backup).toBe("string");

      const backupData = JSON.parse(backup);
      expect(backupData.version).toBe("1.0");
      expect(backupData.data).toBeDefined();
      expect(backupData.timestamp).toBeDefined();
    });

    it("should import keys from backup", async () => {
      const testKey = "xai_" + "a".repeat(50);
      await apiKeyManager.setKey("xai", testKey);

      const password = "test_password_123";
      const backup = await apiKeyManager.exportKeys(password);

      // Clear keys
      apiKeyManager["keys"].clear();

      // Import from backup
      await apiKeyManager.importKeys(backup, password);

      // Verify key was restored
      const retrievedKey = await apiKeyManager.getKey("xai");
      expect(retrievedKey).toBe(testKey);
    });

    it("should reject backup with wrong password", async () => {
      const testKey = "xai_" + "a".repeat(50);
      await apiKeyManager.setKey("xai", testKey);

      const password = "test_password_123";
      const backup = await apiKeyManager.exportKeys(password);

      // Clear keys
      apiKeyManager["keys"].clear();

      // Try to import with wrong password
      await expect(
        apiKeyManager.importKeys(backup, "wrong_password")
      ).rejects.toThrow();
    });

    it("should reject invalid backup format", async () => {
      const invalidBackup = "invalid_json";

      await expect(
        apiKeyManager.importKeys(invalidBackup, "password")
      ).rejects.toThrow();
    });

    it("should reject unsupported backup version", async () => {
      const backup = JSON.stringify({
        version: "2.0",
        data: "encrypted_data",
      });

      await expect(
        apiKeyManager.importKeys(backup, "password")
      ).rejects.toThrow("Unsupported backup version");
    });
  });

  describe("utility functions", () => {
    it("should provide working utility functions", async () => {
      const {
        getAPIKey,
        setAPIKey,
        validateAPIKey,
        removeAPIKey,
        listAPIKeys,
      } = require("../../src/utils/apiKeyManager");

      const testKey = "xai_" + "a".repeat(50);

      // Test setAPIKey
      await setAPIKey("xai", testKey);

      // Test getAPIKey
      const retrievedKey = await getAPIKey("xai");
      expect(retrievedKey).toBe(testKey);

      // Test validateAPIKey
      const validation = await validateAPIKey("xai");
      expect(validation.isValid).toBe(true);

      // Test listAPIKeys
      const keys = listAPIKeys();
      expect(keys).toBeInstanceOf(Array);

      // Test removeAPIKey
      await removeAPIKey("xai");
      const removedKey = await getAPIKey("xai");
      expect(removedKey).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle file system errors", async () => {
      // Mock fs.readFile to throw error
      const readFileSpy = jest
        .spyOn(fs, "readFile")
        .mockRejectedValue(new Error("Read error") as never);

      // Should not throw, just log warning
      await expect(apiKeyManager.loadKeys()).resolves.not.toThrow();

      // Restore original function
      readFileSpy.mockRestore();
    });

    it("should handle invalid JSON in storage", async () => {
      // Mock fs.readFile to return invalid JSON
      const readFileSpy = jest
        .spyOn(fs, "readFile")
        .mockResolvedValue("invalid json" as never);

      // Should not throw, just log warning
      await expect(apiKeyManager.loadKeys()).resolves.not.toThrow();

      // Restore original function
      readFileSpy.mockRestore();
    });
  });
});
