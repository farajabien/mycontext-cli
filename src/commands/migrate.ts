import chalk from "chalk";
import path from "path";
import { promises as fs } from "fs";
import * as fsExtra from "fs-extra";
import { CommandOptions } from "../types";
import { EnhancedSpinner } from "../utils/spinner";
import { HybridAIClient } from "../utils/hybridAIClient";

interface MigrateOptions extends CommandOptions {
  component?: string;
  group?: string;
  all?: boolean;
  includeActions?: boolean;
  includeHooks?: boolean;
  includeContext?: boolean;
  includeDocs?: boolean;
  verbose?: boolean;
}

interface ComponentMigration {
  name: string;
  path: string;
  group: string;
  hasMycontext: boolean;
  createdFiles: string[];
}

export class MigrateCommand {
  private spinner = new EnhancedSpinner("Migrating project...");
  private ai: HybridAIClient;

  constructor() {
    this.ai = new HybridAIClient();
  }

  async execute(target: string, options: MigrateOptions): Promise<void> {
    const {
      component,
      group,
      all = false,
      includeActions = true,
      includeHooks = true,
      includeContext = true,
      includeDocs = true,
      verbose = false,
    } = options;

    console.log(
      chalk.blue.bold("🔄 Migrating Project to MyContext Structure\n")
    );

    try {
      if (component) {
        await this.migrateComponent(component, {
          includeActions,
          includeHooks,
          includeContext,
          includeDocs,
        });
      } else if (group) {
        await this.migrateGroup(group, {
          includeActions,
          includeHooks,
          includeContext,
          includeDocs,
        });
      } else if (all) {
        await this.migrateAll({
          includeActions,
          includeHooks,
          includeContext,
          includeDocs,
        });
      } else {
        console.log(
          chalk.yellow("Please specify --component, --group, or --all")
        );
        return;
      }

      console.log(chalk.green.bold("\n✅ Migration completed successfully!"));
      this.printNextSteps();
    } catch (error) {
      this.spinner.fail("Migration failed");
      throw error;
    }
  }

  private async migrateComponent(
    componentName: string,
    options: {
      includeActions: boolean;
      includeHooks: boolean;
      includeContext: boolean;
      includeDocs: boolean;
    }
  ): Promise<void> {
    this.spinner.start().updateText(`Migrating component: ${componentName}`);

    const componentsDir = path.join(process.cwd(), "src", "components");
    const componentPath = await this.findComponentPath(
      componentsDir,
      componentName
    );

    if (!componentPath) {
      throw new Error(`Component ${componentName} not found`);
    }

    const mycontextDir = path.join(componentPath, ".mycontext");

    if (await fsExtra.pathExists(mycontextDir)) {
      console.log(
        chalk.yellow(
          `Component ${componentName} already has .mycontext directory`
        )
      );
      return;
    }

    await fsExtra.ensureDir(mycontextDir);

    const migration = await this.createComponentContext(
      componentPath,
      componentName,
      "components",
      options
    );

    this.spinner.succeed(`Migrated component: ${componentName}`);

    if (migration.createdFiles.length > 0) {
      console.log(
        chalk.gray(`  Created: ${migration.createdFiles.join(", ")}`)
      );
    }
  }

  private async migrateGroup(
    groupName: string,
    options: {
      includeActions: boolean;
      includeHooks: boolean;
      includeContext: boolean;
      includeDocs: boolean;
    }
  ): Promise<void> {
    this.spinner.start().updateText(`Migrating group: ${groupName}`);

    const groupDir = path.join(process.cwd(), "src", "components", groupName);

    if (!(await fsExtra.pathExists(groupDir))) {
      throw new Error(`Group ${groupName} not found`);
    }

    const components = await fs.readdir(groupDir);
    const componentDirs = components.filter(async (item) => {
      const itemPath = path.join(groupDir, item);
      const stat = await fs.stat(itemPath);
      return stat.isDirectory() && !item.startsWith(".");
    });

    const migrations: ComponentMigration[] = [];

    for (const componentDir of componentDirs) {
      const componentPath = path.join(groupDir, componentDir);
      const mycontextDir = path.join(componentPath, ".mycontext");

      if (!(await fsExtra.pathExists(mycontextDir))) {
        await fsExtra.ensureDir(mycontextDir);

        const migration = await this.createComponentContext(
          componentPath,
          componentDir,
          groupName,
          options
        );

        migrations.push(migration);
      }
    }

    this.spinner.succeed(`Migrated group: ${groupName}`);

    migrations.forEach((migration) => {
      if (migration.createdFiles.length > 0) {
        console.log(
          chalk.gray(
            `  ${migration.name}: ${migration.createdFiles.join(", ")}`
          )
        );
      }
    });
  }

