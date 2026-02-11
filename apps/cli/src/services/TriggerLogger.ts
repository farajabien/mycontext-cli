import chalk from "chalk";

export interface TriggerEvent {
  id: string;
  type:
    | "context-change"
    | "schema-change"
    | "component-refinement"
    | "approval-change";
  timestamp: string;
  description: string;
  affectedComponents: string[];
  userAction: string;
  metadata?: Record<string, any>;
}

export interface TriggerLog {
  events: TriggerEvent[];
  lastUpdated: string;
  version: string;
}

export class TriggerLogger {
  private logPath = ".mycontext/trigger-log.json";

  /**
   * Log a trigger event
   */
  async logTrigger(
    type: TriggerEvent["type"],
    description: string,
    affectedComponents: string[],
    userAction: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: TriggerEvent = {
      id: this.generateEventId(),
      type,
      timestamp: new Date().toISOString(),
      description,
      affectedComponents,
      userAction,
      metadata,
    };

    const log = await this.loadLog();
    log.events.push(event);
    log.lastUpdated = new Date().toISOString();

    await this.saveLog(log);
  }

  /**
   * Log context file changes
   */
  async logContextChange(
    changedFiles: string[],
    userAction: string = "Context files updated"
  ): Promise<void> {
    const affectedComponents = await this.getAffectedComponentsFromContext(
      changedFiles
    );

    await this.logTrigger(
      "context-change",
      `Context files changed: ${changedFiles.join(", ")}`,
      affectedComponents,
      userAction,
      { changedFiles }
    );
  }

  /**
   * Log schema changes
   */
  async logSchemaChange(userAction: string = "Schema updated"): Promise<void> {
    const affectedComponents = await this.getAffectedComponentsFromSchema();

    await this.logTrigger(
      "schema-change",
      "InstantDB schema modified",
      affectedComponents,
      userAction,
      { schemaChanged: true }
    );
  }

  /**
   * Log component refinement
   */
  async logComponentRefinement(
    componentName: string,
    refinementType: "in-place" | "context-update",
    userAction: string = "Component refined"
  ): Promise<void> {
    await this.logTrigger(
      "component-refinement",
      `Component ${componentName} refined via ${refinementType}`,
      [componentName],
      userAction,
      { refinementType, componentName }
    );
  }

  /**
   * Log approval changes
   */
  async logApprovalChange(
    featureId: string,
    oldApproval: boolean | null,
    newApproval: boolean | null,
    userAction: string = "Feature approval changed"
  ): Promise<void> {
    const affectedComponents = await this.getAffectedComponentsFromFeature(
      featureId
    );

    await this.logTrigger(
      "approval-change",
      `Feature ${featureId} approval changed from ${oldApproval} to ${newApproval}`,
      affectedComponents,
      userAction,
      { featureId, oldApproval, newApproval }
    );
  }

  /**
   * Get recent trigger events
   */
  async getRecentEvents(limit: number = 10): Promise<TriggerEvent[]> {
    const log = await this.loadLog();
    return log.events
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: TriggerEvent["type"]): Promise<TriggerEvent[]> {
    const log = await this.loadLog();
    return log.events.filter((event) => event.type === type);
  }

  /**
   * Get events affecting a specific component
   */
  async getEventsForComponent(componentName: string): Promise<TriggerEvent[]> {
    const log = await this.loadLog();
    return log.events.filter((event) =>
      event.affectedComponents.includes(componentName)
    );
  }

  /**
   * Check if component needs regeneration based on triggers
   */
  async needsRegeneration(componentName: string): Promise<boolean> {
    const events = await this.getEventsForComponent(componentName);

    // Check if there are any recent trigger events
    const recentEvents = events.filter((event) => {
      const eventTime = new Date(event.timestamp).getTime();
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      return eventTime > oneHourAgo;
    });

    return recentEvents.length > 0;
  }

  /**
   * Get regeneration recommendations
   */
  async getRegenerationRecommendations(): Promise<{
    shouldRegenerate: string[];
    reason: string;
  }> {
    const recentEvents = await this.getRecentEvents(5);
    const shouldRegenerate: string[] = [];
    let reason = "";

    for (const event of recentEvents) {
      if (event.type === "context-change" || event.type === "schema-change") {
        shouldRegenerate.push(...event.affectedComponents);
        reason = `Recent ${event.type} detected`;
      }
    }

    return {
      shouldRegenerate: [...new Set(shouldRegenerate)], // Remove duplicates
      reason,
    };
  }

