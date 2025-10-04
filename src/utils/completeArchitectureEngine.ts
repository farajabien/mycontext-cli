import {
  EnhancedComponent,
  CompleteGenerationItem,
  ComponentReference,
  RouteDefinition,
  ActionDefinition,
  ServerActionDefinition,
  CompleteArchitecturePlan,
  ComponentDocumentation,
} from "../types";
import { ServerActionGenerator } from "./serverActionGenerator";
import { RouteGenerator } from "./routeGenerator";

/**
 * Complete Architecture Engine
 * Orchestrates full-stack application generation with actions, routes, and self-documentation
 */
export class CompleteArchitectureEngine {
  private serverActionGenerator: ServerActionGenerator;
  private routeGenerator: RouteGenerator;

  constructor() {
    this.serverActionGenerator = new ServerActionGenerator();
    this.routeGenerator = new RouteGenerator();
  }

  /**
   * Build complete generation queue with actions, routes, and documentation
   */
  async buildCompleteGenerationQueue(
    rootComponent: EnhancedComponent
  ): Promise<CompleteGenerationItem[]> {
    const queue: CompleteGenerationItem[] = [];
    const visited = new Set<string>();

    await this.processComponent(
      rootComponent,
      0,
      [],
      [],
      [],
      queue,
      visited
    );

    // Sort by generation order (dependencies first)
    return queue.sort((a, b) => a.generationOrder - b.generationOrder);
  }

  /**
   * Process component recursively
   */
  private async processComponent(
    component: EnhancedComponent,
    level: number,
    dependencies: ComponentReference[],
    inheritedRoutes: RouteDefinition[],
    inheritedActions: ActionDefinition[],
    queue: CompleteGenerationItem[],
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(component.name)) return;

    visited.add(component.name);

    // Generate component-specific server actions
    const serverActions = await this.serverActionGenerator.generateServerActions(
      component
    );

    // Generate component-specific routes
    const componentRoutes = await this.routeGenerator.generateRoutes(
      component,
      level,
      this.getParentPath(dependencies)
    );

    // Generate client actions that connect to server actions
    const clientActions = this.serverActionGenerator.generateClientActions(
      component,
      serverActions
    );

    // Combine all actions
    const allActions = [...inheritedActions, ...clientActions, ...(component.actions || [])];
    const allRoutes = [...inheritedRoutes, ...componentRoutes];

    // Generate self-documentation
    const selfDocumentation = this.generateCompleteSelfDocumentation(
      component,
      level,
      dependencies,
      allActions,
      allRoutes,
      serverActions
    );

    // Add to generation queue
    queue.push({
      component,
      level,
      dependencies: [...dependencies],
      routes: allRoutes,
      actions: allActions,
      serverActions,
      generationOrder: this.calculateGenerationOrder(component, dependencies),
      selfDocumentation,
    });