  private async migrateAll(options: {
    includeActions: boolean;
    includeHooks: boolean;
    includeContext: boolean;
    includeDocs: boolean;
  }): Promise<void> {
    this.spinner.start().updateText("Migrating all components");

    const componentsDir = path.join(process.cwd(), "src", "components");

    if (!(await fsExtra.pathExists(componentsDir))) {
      throw new Error("Components directory not found");
    }

    const groups = await fs.readdir(componentsDir);
    const migrations: ComponentMigration[] = [];

    for (const group of groups) {
      const groupPath = path.join(componentsDir, group);
      const stat = await fs.stat(groupPath);

      if (stat.isDirectory()) {
        const groupMigrations = await this.migrateGroup(group, options);
        // Note: migrateGroup doesn't return migrations, we need to track them differently
      }
    }

    this.spinner.succeed("Migrated all components");
  }

  private async findComponentPath(
    componentsDir: string,
    componentName: string
  ): Promise<string | null> {
    const groups = await fs.readdir(componentsDir);

    for (const group of groups) {
      const groupPath = path.join(componentsDir, group);
      const stat = await fs.stat(groupPath);

      if (stat.isDirectory()) {
        const componentPath = path.join(groupPath, componentName);
        if (await fsExtra.pathExists(componentPath)) {
          return componentPath;
        }
      }
    }

    return null;
  }

  private async createComponentContext(
    componentPath: string,
    componentName: string,
    groupName: string,
    options: {
      includeActions: boolean;
      includeHooks: boolean;
      includeContext: boolean;
      includeDocs: boolean;
    }
  ): Promise<ComponentMigration> {
    const mycontextDir = path.join(componentPath, ".mycontext");
    const createdFiles: string[] = [];

    // Create actions.ts
    if (options.includeActions) {
      const actionsContent = await this.generateActionsContent(
        componentName,
        groupName
      );
      await fs.writeFile(path.join(mycontextDir, "actions.ts"), actionsContent);
      createdFiles.push("actions.ts");
    }

    // Create hooks.ts
    if (options.includeHooks) {
      const hooksContent = await this.generateHooksContent(
        componentName,
        groupName
      );
      await fs.writeFile(path.join(mycontextDir, "hooks.ts"), hooksContent);
      createdFiles.push("hooks.ts");
    }

    // Create context.ts
    if (options.includeContext) {
      const contextContent = await this.generateContextContent(
        componentName,
        groupName
      );
      await fs.writeFile(path.join(mycontextDir, "context.ts"), contextContent);
      createdFiles.push("context.ts");
    }

    // Create README.md
    if (options.includeDocs) {
      const docsContent = await this.generateDocsContent(
        componentName,
        groupName
      );
      await fs.writeFile(path.join(mycontextDir, "README.md"), docsContent);
      createdFiles.push("README.md");
    }

    return {
      name: componentName,
      path: componentPath,
      group: groupName,
      hasMycontext: true,
      createdFiles,
    };
  }

  private async generateActionsContent(
    componentName: string,
    groupName: string
  ): Promise<string> {
    const prompt = `Generate server actions for a ${componentName} component in the ${groupName} group.

Create TypeScript server actions that would be useful for this component. Include:
- CRUD operations if applicable
- Form handling actions
- Data fetching actions
- Validation functions

Use Next.js server actions pattern with 'use server' directive.
Export functions that can be imported and used in the component.`;

    try {
      const response = await this.ai.generateText(prompt);
      return `// Server actions for ${componentName} component
// Generated by MyContext CLI

"use server";

${response}

// Example usage in component:
// import { create${componentName}, update${componentName} } from './.mycontext/actions';
`;
    } catch (error) {
      console.warn(
        `Failed to generate actions for ${componentName}, using template`
      );
      return `// Server actions for ${componentName} component
// Generated by MyContext CLI

"use server";

// TODO: Implement server actions for ${componentName}
export async function create${componentName}(data: any) {
  // Implementation here
}

export async function update${componentName}(id: string, data: any) {
  // Implementation here
}

export async function delete${componentName}(id: string) {
  // Implementation here
}

export async function get${componentName}(id: string) {
  // Implementation here
}
`;
    }
  }

  private async generateHooksContent(
    componentName: string,
    groupName: string
  ): Promise<string> {
    const prompt = `Generate custom React hooks for a ${componentName} component in the ${groupName} group.

Create TypeScript custom hooks that would be useful for this component. Include:
- State management hooks
- Data fetching hooks
- Form handling hooks
- Event handling hooks

Use React hooks patterns and TypeScript.
Export hooks that can be imported and used in the component.`;

    try {
      const response = await this.ai.generateText(prompt);
      return `// Custom hooks for ${componentName} component
// Generated by MyContext CLI

import { useState, useEffect, useCallback } from 'react';

${response}

// Example usage in component:
// import { use${componentName}State, use${componentName}Data } from './.mycontext/hooks';
`;
    } catch (error) {
      console.warn(
        `Failed to generate hooks for ${componentName}, using template`
      );
      return `// Custom hooks for ${componentName} component
// Generated by MyContext CLI

import { useState, useEffect, useCallback } from 'react';

export function use${componentName}State(initialState: any = {}) {
  const [state, setState] = useState(initialState);
  
  const updateState = useCallback((updates: Partial<typeof initialState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  return { state, setState, updateState };
}

export function use${componentName}Data() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Implementation here
      setData(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
}
`;
    }
  }

