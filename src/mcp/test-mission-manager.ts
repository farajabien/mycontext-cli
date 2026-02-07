/**
 * Test Mission Manager
 *
 * Handles CRUD operations for test missions and execution history.
 * Stores missions in .mycontext/test-missions.json
 */

import * as fs from "fs-extra";
import * as path from "path";
import {
  TestMission,
  TestMissionsStorage,
  TestExecutionResult,
  ValidationRule,
} from "../types/flow-testing";
import { v4 as uuidv4 } from "uuid";

export class TestMissionManager {
  private projectPath: string;
  private storageFile: string;
  private storage: TestMissionsStorage;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.storageFile = path.join(projectPath, ".mycontext", "test-missions.json");
    this.storage = this.loadStorage();
  }

  /**
   * Load test missions from storage
   */
  private loadStorage(): TestMissionsStorage {
    try {
      if (fs.existsSync(this.storageFile)) {
        return fs.readJsonSync(this.storageFile);
      }
    } catch (error) {
      console.warn("Failed to load test missions storage, creating new one");
    }

    // Return default storage structure
    return {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      missions: [],
      executionHistory: [],
    };
  }

  /**
   * Save storage to disk
   */
  private async saveStorage(): Promise<void> {
    this.storage.updatedAt = new Date().toISOString();
    await fs.ensureDir(path.dirname(this.storageFile));
    await fs.writeJson(this.storageFile, this.storage, { spaces: 2 });
  }

  /**
   * Create a new test mission
   */
  async createMission(config: {
    name: string;
    mission: string;
    expectedOutcome: string;
    validationRules?: ValidationRule[];
    startUrl?: string;
    tags?: string[];
  }): Promise<TestMission> {
    const now = new Date().toISOString();

    const newMission: TestMission = {
      id: uuidv4(),
      name: config.name,
      description: config.mission,
      mission: config.mission,
      expectedOutcome: config.expectedOutcome,
      validationRules: config.validationRules || [],
      tags: config.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    this.storage.missions.push(newMission);
    await this.saveStorage();

    return newMission;
  }

  /**
   * Get a mission by ID or name
   */
  async getMission(idOrName: string): Promise<TestMission | null> {
    const mission = this.storage.missions.find(
      (m) => m.id === idOrName || m.name === idOrName
    );
    return mission || null;
  }

  /**
   * List all missions with optional filters
   */
  async listMissions(filters?: {
    status?: "all" | "passing" | "failing";
    tag?: string;
  }): Promise<TestMission[]> {
    let missions = [...this.storage.missions];

    // Filter by tag if specified
    if (filters?.tag) {
      missions = missions.filter(
        (m) => m.tags && m.tags.includes(filters.tag!)
      );
    }

    // Filter by last execution status if specified
    if (filters?.status && filters.status !== "all") {
      missions = missions.filter((m) => {
        const history = this.storage.executionHistory.find(
          (h) => h.missionId === m.id
        );
        if (!history || history.executions.length === 0) return false;

        const lastExecution = history.executions[history.executions.length - 1];
        if (!lastExecution) return false;
        return filters.status === "passing"
          ? lastExecution.status === "passed"
          : lastExecution.status === "failed";
      });
    }

    return missions;
  }

  /**
   * Update a mission
   */
  async updateMission(
    id: string,
    updates: Partial<TestMission>
  ): Promise<TestMission | null> {
    const index = this.storage.missions.findIndex((m) => m.id === id);

    if (index === -1) {
      return null;
    }

    const updated = {
      ...this.storage.missions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.storage.missions[index] = updated as TestMission;
    await this.saveStorage();
    return this.storage.missions[index];
  }

  /**
   * Delete a mission
   */
  async deleteMission(id: string): Promise<boolean> {
    const index = this.storage.missions.findIndex((m) => m.id === id);

    if (index === -1) {
      return false;
    }

    this.storage.missions.splice(index, 1);

    // Also remove execution history
    const historyIndex = this.storage.executionHistory.findIndex(
      (h) => h.missionId === id
    );
    if (historyIndex !== -1) {
      this.storage.executionHistory.splice(historyIndex, 1);
    }

    await this.saveStorage();
    return true;
  }

  /**
   * Save a test execution result
   */
  async saveExecution(result: TestExecutionResult): Promise<void> {
    const historyIndex = this.storage.executionHistory.findIndex(
      (h) => h.missionId === result.missionId
    );

    if (historyIndex === -1) {
      // Create new history entry
      this.storage.executionHistory.push({
        missionId: result.missionId,
        executions: [result],
      });
    } else {
      // Add to existing history
      const history = this.storage.executionHistory[historyIndex];
      if (history) {
        history.executions.push(result);

        // Keep only last 10 executions per mission
        if (history.executions.length > 10) {
          history.executions = history.executions.slice(-10);
        }
      }
    }

    await this.saveStorage();
  }

  /**
   * Get execution history for a mission
   */
  async getExecutionHistory(
    missionId: string
  ): Promise<TestExecutionResult[]> {
    const history = this.storage.executionHistory.find(
      (h) => h.missionId === missionId
    );
    return history ? history.executions : [];
  }

  /**
   * Get a specific execution by ID
   */
  async getExecution(executionId: string): Promise<TestExecutionResult | null> {
    for (const history of this.storage.executionHistory) {
      const execution = history.executions.find(
        (e) => e.executionId === executionId
      );
      if (execution) {
        return execution;
      }
    }
    return null;
  }

  /**
   * Get mission statistics
   */
  async getStatistics(): Promise<{
    totalMissions: number;
    totalExecutions: number;
    passRate: number;
    averageDuration: number;
  }> {
    const totalMissions = this.storage.missions.length;
    const allExecutions = this.storage.executionHistory.flatMap(
      (h) => h.executions
    );
    const totalExecutions = allExecutions.length;

    const passed = allExecutions.filter((e) => e.status === "passed").length;
    const passRate = totalExecutions > 0 ? (passed / totalExecutions) * 100 : 0;

    const durations = allExecutions
      .filter((e) => e.duration)
      .map((e) => e.duration!);
    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    return {
      totalMissions,
      totalExecutions,
      passRate: Math.round(passRate),
      averageDuration: Math.round(averageDuration),
    };
  }

  /**
   * Import missions from MyContext user flows
   */
  async importFromUserFlows(): Promise<TestMission[]> {
    const userFlowsPath = path.join(this.projectPath, ".mycontext", "02-user-flows.md");

    if (!fs.existsSync(userFlowsPath)) {
      throw new Error("User flows file not found: 02-user-flows.md");
    }

    const content = await fs.readFile(userFlowsPath, "utf-8");
    const missions: TestMission[] = [];

    // Simple parser to extract user flows
    // Format: Look for sections with steps
    const flowPattern = /###?\s+(.+)\n([\s\S]+?)(?=###|$)/g;
    let match;

    while ((match = flowPattern.exec(content)) !== null) {
      const [, title, body] = match;

      // Check if this section contains steps
      if (title && body && (body.includes("1.") || body.includes("- "))) {
        const mission = await this.createMission({
          name: title.trim(),
          mission: `Test the flow: ${title.trim()}`,
          expectedOutcome: `User completes the ${title.trim()} flow successfully`,
          tags: ["auto-generated", "from-user-flows"],
        });

        missions.push(mission);
      }
    }

    return missions;
  }
}