    // Process children with inherited context
    if (component.children) {
      for (const [name, child] of Object.entries(component.children)) {
        const childDependencies: ComponentReference[] = [
          ...dependencies,
          { name: component.name, level, relationship: "parent" },
        ];

        await this.processComponent(
          child,
          level + 1,
          childDependencies,
          allRoutes,
          allActions,
          queue,
          visited
        );
      }
    }
  }

  /**
   * Generate complete self-documentation for component
   */
  private generateCompleteSelfDocumentation(
    component: EnhancedComponent,
    level: number,
    dependencies: ComponentReference[],
    actions: ActionDefinition[],
    routes: RouteDefinition[],
    serverActions: ServerActionDefinition[]
  ): string {
    const doc: ComponentDocumentation = {
      purpose: component.description || `${component.name} component`,
      userExpectations: this.generateUserExpectations(component, level),
      integrationNotes: this.generateIntegrationNotes(
        component,
        dependencies,
        actions,
        serverActions
      ),
      dataFlow: this.generateDataFlow(component, dependencies, actions, serverActions),
      usageExample: this.generateUsageExample(component, actions),
      dependencies: dependencies,
      relatedActions: actions.map((a) => a.name),
      relatedRoutes: routes.map((r) => r.path),
    };

    return this.formatDocumentation(component, level, doc, serverActions);
  }

  /**
   * Format complete documentation string
   */
  private formatDocumentation(
    component: EnhancedComponent,
    level: number,
    doc: ComponentDocumentation,
    serverActions: ServerActionDefinition[]
  ): string {
    const dependencyTree = doc.dependencies
      .map((d) => `  ${" ".repeat(d.level * 2)}- ${d.name}`)
      .join("\n");

    const actionsList = doc.relatedActions
      .map((action) => `  - ${action}`)
      .join("\n");

    const routesList = doc.relatedRoutes
      .map((route) => `  - ${route}`)
      .join("\n");

    const serverActionsList = serverActions
      .map((sa) => `  - ${sa.name}: ${sa.description}`)
      .join("\n");

    return `
/**
 * Component: ${component.name}
 * Level: ${level} (${this.getLevelDescription(level)})
 * Type: ${component.type}
 *
 * Dependencies:
${dependencyTree || "  - None"}
 *
 * Routes:
${routesList || "  - None (used within parent)"}
 *
 * Actions:
${actionsList || "  - None"}
 *
 * Server Actions:
${serverActionsList || "  - None"}
 *
 * Purpose: ${doc.purpose}
 *
 * User Expectations:
${doc.userExpectations.map((e) => ` * - ${e}`).join("\n")}
 *
 * Integration Notes:
${doc.integrationNotes.map((n) => ` * - ${n}`).join("\n")}
 *
 * Data Flow:
${doc.dataFlow.map((f) => ` * ${f}`).join("\n")}
 *
 * Usage Example:
 * \`\`\`tsx
${doc.usageExample}
 * \`\`\`
 */`;
  }

  /**
   * Generate user expectations based on component type
   */
  private generateUserExpectations(
    component: EnhancedComponent,
    level: number
  ): string[] {
    const expectations: string[] = [];

    switch (component.type) {
      case "form":
        expectations.push(
          "Users expect clear validation messages",
          "Users expect loading states during submission",
          "Users expect success/error feedback",
          "Users expect form data persistence on errors"
        );
        break;

      case "display":
        expectations.push(
          "Users expect accurate and up-to-date information",
          "Users expect loading states while data fetches",
          "Users expect empty states when no data available",
          "Users expect consistent styling and layout"
        );
        break;

      case "interactive":
        expectations.push(
          "Users expect immediate visual feedback on interactions",
          "Users expect consistent behavior across actions",
          "Users expect clear error handling",
          "Users expect accessibility features (keyboard navigation, etc.)"
        );
        break;

      case "layout":
        expectations.push(
          "Users expect consistent spacing and alignment",
          "Users expect responsive design across devices",
          "Users expect smooth transitions and animations",
          "Users expect proper content hierarchy"
        );
        break;
    }

    return expectations;
  }

  /**
   * Generate integration notes
   */
  private generateIntegrationNotes(
    component: EnhancedComponent,
    dependencies: ComponentReference[],
    actions: ActionDefinition[],
    serverActions: ServerActionDefinition[]
  ): string[] {
    const notes: string[] = [];

    if (dependencies.length > 0) {
      const parents = dependencies.filter((d) => d.relationship === "parent");
      if (parents.length > 0) {
        notes.push(
          `Receives data and callbacks from ${parents.map((p) => p.name).join(", ")}`
        );
      }
    }

    if (serverActions.length > 0) {
      notes.push(
        `Integrates with server actions: ${serverActions.map((sa) => sa.name).join(", ")}`
      );
    }

    if (actions.some((a) => a.type === "form-action")) {
      notes.push("Handles form submissions with optimistic updates");
    }

    if (component.database) {
      notes.push(
        `Interacts with database table: ${component.database.table}`
      );
      notes.push(
        `Database operations: ${component.database.operations.join(", ")}`
      );
    }

    return notes;
  }

  /**
   * Generate data flow diagram
   */
  private generateDataFlow(
    component: EnhancedComponent,
    dependencies: ComponentReference[],
    actions: ActionDefinition[],
    serverActions: ServerActionDefinition[]
  ): string[] {
    const flow: string[] = [];

    // Parent to component flow
    const parents = dependencies.filter((d) => d.relationship === "parent");
    if (parents.length > 0) {
      parents.forEach((parent) => {
        flow.push(`${parent.name} → ${component.name} (props/data)`);
      });
    }

    // Component to server action flow
    if (serverActions.length > 0) {
      serverActions.forEach((sa) => {
        flow.push(
          `${component.name} → ${sa.name} (${sa.parameters.map((p) => p.name).join(", ")})`
        );
      });
    }

    // Server action to database flow
    const dbActions = serverActions.filter((sa) => sa.database);
    if (dbActions.length > 0) {
      dbActions.forEach((sa) => {
        flow.push(`${sa.name} → Database.${sa.database} (${sa.returns})`);
      });
    }

    return flow;
  }

  /**
   * Generate usage example
   */
  private generateUsageExample(
    component: EnhancedComponent,
    actions: ActionDefinition[]
  ): string {
    const props: string[] = [];

    if (component.type === "display") {
      props.push("  data={data}");
    }

    if (actions.length > 0) {
      actions
        .filter((a) => a.type === "event-handler")
        .forEach((a) => {
          props.push(`  ${a.name}={${a.name}}`);
        });
    }

    return `<${component.name}\n${props.join("\n")}\n/>`;
  }

  /**
   * Calculate generation order based on dependencies
   */
  private calculateGenerationOrder(
    component: EnhancedComponent,
    dependencies: ComponentReference[]
  ): number {
    // Base order is component level
    let order = component.level * 100;

    // Add dependency count to ensure dependencies generate first
    order += dependencies.length * 10;

    // Layout components generate before display components
    if (component.type === "layout") order -= 5;

    // Forms generate after display components
    if (component.type === "form") order += 5;

    return order;
  }

  /**
   * Get parent path for route generation
   */
  private getParentPath(dependencies: ComponentReference[]): string {
    const parents = dependencies.filter((d) => d.relationship === "parent");
    if (parents.length === 0) return "";

    return parents
      .map((p) => this.toKebabCase(p.name))
      .join("/");
  }

  /**
   * Get level description
   */
  private getLevelDescription(level: number): string {
    const descriptions: Record<number, string> = {
      0: "Root Application Container",
      1: "Feature Module",
      2: "Sub-feature Component",
      3: "Atomic Component",
      4: "Utility Component",
    };

    return descriptions[level] || `Level ${level} Component`;
  }

  /**
   * Helper: Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  /**
   * Create complete architecture plan from hierarchy
   */
  async createCompleteArchitecturePlan(
    rootComponent: EnhancedComponent,
    projectInfo: {
      name: string;
      description: string;
      architecture: string;
    }
  ): Promise<CompleteArchitecturePlan> {
    const queue = await this.buildCompleteGenerationQueue(rootComponent);

    const routes: Record<string, RouteDefinition> = {};
    const api: Record<string, any> = {};
    const serverActionsMap: Record<string, any> = {};

    queue.forEach((item) => {
      // Collect routes
      item.routes.forEach((route) => {
        routes[route.path] = route;
      });

      // Collect API endpoints
      item.serverActions.forEach((sa) => {
        const endpoint = this.serverActionGenerator.generateApiEndpoint(
          sa,
          item.component
        );
        if (!api[endpoint.path]) {
          api[endpoint.path] = {
            methods: [],
            actions: [],
          };
        }
        if (!api[endpoint.path].methods.includes(endpoint.method)) {
          api[endpoint.path].methods.push(endpoint.method);
        }
        api[endpoint.path].actions.push(endpoint.action);
      });

      // Collect server actions
      if (item.serverActions.length > 0) {
        serverActionsMap[`${item.component.name}Actions`] = {
          description: `Server actions for ${item.component.name}`,
          actions: item.serverActions,
        };
      }
    });

    return {
      project: {
        name: projectInfo.name,
        description: projectInfo.description,
        architecture: {
          type: projectInfo.architecture as any,
          features: [], // To be populated from component analysis
        },
      },
      hierarchy: { [rootComponent.name]: rootComponent },
      routes,
      api,
      serverActions: serverActionsMap,
      metadata: {
        totalComponents: queue.length,
        totalRoutes: Object.keys(routes).length,
        totalApiEndpoints: Object.keys(api).length,
        totalServerActions: Object.values(serverActionsMap).reduce(
          (acc, val: any) => acc + val.actions.length,
          0
        ),
        generationStrategy: "complete-architecture",
        documentationLevel: "comprehensive",
      },
    };
  }
}
