import {
  ServerActionDefinition,
  ActionDefinition,
  EnhancedComponent,
  HttpMethod,
} from "../types";

/**
 * Server Action Generator
 * Generates Next.js server actions based on component requirements
 */
export class ServerActionGenerator {
  /**
   * Generate server actions for a component
   */
  async generateServerActions(
    component: EnhancedComponent
  ): Promise<ServerActionDefinition[]> {
    const actions: ServerActionDefinition[] = [];

    // Form components need submit actions
    if (component.type === "form") {
      actions.push(this.generateFormSubmitAction(component));
    }

    // Display components need data fetching actions
    if (component.type === "display") {
      actions.push(this.generateDataFetchAction(component));
    }

    // Interactive components may need CRUD actions
    if (component.type === "interactive") {
      actions.push(...this.generateCRUDActions(component));
    }

    return actions;
  }

  /**
   * Generate form submission server action
   */
  private generateFormSubmitAction(
    component: EnhancedComponent
  ): ServerActionDefinition {
    const actionName = `submit${component.name}`;
    const tableName = this.getDatabaseTable(component);

    return {
      name: actionName,
      description: `Handle ${component.name} form submission`,
      parameters: [
        {
          name: "formData",
          type: "FormData",
          required: true,
          description: "Form data from client submission",
        },
        {
          name: "userId",
          type: "string",
          required: false,
          description: "Optional user ID for authentication",
        },
      ],
      returns: `{ success: boolean; data?: ${component.name}; error?: string }`,
      database: tableName,
      validation: `${component.name.toLowerCase()}Schema`,
      middleware: ["auth", "rateLimit"],
      errorHandling: ["ValidationError", "DatabaseError", "AuthError"],
      caching: {
        strategy: "no-cache",
      },
    };
  }

  /**
   * Generate data fetching server action
   */
  private generateDataFetchAction(
    component: EnhancedComponent
  ): ServerActionDefinition {
    const actionName = `get${this.pluralize(component.name)}`;
    const tableName = this.getDatabaseTable(component);

    return {
      name: actionName,
      description: `Fetch data for ${component.name} display`,
      parameters: [
        {
          name: "filters",
          type: "Record<string, any>",
          required: false,
          description: "Optional filters for data fetching",
        },
        {
          name: "pagination",
          type: "{ page: number; limit: number }",
          required: false,
          description: "Pagination parameters",
        },
      ],
      returns: `${component.name}[]`,
      database: tableName,
      middleware: ["auth"],
      caching: {
        strategy: "revalidate",
        revalidate: 60, // 1 minute
      },
    };
  }

  /**
   * Generate CRUD actions for interactive components
   */
  private generateCRUDActions(
    component: EnhancedComponent
  ): ServerActionDefinition[] {
    const tableName = this.getDatabaseTable(component);
    const actions: ServerActionDefinition[] = [];

    // Create
    actions.push({
      name: `create${component.name}`,
      description: `Create new ${component.name}`,
      parameters: [
        {
          name: "data",
          type: `Omit<${component.name}, 'id'>`,
          required: true,
          description: `${component.name} data without ID`,
        },
      ],
      returns: component.name,
      database: tableName,
      validation: `${component.name.toLowerCase()}Schema`,
      middleware: ["auth", "rateLimit"],
      caching: { strategy: "no-cache" },
    });

    // Read
    actions.push({
      name: `get${component.name}`,
      description: `Get ${component.name} by ID`,
      parameters: [
        {
          name: "id",
          type: "string",
          required: true,
          description: `${component.name} ID`,
        },
      ],
      returns: `${component.name} | null`,
      database: tableName,
      middleware: ["auth"],
      caching: { strategy: "revalidate", revalidate: 60 },
    });

    // Update
    actions.push({
      name: `update${component.name}`,
      description: `Update existing ${component.name}`,
      parameters: [
        {
          name: "id",
          type: "string",
          required: true,
          description: `${component.name} ID`,
        },
        {
          name: "data",
          type: `Partial<${component.name}>`,
          required: true,
          description: "Fields to update",
        },
      ],
      returns: component.name,
      database: tableName,
      validation: `${component.name.toLowerCase()}UpdateSchema`,
      middleware: ["auth", "rateLimit"],
      caching: { strategy: "no-cache" },
    });

    // Delete
    actions.push({
      name: `delete${component.name}`,
      description: `Delete ${component.name}`,
      parameters: [
        {
          name: "id",
          type: "string",
          required: true,
          description: `${component.name} ID`,
        },
      ],
      returns: "boolean",
      database: tableName,
      middleware: ["auth", "rateLimit"],
      caching: { strategy: "no-cache" },
    });

    return actions;
  }

  /**
   * Generate client actions that connect to server actions
   */
  generateClientActions(
    component: EnhancedComponent,
    serverActions: ServerActionDefinition[]
  ): ActionDefinition[] {
    const clientActions: ActionDefinition[] = [];

    serverActions.forEach((serverAction) => {
      clientActions.push({
        name: `handle${this.capitalize(serverAction.name)}`,
        type: "client-action",
        description: `Client-side handler for ${serverAction.name}`,
        parameters: serverAction.parameters.map((p) => p.name),
        serverAction: serverAction.name,
      });
    });

    return clientActions;
  }

  /**
   * Generate API endpoint definition from server action
   */
  generateApiEndpoint(
    serverAction: ServerActionDefinition,
    component: EnhancedComponent
  ): { path: string; method: HttpMethod; action: string } {
    const path = `/api/${this.toKebabCase(component.name)}`;
    let method: HttpMethod = "GET";

    if (serverAction.name.startsWith("create")) method = "POST";
    if (serverAction.name.startsWith("update")) method = "PUT";
    if (serverAction.name.startsWith("delete")) method = "DELETE";

    return {
      path,
      method,
      action: serverAction.name,
    };
  }

  /**
   * Helper: Get database table name from component
   */
  private getDatabaseTable(component: EnhancedComponent): string {
    if (component.database?.table) {
      return component.database.table;
    }
    return this.toSnakeCase(this.pluralize(component.name));
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
   * Helper: Convert to snake_case
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/\s+/g, "_")
      .toLowerCase();
  }

  /**
   * Helper: Pluralize word
   */
  private pluralize(word: string): string {
    if (word.endsWith("y")) {
      return word.slice(0, -1) + "ies";
    }
    if (word.endsWith("s")) {
      return word + "es";
    }
    return word + "s";
  }

  /**
   * Helper: Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
