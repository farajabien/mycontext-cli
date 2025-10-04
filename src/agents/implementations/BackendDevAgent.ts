import { SubAgent } from "../interfaces/SubAgent";
import { HybridAIClient } from "../../utils/hybridAIClient";
import { FileSystemManager } from "../../utils/fileSystem";
import { CommandOptions } from "../../types";
import chalk from "chalk";
import path from "path";
import * as fs from "fs-extra";

interface BackendDevAgentOptions extends CommandOptions {
  projectPath: string;
  typesPath?: string;
  componentsListPath?: string;
  contextPath?: string;
}

interface ServerAction {
  name: string;
  description: string;
  parameters: ActionParameter[];
  returnType: string;
  isAsync: boolean;
  implementation: string;
  relatedComponents: string[];
}

interface ActionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface CustomHook {
  name: string;
  description: string;
  serverAction: string;
  stateType: string;
  implementation: string;
  relatedComponents: string[];
}

export class BackendDevAgent implements SubAgent {
  name = "BackendDevAgent";
  description =
    "Generates server actions, custom hooks, and backend integration code";
  personality: string;
  llmProvider: string;
  expertise: string[];
  private aiClient: HybridAIClient;
  private fs: FileSystemManager;

  constructor() {
    // Try to get personality, fallback to hardcoded values
    try {
      const {
        getSubAgentPersonality,
      } = require("../personalities/definitions");
      const personality = getSubAgentPersonality(this.name);
      if (personality) {
        this.personality = personality.systemPrompt;
        this.llmProvider = personality.llmProvider;
        this.expertise = personality.expertise;
      } else {
        this.personality = "technical, systematic, backend-focused";
        this.llmProvider = "hybrid";
        this.expertise = [
          "backend",
          "server-actions",
          "hooks",
          "api-integration",
        ];
      }
    } catch (error) {
      // Fallback if personality system fails
      this.personality = "technical, systematic, backend-focused";
      this.llmProvider = "hybrid";
      this.expertise = [
        "backend",
        "server-actions",
        "hooks",
        "api-integration",
      ];
    }

    this.aiClient = new HybridAIClient();
    this.fs = new FileSystemManager();
  }

  async run(input: any): Promise<any> {
    return this.execute(input);
  }

  validate?(input: any): boolean | Promise<boolean> {
    return !!(input && input.projectPath);
  }

  async cleanup?(): Promise<void> {
    // Cleanup resources if needed
  }

  async getStatus?(): Promise<any> {
    return {
      name: this.name,
      status: "idle",
      errorCount: 0,
      successCount: 0,
    };
  }

  async execute(options: BackendDevAgentOptions): Promise<void> {
    const { projectPath, typesPath, componentsListPath, contextPath } = options;

    console.log(
      chalk.blue("🔧 Backend Dev Agent: Creating server actions and hooks...")
    );

    try {
      // Step 1: Analyze types and context
      const typesAnalysis = await this.analyzeTypes(
        typesPath || path.join(projectPath, ".mycontext", "02-types.ts")
      );
      const componentsAnalysis = await this.analyzeComponents(
        componentsListPath ||
          path.join(projectPath, ".mycontext", "04-component-list.json")
      );
      const contextAnalysis = await this.analyzeContext(
        contextPath || path.join(projectPath, ".mycontext", "01-prd.md")
      );

      // Step 2: Generate server actions
      const serverActions = await this.generateServerActions(
        typesAnalysis,
        componentsAnalysis,
        contextAnalysis
      );

      // Step 3: Generate custom hooks
      const customHooks = await this.generateCustomHooks(
        serverActions,
        typesAnalysis
      );

      // Step 4: Create server actions file
      await this.createServerActionsFile(projectPath, serverActions);

      // Step 5: Create custom hooks file
      await this.createCustomHooksFile(projectPath, customHooks);

      // Step 6: Create component-specific context files
      await this.createComponentContextFiles(
        projectPath,
        componentsAnalysis,
        serverActions,
        customHooks
      );

      // Step 7: Update components to use server actions and hooks
      await this.updateComponentsWithBackend(
        projectPath,
        serverActions,
        customHooks,
        componentsAnalysis
      );

      // Step 8: Create database schema (if needed)
      await this.createDatabaseSchema(projectPath, typesAnalysis);

      console.log(
        chalk.green(
          "✅ Backend Dev Agent: Server actions and hooks created successfully!"
        )
      );
    } catch (error) {
      console.error(chalk.red("❌ Backend Dev Agent failed:"), error);
      throw error;
    }
  }

