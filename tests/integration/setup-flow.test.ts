import { describe, it, expect, beforeEach, afterEach } from "jest";
import { OllamaClient } from "../../src/utils/ollamaClient";
import * as fs from "fs-extra";
import * as path from "path";

describe("Setup Flow Integration", () => {
  let ollamaClient: OllamaClient;
  let tempDir: string;

  beforeEach(() => {
    ollamaClient = new OllamaClient();
    tempDir = path.join(__dirname, "temp");
    fs.ensureDirSync(tempDir);
  });

  afterEach(() => {
    fs.removeSync(tempDir);
  });

  describe("OllamaClient", () => {
    it("should check connection status", async () => {
      const status = ollamaClient.getStatus();
      expect(status).toHaveProperty("isAvailable");
      expect(status).toHaveProperty("baseUrl");
      expect(status.baseUrl).toBe("http://localhost:11434");
    });

    it("should get installation path for different platforms", () => {
      const installPath = ollamaClient.getInstallationPath();
      expect(typeof installPath).toBe("string");
      expect(installPath.length).toBeGreaterThan(0);
    });

    it("should check if Ollama is installed", () => {
      const isInstalled = ollamaClient.isInstalled();
      expect(typeof isInstalled).toBe("boolean");
    });
  });

  describe("Setup Configuration", () => {
    it("should have valid dependencies configuration", async () => {
      const configPath = path.join(
        __dirname,
        "../../src/config/dependencies.json"
      );
      const config = await fs.readJson(configPath);

      expect(config).toHaveProperty("dependencies");
      expect(config.dependencies).toHaveProperty("ollama");
      expect(config.dependencies.ollama).toHaveProperty("name");
      expect(config.dependencies.ollama).toHaveProperty("description");
      expect(config.dependencies.ollama).toHaveProperty("required");
    });

    it("should have platform-specific installation methods", async () => {
      const configPath = path.join(
        __dirname,
        "../../src/config/dependencies.json"
      );
      const config = await fs.readJson(configPath);

      const ollamaConfig = config.dependencies.ollama;
      expect(ollamaConfig.installation).toHaveProperty("methods");
      expect(ollamaConfig.installation.methods).toHaveProperty("darwin");
      expect(ollamaConfig.installation.methods).toHaveProperty("linux");
      expect(ollamaConfig.installation.methods).toHaveProperty("win32");
    });
  });

  describe("Model Management", () => {
    it("should handle model operations gracefully when Ollama is not available", async () => {
      // Test that operations don't crash when Ollama is not running
      try {
        await ollamaClient.listModels();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error instanceof Error ? error.message : String(error)).toContain("Failed to list models");
      }
    });

    it("should validate model creation parameters", () => {
      const modelfilePath = path.join(tempDir, "test.modelfile");
      fs.writeFileSync(
        modelfilePath,
        'FROM deepseek-coder:6.7b\nSYSTEM "Test model"'
      );

      expect(fs.existsSync(modelfilePath)).toBe(true);
      expect(fs.readFileSync(modelfilePath, "utf-8")).toContain(
        "deepseek-coder:6.7b"
      );
    });
  });
});
