/**
 * Jest Test Setup
 *
 * Global configuration and utilities for testing MyContext CLI
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Store original process.cwd and process.chdir for restoration
const originalCwd = process.cwd();
const originalChdir = process.chdir;

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toContainFiles(files: string[]): R;
      toBeValidJSON(): R;
      toHaveValidStructure(structure: Record<string, any>): R;
    }
  }

  var testUtils: {
    createTempDir(): Promise<string>;
    cleanupTempDir(dir: string): Promise<void>;
    createMockProject(dir: string, config?: Record<string, any>): Promise<void>;
    mockConsole(): {
      restore: () => void;
      logs: string[];
      warns: string[];
      errors: string[];
    };
    restoreConsole(): void;
    getFixturePath(name: string): string;
    loadFixture(name: string): Promise<any>;
  };
}

// Extend Jest matchers
expect.extend({
  toContainFiles(received: string, files: string[]) {
    const missing: string[] = [];

    for (const file of files) {
      const filePath = path.join(received, file);
      if (!fs.existsSync(filePath)) {
        missing.push(file);
      }
    }

    if (missing.length === 0) {
      return {
        message: () =>
          `Expected directory ${received} not to contain files: ${files.join(", ")}`,
        pass: true,
      };
    }

    return {
      message: () =>
        `Expected directory ${received} to contain files: ${missing.join(", ")}`,
      pass: false,
    };
  },

  toBeValidJSON(received: string) {
    try {
      JSON.parse(received);
      return {
        message: () => `Expected string not to be valid JSON`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () =>
          `Expected string to be valid JSON, but got error: ${error}`,
        pass: false,
      };
    }
  },

  toHaveValidStructure(received: any, structure: Record<string, any>) {
    const errors: string[] = [];

    function validateStructure(obj: any, struct: any, path = ""): void {
      for (const [key, expectedType] of Object.entries(struct)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in obj)) {
          errors.push(`Missing property: ${currentPath}`);
          continue;
        }

        const actualValue = obj[key];

        if (typeof expectedType === "string") {
          if (typeof actualValue !== expectedType) {
            errors.push(
              `Property ${currentPath} should be ${expectedType}, got ${typeof actualValue}`
            );
          }
        } else if (typeof expectedType === "object" && expectedType !== null) {
          if (typeof actualValue === "object" && actualValue !== null) {
            validateStructure(actualValue, expectedType, currentPath);
          } else {
            errors.push(
              `Property ${currentPath} should be an object, got ${typeof actualValue}`
            );
          }
        }
      }
    }

    validateStructure(received, structure);

    if (errors.length === 0) {
      return {
        message: () => `Expected object not to have valid structure`,
        pass: true,
      };
    }

    return {
      message: () =>
        `Expected object to have valid structure, but found errors:\n${errors.join("\n")}`,
      pass: false,
    };
  },
});

// Global test utilities
global.testUtils = {
  async createTempDir(): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mycontext-test-"));
    return tempDir;
  },

  async cleanupTempDir(dir: string): Promise<void> {
    try {
      if (await fs.pathExists(dir)) {
        await fs.remove(dir);
      }
    } catch (error) {
      console.warn("Failed to cleanup temp dir:", error);
    }
  },

  async createMockProject(dir: string, config = {}): Promise<void> {
    // Create basic project structure
    await fs.ensureDir(dir);
    await fs.ensureDir(path.join(dir, ".mycontext"));
    await fs.ensureDir(path.join(dir, "context"));

    // Write config file
    const defaultConfig = {
      name: "test-project",
      description: "Test project for CLI testing",
      version: "1.0.0",
      created: new Date().toISOString(),
      ...config,
    };

    await fs.writeJson(
      path.join(dir, ".mycontext", "config.json"),
      defaultConfig,
      { spaces: 2 }
    );

    // Create basic context files
    await fs.writeFile(
      path.join(dir, "context", "prd.md"),
      "# Test Project\n\nTest PRD content"
    );
  },

  mockConsole() {
    const logs: string[] = [];
    const warns: string[] = [];
    const errors: string[] = [];

    console.log = (...args) => logs.push(args.join(" "));
    console.warn = (...args) => warns.push(args.join(" "));
    console.error = (...args) => errors.push(args.join(" "));

    return {
      restore: () => {
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
      },
      logs,
      warns,
      errors,
    };
  },

  restoreConsole() {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  },

  getFixturePath(name: string): string {
    return path.join(__dirname, "fixtures", name);
  },

  async loadFixture(name: string): Promise<any> {
    const fixturePath = this.getFixturePath(name);

    if (name.endsWith(".json")) {
      return fs.readJson(fixturePath);
    }

    return fs.readFile(fixturePath, "utf-8");
  },
};

// Mock fetch globally if not available
if (typeof global.fetch === "undefined") {
  global.fetch = jest.fn();
}

// Global setup
beforeEach(() => {
  // Clear any environment variables that might affect tests
  delete process.env.MYCONTEXT_API_KEY;
  delete process.env.MYCONTEXT_API_ENDPOINT;
  delete process.env.XAI_API_KEY;

  // Reset working directory
  process.chdir(originalCwd);
});

afterEach(() => {
  // Restore console
  global.testUtils.restoreConsole();

  // Restore working directory
  process.chdir(originalCwd);
});

// Global teardown
afterAll(() => {
  // Restore all original functions
  process.chdir = originalChdir;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