  private async analyzeTypes(typesPath: string): Promise<any> {
    if (!(await fs.pathExists(typesPath))) {
      console.log(
        chalk.yellow("⚠️  Types file not found, using default analysis")
      );
      return { entities: [], relationships: [] };
    }

    const typesContent = await fs.readFile(typesPath, "utf-8");

    const prompt = `Analyze this TypeScript types file and extract:
1. Entity types (interfaces/types that represent data models)
2. Relationship types (how entities relate to each other)
3. Action types (functions that should have server actions)
4. State types (types used for component state)

Types file:
\`\`\`typescript
${typesContent}
\`\`\`

Return a JSON object with this structure:
{
  "entities": [
    {
      "name": "User",
      "properties": [{"name": "id", "type": "string"}, ...],
      "relationships": ["posts", "comments"]
    }
  ],
  "actions": [
    {
      "name": "createUser",
      "parameters": [{"name": "data", "type": "CreateUserInput"}],
      "returnType": "User"
    }
  ],
  "stateTypes": [
    {
      "name": "UserState",
      "properties": [{"name": "users", "type": "User[]"}, {"name": "loading", "type": "boolean"}]
    }
  ]
}`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 2000,
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.log(chalk.yellow("⚠️  AI analysis failed, using fallback"));
      return this.fallbackTypesAnalysis(typesContent);
    }
  }

  private fallbackTypesAnalysis(typesContent: string): any {
    // Simple regex-based analysis as fallback
    const entities: any[] = [];
    const actions: any[] = [];
    const stateTypes: any[] = [];

    // Extract interface definitions
    const interfaceRegex = /interface\s+(\w+)\s*\{([^}]+)\}/g;
    let match;
    while ((match = interfaceRegex.exec(typesContent)) !== null) {
      const name = match[1];
      const properties = match[2]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("//"))
        .map((line) => {
          const [propName, propType] = line.split(":").map((s) => s.trim());
          return {
            name: propName,
            type: propType?.replace(/[;,]/g, "") || "any",
          };
        })
        .filter((prop) => prop.name && prop.type);

      entities.push({ name, properties, relationships: [] });
    }

    return { entities, actions, stateTypes };
  }

  private async analyzeComponents(componentsListPath: string): Promise<any> {
    if (!(await fs.pathExists(componentsListPath))) {
      return { components: [] };
    }

    const componentsList = JSON.parse(
      await fs.readFile(componentsListPath, "utf-8")
    );
    return componentsList;
  }

  private async analyzeContext(contextPath: string): Promise<any> {
    if (!(await fs.pathExists(contextPath))) {
      return { requirements: [] };
    }

    const contextContent = await fs.readFile(contextPath, "utf-8");

    const prompt = `Analyze this PRD/context file and extract backend requirements:
1. Data operations needed (CRUD operations)
2. Business logic requirements
3. External API integrations
4. Authentication/authorization needs
5. Real-time features needed

Context:
\`\`\`
${contextContent}
\`\`\`

Return a JSON object with this structure:
{
  "dataOperations": ["create", "read", "update", "delete"],
  "businessLogic": ["validation", "computation", "transformation"],
  "externalAPIs": [],
  "authRequirements": ["user_management", "permissions"],
  "realtimeFeatures": ["notifications", "live_updates"]
}`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.1,
        maxTokens: 1000,
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      return {
        dataOperations: ["create", "read", "update", "delete"],
        businessLogic: [],
        externalAPIs: [],
        authRequirements: [],
        realtimeFeatures: [],
      };
    }
  }

  private async generateServerActions(
    typesAnalysis: any,
    componentsAnalysis: any,
    contextAnalysis: any
  ): Promise<ServerAction[]> {
    const prompt = `Based on the analysis, generate Next.js server actions for this application.

Types Analysis:
${JSON.stringify(typesAnalysis, null, 2)}

Components Analysis:
${JSON.stringify(componentsAnalysis, null, 2)}

Context Analysis:
${JSON.stringify(contextAnalysis, null, 2)}

Generate server actions that:
1. Use Next.js 14 server actions (not API routes)
2. Include proper TypeScript types
3. Handle errors gracefully
4. Include validation
5. Are optimized for the specific entities and operations needed

Return a JSON array of server actions with this structure:
[
  {
    "name": "createTodo",
    "description": "Create a new todo item",
    "parameters": [
      {"name": "title", "type": "string", "required": true, "description": "Todo title"},
      {"name": "description", "type": "string", "required": false, "description": "Todo description"}
    ],
    "returnType": "Todo",
    "isAsync": true,
    "implementation": "// Server action implementation",
    "relatedComponents": ["TodoForm", "TodoList"]
  }
]`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 3000,
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.log(
        chalk.yellow("⚠️  AI generation failed, using fallback server actions")
      );
      return this.generateFallbackServerActions(typesAnalysis);
    }
  }

  private generateFallbackServerActions(typesAnalysis: any): ServerAction[] {
    const actions: ServerAction[] = [];

    // Generate basic CRUD actions for each entity
    typesAnalysis.entities?.forEach((entity: any) => {
      const entityName = entity.name.toLowerCase();

      // Create action
      actions.push({
        name: `create${entity.name}`,
        description: `Create a new ${entity.name}`,
        parameters: entity.properties
          .filter(
            (prop: any) =>
              prop.name !== "id" &&
              prop.name !== "createdAt" &&
              prop.name !== "updatedAt"
          )
          .map((prop: any) => ({
            name: prop.name,
            type: prop.type,
            required: true,
            description: `${prop.name} for ${entity.name}`,
          })),
        returnType: entity.name,
        isAsync: true,
        implementation: `// TODO: Implement create${entity.name} server action`,
        relatedComponents: [],
      });

      // Read action
      actions.push({
        name: `get${entity.name}s`,
        description: `Get all ${entity.name}s`,
        parameters: [],
        returnType: `${entity.name}[]`,
        isAsync: true,
        implementation: `// TODO: Implement get${entity.name}s server action`,
        relatedComponents: [],
      });

      // Update action
      actions.push({
        name: `update${entity.name}`,
        description: `Update a ${entity.name}`,
        parameters: [
          {
            name: "id",
            type: "string",
            required: true,
            description: `${entity.name} ID`,
          },
          ...entity.properties
            .filter(
              (prop: any) => prop.name !== "id" && prop.name !== "createdAt"
            )
            .map((prop: any) => ({
              name: prop.name,
              type: prop.type,
              required: false,
              description: `${prop.name} for ${entity.name}`,
            })),
        ],
        returnType: entity.name,
        isAsync: true,
        implementation: `// TODO: Implement update${entity.name} server action`,
        relatedComponents: [],
      });

      // Delete action
      actions.push({
        name: `delete${entity.name}`,
        description: `Delete a ${entity.name}`,
        parameters: [
          {
            name: "id",
            type: "string",
            required: true,
            description: `${entity.name} ID`,
          },
        ],
        returnType: "void",
        isAsync: true,
        implementation: `// TODO: Implement delete${entity.name} server action`,
        relatedComponents: [],
      });
    });

    return actions;
  }

  private async generateCustomHooks(
    serverActions: ServerAction[],
    typesAnalysis: any
  ): Promise<CustomHook[]> {
    const prompt = `Generate React custom hooks that connect to the server actions.

Server Actions:
${JSON.stringify(serverActions, null, 2)}

Types Analysis:
${JSON.stringify(typesAnalysis, null, 2)}

Create hooks that:
1. Use React's useState and useEffect
2. Call server actions
3. Handle loading and error states
4. Provide optimistic updates where appropriate
5. Use proper TypeScript types

Return a JSON array of custom hooks:
[
  {
    "name": "useTodos",
    "description": "Hook for managing todos",
    "serverAction": "getTodos",
    "stateType": "TodoState",
    "implementation": "// Hook implementation",
    "relatedComponents": ["TodoList", "TodoForm"]
  }
]`;

    try {
      const response = await this.aiClient.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 2000,
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      return this.generateFallbackCustomHooks(serverActions);
    }
  }

  private generateFallbackCustomHooks(
    serverActions: ServerAction[]
  ): CustomHook[] {
    const hooks: CustomHook[] = [];

    // Group server actions by entity
    const entityActions = new Map<string, ServerAction[]>();
    serverActions.forEach((action) => {
      const entityName = action.name
        .replace(/^(create|get|update|delete)/, "")
        .toLowerCase();
      if (!entityActions.has(entityName)) {
        entityActions.set(entityName, []);
      }
      entityActions.get(entityName)!.push(action);
    });

    // Generate hooks for each entity
    entityActions.forEach((actions, entityName) => {
      const capitalizedEntity =
        entityName.charAt(0).toUpperCase() + entityName.slice(1);

      hooks.push({
        name: `use${capitalizedEntity}s`,
        description: `Hook for managing ${capitalizedEntity}s`,
        serverAction: actions.find((a) => a.name.startsWith("get"))?.name || "",
        stateType: `${capitalizedEntity}State`,
        implementation: `// TODO: Implement use${capitalizedEntity}s hook`,
        relatedComponents: [],
      });
    });

    return hooks;
  }

  private async createServerActionsFile(
    projectPath: string,
    serverActions: ServerAction[]
  ): Promise<void> {
    const actionsDir = path.join(projectPath, "src", "lib", "actions");
    await fs.ensureDir(actionsDir);

    let content = `"use server";

// Generated server actions
// This file contains all server actions for the application

`;

    // Group actions by entity
    const entityActions = new Map<string, ServerAction[]>();
    serverActions.forEach((action) => {
      const entityName = action.name
        .replace(/^(create|get|update|delete)/, "")
        .toLowerCase();
      if (!entityActions.has(entityName)) {
        entityActions.set(entityName, []);
      }
      entityActions.get(entityName)!.push(action);
    });

    entityActions.forEach((actions, entityName) => {
      const capitalizedEntity =
        entityName.charAt(0).toUpperCase() + entityName.slice(1);

      content += `// ${capitalizedEntity} Actions\n`;
      content += `// ========================\n\n`;

      actions.forEach((action) => {
        content += `export async function ${action.name}(\n`;
        action.parameters.forEach((param, index) => {
          content += `  ${param.name}: ${param.type}${
            param.required ? "" : "?"
          }`;
          if (index < action.parameters.length - 1) content += ",";
          content += "\n";
        });
        content += `): Promise<${action.returnType}> {\n`;
        content += `  // ${action.description}\n`;
        content += `  try {\n`;
        content += `    // TODO: Implement ${action.name}\n`;
        content += `    // Add validation, database operations, etc.\n`;
        content += `    \n`;
        content += `    throw new Error("Not implemented yet");\n`;
        content += `  } catch (error) {\n`;
        content += `    console.error("Error in ${action.name}:", error);\n`;
        content += `    throw new Error("Failed to ${action.name
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()}");\n`;
        content += `  }\n`;
        content += `}\n\n`;
      });
    });

    await fs.writeFile(path.join(actionsDir, "index.ts"), content);
    console.log(chalk.green("✅ Server actions file created"));
  }

  private async createComponentContextFiles(
    projectPath: string,
    componentsAnalysis: any,
    serverActions: ServerAction[],
    customHooks: CustomHook[]
  ): Promise<void> {
    const { groups = {} } = componentsAnalysis;

    for (const [groupName, components] of Object.entries(groups)) {
      const groupDir = path.join(projectPath, "src", "components", groupName);

      for (const component of components as any[]) {
        const componentDir = path.join(groupDir, component.name);
        const mycontextDir = path.join(componentDir, ".mycontext");

        await fs.ensureDir(mycontextDir);

        // Create component-specific server actions
        const componentActions = serverActions.filter((action) =>
          action.relatedComponents.includes(component.name)
        );

        if (componentActions.length > 0) {
          const actionsContent = this.generateComponentActions(
            componentActions,
            component.name
          );
          await fs.writeFile(
            path.join(mycontextDir, "actions.ts"),
            actionsContent
          );
        }

        // Create component-specific hooks
        const componentHooks = customHooks.filter((hook) =>
          hook.relatedComponents.includes(component.name)
        );

        if (componentHooks.length > 0) {
          const hooksContent = this.generateComponentHooks(
            componentHooks,
            component.name
          );
          await fs.writeFile(path.join(mycontextDir, "hooks.ts"), hooksContent);
        }

        // Create component context file
        const contextContent = this.generateComponentContext(
          component,
          componentActions,
          componentHooks
        );
        await fs.writeFile(
          path.join(mycontextDir, "context.ts"),
          contextContent
        );

        // Create component README
        const readmeContent = this.generateComponentReadme(
          component,
          componentActions,
          componentHooks
        );
        await fs.writeFile(path.join(mycontextDir, "README.md"), readmeContent);
      }
    }

    console.log(chalk.green("✅ Component context files created"));
  }

  private generateComponentActions(
    actions: ServerAction[],
    componentName: string
  ): string {
    let content = `"use server";

// Server actions for ${componentName}
// Generated by Backend Dev Agent

`;

    actions.forEach((action) => {
      content += `export async function ${action.name}(\n`;
      action.parameters.forEach((param, index) => {
        content += `  ${param.name}: ${param.type}${param.required ? "" : "?"}`;
        if (index < action.parameters.length - 1) content += ",";
        content += "\n";
      });
      content += `): Promise<${action.returnType}> {\n`;
      content += `  // ${action.description}\n`;
      content += `  try {\n`;
      content += `    // TODO: Implement ${action.name} for ${componentName}\n`;
      content += `    // Add component-specific logic here\n`;
      content += `    \n`;
      content += `    throw new Error("Not implemented yet");\n`;
      content += `  } catch (error) {\n`;
      content += `    console.error("Error in ${action.name}:", error);\n`;
      content += `    throw new Error("Failed to ${action.name
        .replace(/([A-Z])/g, " $1")
        .toLowerCase()}");\n`;
      content += `  }\n`;
      content += `}\n\n`;
    });

    return content;
  }

  private generateComponentHooks(
    hooks: CustomHook[],
    componentName: string
  ): string {
    let content = `"use client";

// Custom hooks for ${componentName}
// Generated by Backend Dev Agent

import { useState, useEffect } from "react";
import * as actions from "./actions";

`;

    hooks.forEach((hook) => {
      content += `// ${hook.name}\n`;
      content += `// ${hook.description}\n`;
      content += `export function ${hook.name}() {\n`;
      content += `  const [data, setData] = useState<${hook.stateType}>({\n`;
      content += `    loading: false,\n`;
      content += `    error: null,\n`;
      content += `    // TODO: Add specific state properties for ${componentName}\n`;
      content += `  });\n\n`;
      content += `  // TODO: Implement ${hook.name} logic for ${componentName}\n`;
      content += `  // - Call server actions from ./actions\n`;
      content += `  // - Handle loading states\n`;
      content += `  // - Handle errors\n`;
      content += `  // - Provide optimistic updates\n\n`;
      content += `  return data;\n`;
      content += `}\n\n`;
    });

    return content;
  }

  private generateComponentContext(
    component: any,
    actions: ServerAction[],
    hooks: CustomHook[]
  ): string {
    return `// Component context for ${component.name}
// This file defines the context and configuration for this component

export interface ${component.name}Context {
  // Component-specific state
  loading: boolean;
  error: string | null;
  
  // Component-specific data
  data: any;
  
  // Component-specific actions
  actions: {
    ${actions
      .map((action) => `${action.name}: () => Promise<${action.returnType}>`)
      .join(";\n    ")}
  };
  
  // Component-specific hooks
  hooks: {
    ${hooks
      .map((hook) => `${hook.name}: () => ${hook.stateType}`)
      .join(";\n    ")}
  };
}

export const ${component.name}Config = {
  name: "${component.name}",
  description: "${component.description}",
  type: "${component.type}",
  priority: "${component.priority}",
  dependencies: ${JSON.stringify(component.dependencies || [], null, 2)},
  tags: ${JSON.stringify(component.tags || [], null, 2)},
  
  // Server actions available
  serverActions: [
    ${actions.map((action) => `"${action.name}"`).join(",\n    ")}
  ],
  
  // Custom hooks available
  customHooks: [
    ${hooks.map((hook) => `"${hook.name}"`).join(",\n    ")}
  ],
  
  // Component-specific configuration
  config: {
    // Add component-specific config here
  }
};
`;
  }

  private generateComponentReadme(
    component: any,
    actions: ServerAction[],
    hooks: CustomHook[]
  ): string {
    return `# ${component.name}

${component.description}

## Type
${component.type}

## Priority
${component.priority}

## Dependencies
${(component.dependencies || []).map((dep: string) => `- ${dep}`).join("\n")}

## Tags
${(component.tags || []).map((tag: string) => `- ${tag}`).join("\n")}

## Server Actions

This component has access to the following server actions:

${actions
  .map(
    (action) => `### ${action.name}
${action.description}

**Parameters:**
${action.parameters
  .map(
    (param) =>
      `- \`${param.name}\`: ${param.type}${
        param.required ? " (required)" : " (optional)"
      } - ${param.description}`
  )
  .join("\n")}

**Returns:** \`${action.returnType}\`

`
  )
  .join("\n")}

