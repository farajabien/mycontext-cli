/**
 * Role-Based Generator
 *
 * Generates features for different roles using admin-first approach.
 * Admin features are generated first, then user/guest features are
 * derived as subsets with appropriate permissions.
 */

import { SubAgent } from "../interfaces/SubAgent";
import { HybridAIClient } from "../../utils/hybridAIClient";
import { FeatureBundle, FeatureTemplate } from "../../types/feature-bundle";
import {
  Role,
  RoleDefinition,
  Permission,
  RoleHierarchy,
} from "../../types/role-permissions";
import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";

export interface RoleBasedGenerationContext {
  projectPath: string;
  adminFeatures: FeatureBundle[];
  targetRoles: Role[];
  roleHierarchy: RoleHierarchy;
  outputPath: string;
}

export interface RoleBasedGenerationResult {
  success: boolean;
  roleFeatures: Map<Role, FeatureBundle[]>;
  errors: string[];
  warnings: string[];
  metadata: {
    totalRoles: number;
    totalFeatures: number;
    processingTime: number;
  };
}

export class RoleBasedGenerator implements SubAgent {
  public readonly name = "RoleBasedGenerator";
  public readonly description = "Generates role-based feature adaptations";
  public readonly personality = "adaptive and security-focused";
  public readonly llmProvider = "hybrid";
  public readonly expertise = [
    "role-based-access",
    "permission-mapping",
    "feature-adaptation",
  ];