  /**
   * Clear old events (keep last 50)
   */
  async cleanupOldEvents(): Promise<void> {
    const log = await this.loadLog();
    log.events = log.events
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 50);

    await this.saveLog(log);
  }

  /**
   * Load trigger log from file
   */
  private async loadLog(): Promise<TriggerLog> {
    try {
      const fs = require("fs-extra");
      if (await fs.pathExists(this.logPath)) {
        const content = await fs.readFile(this.logPath, "utf8");
        return JSON.parse(content);
      }
    } catch (error) {
      // If file doesn't exist or is corrupted, return empty log
    }

    return {
      events: [],
      lastUpdated: new Date().toISOString(),
      version: "1.0",
    };
  }

  /**
   * Save trigger log to file
   */
  private async saveLog(log: TriggerLog): Promise<void> {
    const fs = require("fs-extra");
    await fs.ensureDir(".mycontext");
    await fs.writeFile(this.logPath, JSON.stringify(log, null, 2));
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get affected components from context file changes
   */
  private async getAffectedComponentsFromContext(
    changedFiles: string[]
  ): Promise<string[]> {
    // This would analyze which components are affected by context changes
    // For now, return all components if PRD or features files changed
    const criticalFiles = [
      "01a-features.md",
      "01b-user-flows.md",
      "01c-edge-cases.md",
    ];
    const hasCriticalChange = changedFiles.some((file) =>
      criticalFiles.some((critical) => file.includes(critical))
    );

    if (hasCriticalChange) {
      // Return all components - this is a conservative approach
      return await this.getAllComponentNames();
    }

    return [];
  }

  /**
   * Get affected components from schema changes
   */
  private async getAffectedComponentsFromSchema(): Promise<string[]> {
    // Schema changes typically affect all components that use data
    return await this.getAllComponentNames();
  }

  /**
   * Get affected components from feature approval changes
   */
  private async getAffectedComponentsFromFeature(
    featureId: string
  ): Promise<string[]> {
    // Map feature ID to component name
    return [
      featureId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    ];
  }

  /**
   * Get all component names from component list
   */
  private async getAllComponentNames(): Promise<string[]> {
    try {
      const fs = require("fs-extra");
      const componentListPath = ".mycontext/component-list.json";

      if (await fs.pathExists(componentListPath)) {
        const content = await fs.readFile(componentListPath, "utf8");
        const componentList = JSON.parse(content);

        // Extract component names from hierarchical structure
        const names: string[] = [];
        const extractNames = (item: any) => {
          if (item.components) {
            item.components.forEach((comp: any) => names.push(comp.name));
          }
          if (item.children) {
            item.children.forEach(extractNames);
          }
        };

        extractNames(componentList);
        return names;
      }
    } catch (error) {
      // Return empty array if component list not found
    }

    return [];
  }

  /**
   * Display trigger log summary
   */
  async displaySummary(): Promise<void> {
    const recentEvents = await this.getRecentEvents(5);
    const recommendations = await this.getRegenerationRecommendations();

    console.log(chalk.blue("\n📋 Trigger Log Summary"));
    console.log(chalk.gray("Recent events affecting your components:"));

    if (recentEvents.length === 0) {
      console.log(chalk.green("   ✅ No recent trigger events"));
      return;
    }

    recentEvents.forEach((event, index) => {
      const timeAgo = this.getTimeAgo(event.timestamp);
      console.log(chalk.yellow(`   ${index + 1}. ${event.description}`));
      console.log(chalk.gray(`      ${timeAgo} - ${event.userAction}`));
      if (event.affectedComponents.length > 0) {
        console.log(
          chalk.gray(`      Affects: ${event.affectedComponents.join(", ")}`)
        );
      }
    });

    if (recommendations.shouldRegenerate.length > 0) {
      console.log(chalk.yellow(`\n⚠️  ${recommendations.reason}`));
      console.log(
        chalk.blue(
          `   Consider regenerating: ${recommendations.shouldRegenerate.join(
            ", "
          )}`
        )
      );
    }
  }

  /**
   * Get human-readable time ago
   */
  private getTimeAgo(timestamp: string): string {
    const now = new Date().getTime();
    const eventTime = new Date(timestamp).getTime();
    const diffMs = now - eventTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}
