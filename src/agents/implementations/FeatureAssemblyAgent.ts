/**
 * Feature Assembly Agent
 *
 * Combines generated components into complete working features
 * with actions, hooks, routes, and role-based permissions.
 */

import { SubAgent } from "../interfaces/SubAgent";
import { HybridAIClient } from "../../utils/hybridAIClient";
import {
  FeatureBundle,
  FeatureAssemblyOptions,
  FeatureAssemblyResult,
  FeatureTemplate,
} from "../../types/feature-bundle";
import { Role, RoleDefinition, Permission } from "../../types/role-permissions";
import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";

export interface FeatureAssemblyContext {
  projectPath: string;
  components: string[];
  contextFiles: {
    prd?: string;
    types?: string;
    brand?: string;
    componentList?: string;
  };
  designManifest?: any;
  targetRole: Role;
  featureTemplates: FeatureTemplate[];
  outputPath: string;
}

export interface FeatureAssemblyResult {
  success: boolean;
  features: FeatureBundle[];
  errors: string[];
  warnings: string[];
  metadata: {
    totalFeatures: number;
    totalComponents: number;
    totalActions: number;
    totalHooks: number;
    totalRoutes: number;
    processingTime: number;
  };
}

export class FeatureAssemblyAgent implements SubAgent {
  private aiClient: HybridAIClient;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.aiClient = new HybridAIClient();
  }

  async run(context: FeatureAssemblyContext): Promise<FeatureAssemblyResult> {
    const startTime = Date.now();
    console.log(chalk.cyan("🔧 Feature Assembly Agent starting..."));

    try {
      // Step 1: Analyze components and group into features
      console.log(
        chalk.gray("  📋 Analyzing components and grouping into features...")
      );
      const featureGroups = await this.analyzeAndGroupComponents(
        context.components,
        context.contextFiles
      );

      // Step 2: Generate feature bundles for each group
      console.log(chalk.gray("  🎯 Generating feature bundles..."));
      const features: FeatureBundle[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const group of featureGroups) {
        try {
          const feature = await this.generateFeatureBundle(group, context);
          features.push(feature);
          console.log(chalk.green(`    ✓ Generated feature: ${feature.name}`));
        } catch (error) {
          const errorMsg = `Failed to generate feature ${group.name}: ${error}`;
          errors.push(errorMsg);
          console.log(chalk.red(`    ✗ ${errorMsg}`));
        }
      }

      // Step 3: Apply role-based permissions
      console.log(chalk.gray("  🔐 Applying role-based permissions..."));
      const roleBasedFeatures = await this.applyRoleBasedPermissions(
        features,
        context.targetRole
      );

      // Step 4: Generate supporting files (actions, hooks, routes)
      console.log(chalk.gray("  📁 Generating supporting files..."));
      await this.generateSupportingFiles(roleBasedFeatures, context);

      // Step 5: Save feature bundles
      console.log(chalk.gray("  💾 Saving feature bundles..."));
      await this.saveFeatureBundles(roleBasedFeatures, context.outputPath);

      const processingTime = Date.now() - startTime;
      const result: FeatureAssemblyResult = {
        success: errors.length === 0,
        features: roleBasedFeatures,
        errors,
        warnings,
        metadata: {
          totalFeatures: roleBasedFeatures.length,
          totalComponents: roleBasedFeatures.reduce(
            (sum, f) => sum + f.components.length,
            0
          ),
          totalActions: roleBasedFeatures.reduce(
            (sum, f) => sum + f.actions.length,
            0
          ),
          totalHooks: roleBasedFeatures.reduce(
            (sum, f) => sum + f.hooks.length,
            0
          ),
          totalRoutes: roleBasedFeatures.reduce(
            (sum, f) => sum + f.routes.length,
            0
          ),
          processingTime,
        },
      };

      console.log(
        chalk.green(`✅ Feature Assembly completed in ${processingTime}ms`)
      );
      console.log(
        chalk.blue(`   Generated ${result.metadata.totalFeatures} features`)
      );
      console.log(
        chalk.blue(`   Generated ${result.metadata.totalComponents} components`)
      );
      console.log(
        chalk.blue(`   Generated ${result.metadata.totalActions} actions`)
      );
      console.log(
        chalk.blue(`   Generated ${result.metadata.totalHooks} hooks`)
      );
      console.log(
        chalk.blue(`   Generated ${result.metadata.totalRoutes} routes`)
      );

      return result;
    } catch (error) {
      console.log(chalk.red(`❌ Feature Assembly failed: ${error}`));
      return {
        success: false,
        features: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        metadata: {
          totalFeatures: 0,
          totalComponents: 0,
          totalActions: 0,
          totalHooks: 0,
          totalRoutes: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  private async analyzeAndGroupComponents(
    components: string[],
    contextFiles: any
  ): Promise<ComponentGroup[]> {
    const prompt = `
Analyze the following components and group them into logical features based on functionality and purpose.

Components:
${components.map((c) => `- ${c}`).join("\n")}

Context Files:
${JSON.stringify(contextFiles, null, 2)}

Group the components into features that work together to provide complete functionality. Each feature should have:
- A clear purpose and scope
- Related components that work together
- A logical name and description

Return a JSON array of component groups with this structure:
[
  {
    "name": "feature-name",
    "description": "What this feature does",
    "components": ["component1", "component2"],
    "category": "authentication|user-management|content|settings|analytics|communication",
    "priority": "high|medium|low"
  }
]
`;

    try {
      const response = await this.aiClient.generateText(prompt);
      const groups = JSON.parse(response.text);
      return groups as ComponentGroup[];
    } catch (error) {
      // Fallback to rule-based grouping
      return this.fallbackComponentGrouping(components);
    }
  }

  private fallbackComponentGrouping(components: string[]): ComponentGroup[] {
    const groups: ComponentGroup[] = [];
    const componentMap = new Map<string, string[]>();

    // Rule-based grouping patterns
    const patterns = {
      authentication: ["login", "signup", "auth", "password", "session"],
      "user-management": ["user", "profile", "account", "member"],
      content: ["post", "article", "blog", "content", "page"],
      settings: ["setting", "config", "preference", "option"],
      analytics: ["analytics", "stats", "metric", "dashboard", "chart"],
      communication: ["message", "chat", "notification", "email", "comment"],
    };

    // Group components by patterns
    for (const component of components) {
      const lowerComponent = component.toLowerCase();
      let assigned = false;

      for (const [category, keywords] of Object.entries(patterns)) {
        if (keywords.some((keyword) => lowerComponent.includes(keyword))) {
          if (!componentMap.has(category)) {
            componentMap.set(category, []);
          }
          componentMap.get(category)!.push(component);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        if (!componentMap.has("general")) {
          componentMap.set("general", []);
        }
        componentMap.get("general")!.push(component);
      }
    }

    // Convert to ComponentGroup format
    for (const [category, comps] of componentMap) {
      groups.push({
        name: category,
        description: `Components related to ${category}`,
        components: comps,
        category: category as any,
        priority: "medium",
      });
    }

    return groups;
  }

  private async generateFeatureBundle(
    group: ComponentGroup,
    context: FeatureAssemblyContext
  ): Promise<FeatureBundle> {
    const prompt = `
Generate a complete feature bundle for the following component group:

Feature: ${group.name}
Description: ${group.description}
Components: ${group.components.join(", ")}
Category: ${group.category}
Target Role: ${context.targetRole}

Context Files:
${JSON.stringify(context.contextFiles, null, 2)}

Design Manifest:
${JSON.stringify(context.designManifest, null, 2)}

Generate a complete feature bundle with:
1. Server actions for CRUD operations
2. Custom hooks for data management
3. API routes for backend operations
4. Database schema and queries
5. Role-based permissions
6. TypeScript types

Return a JSON object matching the FeatureBundle interface:
{
  "name": "feature-name",
  "description": "Feature description",
  "role": "admin|user|guest",
  "components": ["component1", "component2"],
  "types": ["Type1", "Type2"],
  "actions": [...],
  "hooks": [...],
  "routes": [...],
  "database": {...},
  "permissions": [...],
  "metadata": {...}
}
`;

    try {
      const response = await this.aiClient.generateText(prompt);
      const bundle = JSON.parse(response.text) as FeatureBundle;

      // Add metadata
      bundle.metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
        dependencies: this.extractDependencies(bundle),
      };

      return bundle;
    } catch (error) {
      // Fallback to template-based generation
      return this.generateFeatureBundleFromTemplate(group, context);
    }
  }

  private generateFeatureBundleFromTemplate(
    group: ComponentGroup,
    context: FeatureAssemblyContext
  ): FeatureBundle {
    // Find matching template
    const template = context.featureTemplates.find(
      (t) => t.category === group.category
    );

    if (!template) {
      // Generate basic template
      return this.generateBasicFeatureBundle(group, context);
    }

    // Convert template to feature bundle
    return {
      name: group.name,
      description: group.description,
      role: context.targetRole,
      components: group.components,
      types: template.components.map((c) => c.name),
      actions: template.actions.map((a) => ({
        name: a.name,
        description: a.description,
        file: `actions/${a.name}.ts`,
        function: a.name,
        parameters: a.parameters,
        returnType: a.returnType,
        permissions: a.permissions,
        validation: undefined,
      })),
      hooks: template.hooks.map((h) => ({
        name: h.name,
        description: h.description,
        file: `hooks/${h.name}.ts`,
        function: h.name,
        parameters: h.parameters,
        returnType: h.returnType,
        dependencies: h.dependencies,
      })),
      routes: template.routes.map((r) => ({
        path: r.path,
        method: r.method as any,
        description: r.description,
        file: `app/api${r.path}/route.ts`,
        function: r.path.replace(/\//g, "_").replace(/\[.*?\]/g, "id"),
        parameters: r.parameters,
        responseType: r.responseType,
        permissions: r.permissions,
        middleware: undefined,
      })),
      database: {
        schema: JSON.stringify(template.database, null, 2),
        queries: template.database.tables.map((t) => `SELECT * FROM ${t.name}`),
        mutations: template.database.tables.map((t) => `INSERT INTO ${t.name}`),
      },
      permissions: template.permissions.map((p) => ({
        id: `${group.name}-${p.role}-${p.resource}`,
        resource: p.resource as any,
        action: p.actions[0] as any,
        conditions: p.conditions,
        description: `Permission for ${p.role} on ${p.resource}`,
      })),
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
        dependencies: template.dependencies,
      },
    };
  }

  private generateBasicFeatureBundle(
    group: ComponentGroup,
    context: FeatureAssemblyContext
  ): FeatureBundle {
    return {
      name: group.name,
      description: group.description,
      role: context.targetRole,
      components: group.components,
      types: [`${group.name}Data`, `${group.name}Form`],
      actions: [
        {
          name: `get${group.name}`,
          description: `Get ${group.name} data`,
          file: `actions/${group.name}.ts`,
          function: `get${group.name}`,
          parameters: [],
          returnType: "Promise<any[]>",
          permissions: [`${group.name}:read`],
        },
      ],
      hooks: [
        {
          name: `use${group.name}`,
          description: `Hook for ${group.name} data`,
          file: `hooks/${group.name}.ts`,
          function: `use${group.name}`,
          parameters: [],
          returnType: "any",
          dependencies: [],
        },
      ],
      routes: [
        {
          path: `/api/${group.name}`,
          method: "GET",
          description: `Get ${group.name} data`,
          file: `app/api/${group.name}/route.ts`,
          function: "GET",
          parameters: [],
          responseType: "any[]",
          permissions: [`${group.name}:read`],
        },
      ],
      database: {
        schema: `CREATE TABLE ${group.name} (id TEXT PRIMARY KEY, data JSONB);`,
        queries: [`SELECT * FROM ${group.name}`],
        mutations: [`INSERT INTO ${group.name} (id, data) VALUES (?, ?)`],
      },
      permissions: [
        {
          id: `${group.name}-${context.targetRole}-read`,
          resource: group.name as any,
          action: "read",
          description: `Read access to ${group.name}`,
        },
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
        dependencies: [],
      },
    };
  }

  private async applyRoleBasedPermissions(
    features: FeatureBundle[],
    targetRole: Role
  ): Promise<FeatureBundle[]> {
    // Apply role-based filtering and permissions
    return features.map((feature) => ({
      ...feature,
      role: targetRole,
      permissions: feature.permissions.filter((p) =>
        this.hasPermissionForRole(p, targetRole)
      ),
    }));
  }

  private hasPermissionForRole(permission: Permission, role: Role): boolean {
    // Simple role hierarchy: admin > user > guest
    const roleLevels = { admin: 3, user: 2, guest: 1 };
    const permissionLevels = {
      manage: 4,
      create: 3,
      update: 2,
      read: 1,
      delete: 2,
    };

    const roleLevel = roleLevels[role] || 1;
    const permissionLevel = permissionLevels[permission.action] || 1;

    return roleLevel >= permissionLevel;
  }

  private async generateSupportingFiles(
    features: FeatureBundle[],
    context: FeatureAssemblyContext
  ): Promise<void> {
    for (const feature of features) {
      // Generate actions
      await this.generateActions(feature, context);

      // Generate hooks
      await this.generateHooks(feature, context);

      // Generate routes
      await this.generateRoutes(feature, context);

      // Generate types
      await this.generateTypes(feature, context);
    }
  }

  private async generateActions(
    feature: FeatureBundle,
    context: FeatureAssemblyContext
  ): Promise<void> {
    const actionsDir = path.join(context.outputPath, "actions");
    await fs.mkdir(actionsDir, { recursive: true });

    for (const action of feature.actions) {
      const actionCode = this.generateActionCode(action, feature);
      const actionFile = path.join(actionsDir, `${action.name}.ts`);
      await fs.writeFile(actionFile, actionCode);
    }
  }

  private generateActionCode(action: any, feature: FeatureBundle): string {
    return `/**
 * ${action.description}
 */

export async function ${action.function}(${action.parameters
      .map((p: any) => `${p.name}: ${p.type}`)
      .join(", ")}): Promise<${action.returnType}> {
  // TODO: Implement ${action.name}
  throw new Error('Not implemented');
}
`;
  }

  private async generateHooks(
    feature: FeatureBundle,
    context: FeatureAssemblyContext
  ): Promise<void> {
    const hooksDir = path.join(context.outputPath, "hooks");
    await fs.mkdir(hooksDir, { recursive: true });

    for (const hook of feature.hooks) {
      const hookCode = this.generateHookCode(hook, feature);
      const hookFile = path.join(hooksDir, `${hook.name}.ts`);
      await fs.writeFile(hookFile, hookCode);
    }
  }

  private generateHookCode(hook: any, feature: FeatureBundle): string {
    return `/**
 * ${hook.description}
 */

export function ${hook.function}(${hook.parameters
      .map((p: any) => `${p.name}: ${p.type}`)
      .join(", ")}): ${hook.returnType} {
  // TODO: Implement ${hook.name}
  throw new Error('Not implemented');
}
`;
  }

  private async generateRoutes(
    feature: FeatureBundle,
    context: FeatureAssemblyContext
  ): Promise<void> {
    for (const route of feature.routes) {
      const routeDir = path.dirname(path.join(context.outputPath, route.file));
      await fs.mkdir(routeDir, { recursive: true });

      const routeCode = this.generateRouteCode(route, feature);
      const routeFile = path.join(context.outputPath, route.file);
      await fs.writeFile(routeFile, routeCode);
    }
  }

  private generateRouteCode(route: any, feature: FeatureBundle): string {
    return `/**
 * ${route.description}
 */

import { NextRequest, NextResponse } from 'next/server';

export async function ${route.method}(request: NextRequest) {
  // TODO: Implement ${route.path} ${route.method}
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
`;
  }

  private async generateTypes(
    feature: FeatureBundle,
    context: FeatureAssemblyContext
  ): Promise<void> {
    const typesDir = path.join(context.outputPath, "types");
    await fs.mkdir(typesDir, { recursive: true });

    const typesCode = this.generateTypesCode(feature);
    const typesFile = path.join(typesDir, `${feature.name}.ts`);
    await fs.writeFile(typesFile, typesCode);
  }

  private generateTypesCode(feature: FeatureBundle): string {
    return `/**
 * Types for ${feature.name} feature
 */

export interface ${feature.name}Data {
  id: string;
  // TODO: Add specific fields
}

export interface ${feature.name}Form {
  // TODO: Add form fields
}

export interface ${feature.name}CreateData {
  // TODO: Add creation fields
}

export interface ${feature.name}UpdateData {
  // TODO: Add update fields
}
`;
  }

  private async saveFeatureBundles(
    features: FeatureBundle[],
    outputPath: string
  ): Promise<void> {
    const bundlesDir = path.join(outputPath, ".mycontext", "feature-bundles");
    await fs.mkdir(bundlesDir, { recursive: true });

    for (const feature of features) {
      const bundleFile = path.join(bundlesDir, `${feature.name}.json`);
      await fs.writeFile(bundleFile, JSON.stringify(feature, null, 2));
    }
  }

  private extractDependencies(bundle: FeatureBundle): string[] {
    const deps = new Set<string>();

    // Extract from actions
    bundle.actions.forEach((action) => {
      if (action.validation?.schema) deps.add("zod");
    });

    // Extract from hooks
    bundle.hooks.forEach((hook) => {
      hook.dependencies.forEach((dep) => deps.add(dep));
    });

    return Array.from(deps);
  }
}

interface ComponentGroup {
  name: string;
  description: string;
  components: string[];
  category:
    | "authentication"
    | "user-management"
    | "content"
    | "settings"
    | "analytics"
    | "communication";
  priority: "high" | "medium" | "low";
}