  private aiClient: HybridAIClient;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.aiClient = new HybridAIClient();
  }

  async run(
    context: RoleBasedGenerationContext
  ): Promise<RoleBasedGenerationResult> {
    const startTime = Date.now();
    console.log(chalk.cyan("🎭 Role-Based Generator starting..."));

    try {
      const roleFeatures = new Map<Role, FeatureBundle[]>();
      const errors: string[] = [];
      const warnings: string[] = [];

      // Generate features for each role, starting with admin
      const sortedRoles = this.sortRolesByHierarchy(
        context.targetRoles,
        context.roleHierarchy
      );

      for (const role of sortedRoles) {
        console.log(chalk.gray(`  🎯 Generating features for role: ${role}`));

        try {
          let features: FeatureBundle[];

          if (role === "admin") {
            // Admin gets all features with full permissions
            features = context.adminFeatures;
          } else {
            // Other roles get subset of admin features with restricted permissions
            features = await this.generateRoleFeatures(
              role,
              context.adminFeatures,
              context.roleHierarchy
            );
          }

          roleFeatures.set(role, features);
          console.log(
            chalk.green(
              `    ✓ Generated ${features.length} features for ${role}`
            )
          );
        } catch (error) {
          const errorMsg = `Failed to generate features for ${role}: ${error}`;
          errors.push(errorMsg);
          console.log(chalk.red(`    ✗ ${errorMsg}`));
        }
      }

      // Save role-specific feature bundles
      await this.saveRoleFeatures(roleFeatures, context.outputPath);

      const processingTime = Date.now() - startTime;
      const result: RoleBasedGenerationResult = {
        success: errors.length === 0,
        roleFeatures,
        errors,
        warnings,
        metadata: {
          totalRoles: roleFeatures.size,
          totalFeatures: Array.from(roleFeatures.values()).reduce(
            (sum, features) => sum + features.length,
            0
          ),
          processingTime,
        },
      };

      console.log(
        chalk.green(`✅ Role-Based Generation completed in ${processingTime}ms`)
      );
      console.log(
        chalk.blue(
          `   Generated features for ${result.metadata.totalRoles} roles`
        )
      );
      console.log(
        chalk.blue(`   Total features: ${result.metadata.totalFeatures}`)
      );

      return result;
    } catch (error) {
      console.log(chalk.red(`❌ Role-Based Generation failed: ${error}`));
      return {
        success: false,
        roleFeatures: new Map(),
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        metadata: {
          totalRoles: 0,
          totalFeatures: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  private sortRolesByHierarchy(
    roles: Role[],
    hierarchy: RoleHierarchy
  ): Role[] {
    // Sort roles by their level in the hierarchy (admin first, then user, then guest)
    return roles.sort((a, b) => {
      const roleA = hierarchy.roles.find((r) => r.name === a);
      const roleB = hierarchy.roles.find((r) => r.name === b);

      if (!roleA || !roleB) return 0;

      return roleB.level - roleA.level; // Higher level first (admin = 4, user = 2, guest = 1)
    });
  }

  private async generateRoleFeatures(
    role: Role,
    adminFeatures: FeatureBundle[],
    hierarchy: RoleHierarchy
  ): Promise<FeatureBundle[]> {
    const roleDefinition = hierarchy.roles.find((r) => r.name === role);
    if (!roleDefinition) {
      throw new Error(`Role definition not found for ${role}`);
    }

    const roleFeatures: FeatureBundle[] = [];

    for (const adminFeature of adminFeatures) {
      try {
        const roleFeature = await this.generateRoleFeature(
          role,
          adminFeature,
          roleDefinition,
          hierarchy
        );
        roleFeatures.push(roleFeature);
      } catch (error) {
        console.log(
          chalk.yellow(
            `    ⚠️  Skipping feature ${adminFeature.name} for role ${role}: ${error}`
          )
        );
      }
    }

    return roleFeatures;
  }

  private async generateRoleFeature(
    role: Role,
    adminFeature: FeatureBundle,
    roleDefinition: RoleDefinition,
    hierarchy: RoleHierarchy
  ): Promise<FeatureBundle> {
    // Create a copy of the admin feature
    const roleFeature: FeatureBundle = JSON.parse(JSON.stringify(adminFeature));

    // Update role
    roleFeature.role = role;

    // Filter components based on role permissions
    roleFeature.components = await this.filterComponentsForRole(
      roleFeature.components,
      role,
      roleDefinition
    );

    // Filter actions based on role permissions
    roleFeature.actions = roleFeature.actions.filter((action) =>
      this.hasPermissionForRole(action.permissions, role, roleDefinition)
    );

    // Filter hooks based on role permissions
    roleFeature.hooks = roleFeature.hooks.filter((hook) =>
      this.hasPermissionForRole(hook.dependencies, role, roleDefinition)
    );

    // Filter routes based on role permissions
    roleFeature.routes = roleFeature.routes.filter((route) =>
      this.hasPermissionForRole(route.permissions, role, roleDefinition)
    );

    // Update permissions to match role
    roleFeature.permissions = roleFeature.permissions.filter((permission) =>
      this.hasPermissionForRole([permission.action], role, roleDefinition)
    );

    // Add role-specific restrictions
    roleFeature.permissions = this.applyRoleRestrictions(
      roleFeature.permissions,
      roleDefinition
    );

    // Update metadata
    roleFeature.metadata.updatedAt = new Date().toISOString();
    roleFeature.metadata.dependencies = this.filterDependenciesForRole(
      roleFeature.metadata.dependencies,
      role
    );

    return roleFeature;
  }

  private async filterComponentsForRole(
    components: string[],
    role: Role,
    roleDefinition: RoleDefinition
  ): Promise<string[]> {
    // Filter components based on role permissions
    const allowedComponents = components.filter((component) => {
      const componentName = component.toLowerCase();

      // Admin can see all components
      if (role === "admin") return true;

      // User can see most components except admin-only ones
      if (role === "user") {
        return (
          !componentName.includes("admin") &&
          !componentName.includes("manage") &&
          !componentName.includes("settings")
        );
      }

      // Guest can only see public components
      if (role === "guest") {
        return (
          componentName.includes("public") ||
          componentName.includes("view") ||
          componentName.includes("display")
        );
      }

      return true;
    });

    return allowedComponents;
  }

  private hasPermissionForRole(
    permissions: string[],
    role: Role,
    roleDefinition: RoleDefinition
  ): boolean {
    // Check if role has any of the required permissions
    return permissions.some((permission) => {
      const rolePermission = roleDefinition.permissions.find(
        (p) => p.action === permission || p.resource === permission
      );
      return !!rolePermission;
    });
  }

  private applyRoleRestrictions(
    permissions: Permission[],
    roleDefinition: RoleDefinition
  ): Permission[] {
    return permissions.map((permission) => {
      // Apply role-specific conditions
      const rolePermission = roleDefinition.permissions.find(
        (p) =>
          p.resource === permission.resource && p.action === permission.action
      );

      if (rolePermission) {
        return {
          ...permission,
          conditions: rolePermission.conditions || permission.conditions,
        };
      }

      return permission;
    });
  }

  private filterDependenciesForRole(
    dependencies: string[],
    role: Role
  ): string[] {
    // Filter dependencies based on role needs
    const roleSpecificDeps = {
      admin: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "zod"],
      moderator: [
        "@radix-ui/react-dialog",
        "@radix-ui/react-avatar",
        "react-hook-form",
      ],
      editor: ["@radix-ui/react-avatar", "react-hook-form"],
      user: ["@radix-ui/react-avatar", "react-hook-form"],
      guest: ["@radix-ui/react-avatar"],
    };

    const roleDeps = roleSpecificDeps[role] || [];
    return dependencies.filter((dep) => roleDeps.includes(dep));
  }

  private async saveRoleFeatures(
    roleFeatures: Map<Role, FeatureBundle[]>,
    outputPath: string
  ): Promise<void> {
    const roleBundlesDir = path.join(outputPath, ".mycontext", "role-bundles");
    await fs.mkdir(roleBundlesDir, { recursive: true });

    for (const [role, features] of roleFeatures) {
      const roleDir = path.join(roleBundlesDir, role);
      await fs.mkdir(roleDir, { recursive: true });

      // Save individual feature bundles
      for (const feature of features) {
        const featureFile = path.join(roleDir, `${feature.name}.json`);
        await fs.writeFile(featureFile, JSON.stringify(feature, null, 2));
      }

      // Save role summary
      const roleSummary = {
        role,
        features: features.map((f) => ({
          name: f.name,
          description: f.description,
          components: f.components.length,
          actions: f.actions.length,
          hooks: f.hooks.length,
          routes: f.routes.length,
        })),
        metadata: {
          totalFeatures: features.length,
          totalComponents: features.reduce(
            (sum, f) => sum + f.components.length,
            0
          ),
          totalActions: features.reduce((sum, f) => sum + f.actions.length, 0),
          totalHooks: features.reduce((sum, f) => sum + f.hooks.length, 0),
          totalRoutes: features.reduce((sum, f) => sum + f.routes.length, 0),
          generatedAt: new Date().toISOString(),
        },
      };

      const summaryFile = path.join(roleDir, "summary.json");
      await fs.writeFile(summaryFile, JSON.stringify(roleSummary, null, 2));
    }
  }

  /**
   * Generate a default role hierarchy
   */
  static createDefaultRoleHierarchy(): RoleHierarchy {
    return {
      roles: [
        {
          name: "admin",
          displayName: "Administrator",
          description: "Full system access with all permissions",
          level: 4,
          permissions: [
            {
              id: "admin-all",
              resource: "all",
              action: "manage",
              description: "Full system access",
            },
          ],
          metadata: {
            color: "#dc2626",
            icon: "shield",
            badge: "Admin",
          },
        },
        {
          name: "user",
          displayName: "User",
          description: "Standard user with limited permissions",
          level: 2,
          permissions: [
            {
              id: "user-read",
              resource: "users",
              action: "read",
              conditions: [
                {
                  field: "id",
                  operator: "equals",
                  value: "{{userId}}",
                },
              ],
              description: "Read own user data",
            },
            {
              id: "user-update",
              resource: "users",
              action: "update",
              conditions: [
                {
                  field: "id",
                  operator: "equals",
                  value: "{{userId}}",
                },
              ],
              description: "Update own user data",
            },
          ],
          inherits: ["guest"],
          metadata: {
            color: "#2563eb",
            icon: "user",
            badge: "User",
          },
        },
        {
          name: "guest",
          displayName: "Guest",
          description: "Limited access for unauthenticated users",
          level: 1,
          permissions: [
            {
              id: "guest-read-public",
              resource: "public",
              action: "read",
              description: "Read public content",
            },
          ],
          metadata: {
            color: "#6b7280",
            icon: "eye",
            badge: "Guest",
          },
        },
      ],
      inheritance: [
        {
          child: "user",
          parent: "guest",
          type: "full",
        },
      ],
      defaultRole: "user",
      fallbackRole: "guest",
    };
  }
}