## Custom Hooks

This component has access to the following custom hooks:

${hooks
  .map(
    (hook) => `### ${hook.name}
${hook.description}

**State Type:** \`${hook.stateType}\`

`
  )
  .join("\n")}

## Usage

\`\`\`tsx
import { ${component.name} } from './${component.name}';
import { ${hooks
      .map((hook) => hook.name)
      .join(", ")} } from './.mycontext/hooks';
import { ${actions
      .map((action) => action.name)
      .join(", ")} } from './.mycontext/actions';

function MyComponent() {
  const { data, loading, error } = ${hooks[0]?.name || "useData"}();
  
  return (
    <${component.name} 
      data={data}
      loading={loading}
      error={error}
    />
  );
}
\`\`\`

## Development

To work with this component:

1. **Server Actions**: Edit \`.mycontext/actions.ts\` to implement the actual server logic
2. **Custom Hooks**: Edit \`.mycontext/hooks.ts\` to implement state management
3. **Context**: Edit \`.mycontext/context.ts\` to configure component behavior
4. **Component**: Edit the main component file to integrate with the context

## Moving to Production

When ready to move to production:

\`\`\`bash
# Move context files to parent directory
mycontext promote ${component.name}

# Or move all components in a group
mycontext promote-group ${component.group || "default"}
\`\`\`

This will:
- Move \`.mycontext/*\` files to the parent component directory
- Update import paths
- Add \`.mycontext/\` to \`.gitignore\`
- Clean up development files
`;
  }

  private async createCustomHooksFile(
    projectPath: string,
    customHooks: CustomHook[]
  ): Promise<void> {
    const hooksDir = path.join(projectPath, "src", "lib", "hooks");
    await fs.ensureDir(hooksDir);

    let content = `"use client";

// Generated custom hooks
// This file contains all custom hooks for the application

import { useState, useEffect } from "react";
import * as actions from "../actions";

`;

    customHooks.forEach((hook) => {
      content += `// ${hook.name}\n`;
      content += `// ${hook.description}\n`;
      content += `export function ${hook.name}() {\n`;
      content += `  const [data, setData] = useState<${hook.stateType}>({\n`;
      content += `    loading: false,\n`;
      content += `    error: null,\n`;
      content += `    // TODO: Add specific state properties\n`;
      content += `  });\n\n`;
      content += `  // TODO: Implement ${hook.name} logic\n`;
      content += `  // - Call server actions\n`;
      content += `  // - Handle loading states\n`;
      content += `  // - Handle errors\n`;
      content += `  // - Provide optimistic updates\n\n`;
      content += `  return data;\n`;
      content += `}\n\n`;
    });

    await fs.writeFile(path.join(hooksDir, "index.ts"), content);
    console.log(chalk.green("✅ Custom hooks file created"));
  }

  private async updateComponentsWithBackend(
    projectPath: string,
    serverActions: ServerAction[],
    customHooks: CustomHook[],
    componentsAnalysis: any
  ): Promise<void> {
    // This would analyze existing components and update them to use server actions and hooks
    // For now, we'll create a guide file
    const guidePath = path.join(
      projectPath,
      "src",
      "lib",
      "BACKEND_INTEGRATION.md"
    );

    let content = `# Backend Integration Guide

This file explains how to integrate the generated server actions and hooks with your components.

## Server Actions

The following server actions are available in \`src/lib/actions/index.ts\`:

${serverActions
  .map((action) => `- **${action.name}**: ${action.description}`)
  .join("\n")}

## Custom Hooks

The following custom hooks are available in \`src/lib/hooks/index.ts\`:

${customHooks
  .map((hook) => `- **${hook.name}**: ${hook.description}`)
  .join("\n")}

## Integration Steps

1. Import server actions in your components:
   \`\`\`typescript
   import { createTodo, getTodos } from "@/lib/actions";
   \`\`\`

2. Import custom hooks in your components:
   \`\`\`typescript
   import { useTodos } from "@/lib/hooks";
   \`\`\`

3. Use hooks for state management:
   \`\`\`typescript
   function TodoList() {
     const { data, loading, error } = useTodos();
     // Component logic
   }
   \`\`\`

4. Call server actions directly:
   \`\`\`typescript
   async function handleSubmit(formData: FormData) {
     const result = await createTodo({
       title: formData.get("title") as string,
       description: formData.get("description") as string,
     });
   }
   \`\`\`

## Next Steps

1. Implement the actual server action logic (database operations, validation, etc.)
2. Implement the custom hook logic (state management, error handling, etc.)
3. Connect components to use these hooks and actions
4. Add proper error handling and loading states
5. Test the integration

`;

    await fs.writeFile(guidePath, content);
    console.log(chalk.green("✅ Backend integration guide created"));
  }

  private async createDatabaseSchema(
    projectPath: string,
    typesAnalysis: any
  ): Promise<void> {
    const schemaDir = path.join(projectPath, "src", "lib", "db");
    await fs.ensureDir(schemaDir);

    let content = `// Database schema
// This file defines the database schema based on your types

`;

    typesAnalysis.entities?.forEach((entity: any) => {
      content += `// ${entity.name} table\n`;
      content += `export const ${entity.name.toLowerCase()}Schema = {\n`;
      content += `  // TODO: Define database schema for ${entity.name}\n`;
      content += `  // Example for Prisma:\n`;
      content += `  // model ${entity.name} {\n`;
      entity.properties.forEach((prop: any) => {
        content += `  //   ${prop.name} ${prop.type}\n`;
      });
      content += `  // }\n`;
      content += `};\n\n`;
    });

    await fs.writeFile(path.join(schemaDir, "schema.ts"), content);
    console.log(chalk.green("✅ Database schema file created"));
  }
}