  private async generateContextContent(
    componentName: string,
    groupName: string
  ): Promise<string> {
    const prompt = `Generate React context for a ${componentName} component in the ${groupName} group.

Create TypeScript React context that would be useful for this component. Include:
- Context provider component
- Custom hook for consuming context
- Type definitions for context value
- Default values

Use React context patterns and TypeScript.
Export context and hooks that can be imported and used in the component.`;

    try {
      const response = await this.ai.generateText(prompt);
      return `// Context for ${componentName} component
// Generated by MyContext CLI

import { createContext, useContext, ReactNode } from 'react';

${response}

// Example usage in component:
// import { ${componentName}Provider, use${componentName}Context } from './.mycontext/context';
`;
    } catch (error) {
      console.warn(
        `Failed to generate context for ${componentName}, using template`
      );
      return `// Context for ${componentName} component
// Generated by MyContext CLI

import { createContext, useContext, ReactNode } from 'react';

interface ${componentName}ContextValue {
  // Define context value type here
}

const ${componentName}Context = createContext<${componentName}ContextValue | undefined>(undefined);

export function ${componentName}Provider({ children }: { children: ReactNode }) {
  const value: ${componentName}ContextValue = {
    // Provide context value here
  };
  
  return (
    <${componentName}Context.Provider value={value}>
      {children}
    </${componentName}Context.Provider>
  );
}

export function use${componentName}Context() {
  const context = useContext(${componentName}Context);
  if (context === undefined) {
    throw new Error('use${componentName}Context must be used within a ${componentName}Provider');
  }
  return context;
}
`;
    }
  }

  private async generateDocsContent(
    componentName: string,
    groupName: string
  ): Promise<string> {
    const prompt = `Generate documentation for a ${componentName} component in the ${groupName} group.

Create comprehensive documentation that includes:
- Component description and purpose
- Props interface and usage examples
- Usage examples with code snippets
- Integration with actions, hooks, and context
- Best practices and tips

Use Markdown format with clear sections and code examples.`;

    try {
      const response = await this.ai.generateText(prompt);
      return `# ${componentName} Component

${response}

## Files in this directory

- \`actions.ts\` - Server actions for ${componentName}
- \`hooks.ts\` - Custom React hooks for ${componentName}
- \`context.ts\` - React context for ${componentName}
- \`README.md\` - This documentation file

## Usage

\`\`\`tsx
import { ${componentName} } from './${componentName}';
import { use${componentName}State } from './.mycontext/hooks';
import { create${componentName} } from './.mycontext/actions';

export function MyPage() {
  const { state, updateState } = use${componentName}State();
  
  return (
    <${componentName} 
      // props here
    />
  );
}
\`\`\`
`;
    } catch (error) {
      console.warn(
        `Failed to generate docs for ${componentName}, using template`
      );
      return `# ${componentName} Component

A ${componentName} component in the ${groupName} group.

## Description

TODO: Add component description

## Props

\`\`\`tsx
interface ${componentName}Props {
  // Define props here
}
\`\`\`

## Usage

\`\`\`tsx
import { ${componentName} } from './${componentName}';

export function MyPage() {
  return (
    <${componentName} 
      // props here
    />
  );
}
\`\`\`

## Files in this directory

- \`actions.ts\` - Server actions for ${componentName}
- \`hooks.ts\` - Custom React hooks for ${componentName}
- \`context.ts\` - React context for ${componentName}
- \`README.md\` - This documentation file

## Development

This component has been migrated to MyContext structure. You can:

1. Use the generated actions, hooks, and context
2. Customize them for your specific needs
3. Add more functionality as needed
4. Use \`mycontext promote\` to move to production when ready
`;
    }
  }

  private printNextSteps(): void {
    console.log(chalk.yellow("\n📋 Next Steps:"));
    console.log(chalk.gray("1. Review the generated .mycontext directories"));
    console.log(
      chalk.gray("2. Customize the actions, hooks, and context as needed")
    );
    console.log(
      chalk.gray("3. Test the components with their new context files")
    );
    console.log(
      chalk.gray("4. Use 'mycontext promote' to move to production when ready")
    );
    console.log(
      chalk.gray(
        "\n💡 Tip: Each component now has its own development context!"
      )
    );
  }
}
