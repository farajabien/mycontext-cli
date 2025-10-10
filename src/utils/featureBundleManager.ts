/**
 * Feature Bundle Manager
 *
 * Manages feature bundles including loading, saving, validation,
 * and operations for the Feature Assembly system.
 */

import * as fs from "fs/promises";
import * as path from "path";
import {
  FeatureBundle,
  FeatureTemplate,
  FeatureAssemblyResult,
} from "../types/feature-bundle";
import { Role } from "../types/role-permissions";

export class FeatureBundleManager {
  private projectPath: string;
  private bundlesDir: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.bundlesDir = path.join(projectPath, ".mycontext", "feature-bundles");
  }

  /**
   * Save a feature bundle to disk
   */
  async saveBundle(bundle: FeatureBundle, role?: Role): Promise<void> {
    const roleDir = role ? path.join(this.bundlesDir, role) : this.bundlesDir;
    await fs.mkdir(roleDir, { recursive: true });

    const bundleFile = path.join(roleDir, `${bundle.name}.json`);
    await fs.writeFile(bundleFile, JSON.stringify(bundle, null, 2));
  }

  /**
   * Load a feature bundle from disk
   */
  async loadBundle(
    bundleName: string,
    role?: Role
  ): Promise<FeatureBundle | null> {
    const roleDir = role ? path.join(this.bundlesDir, role) : this.bundlesDir;
    const bundleFile = path.join(roleDir, `${bundleName}.json`);

    try {
      const content = await fs.readFile(bundleFile, "utf-8");
      return JSON.parse(content) as FeatureBundle;
    } catch {
      return null;
    }
  }

  /**
   * Load all feature bundles for a role
   */
  async loadBundlesForRole(role: Role): Promise<FeatureBundle[]> {
    const roleDir = path.join(this.bundlesDir, role);

    try {
      const files = await fs.readdir(roleDir);
      const bundles: FeatureBundle[] = [];

      for (const file of files) {
        if (file.endsWith(".json") && file !== "summary.json") {
          const bundleName = file.replace(".json", "");
          const bundle = await this.loadBundle(bundleName, role);
          if (bundle) {
            bundles.push(bundle);
          }
        }
      }

      return bundles;
    } catch {
      return [];
    }
  }

  /**
   * Load all feature bundles across all roles
   */
  async loadAllBundles(): Promise<Map<Role, FeatureBundle[]>> {
    const roleBundles = new Map<Role, FeatureBundle[]>();
    const roles: Role[] = ["admin", "user", "guest"];

    for (const role of roles) {
      const bundles = await this.loadBundlesForRole(role);
      if (bundles.length > 0) {
        roleBundles.set(role, bundles);
      }
    }

    return roleBundles;
  }

  /**
   * Delete a feature bundle
   */
  async deleteBundle(bundleName: string, role?: Role): Promise<void> {
    const roleDir = role ? path.join(this.bundlesDir, role) : this.bundlesDir;
    const bundleFile = path.join(roleDir, `${bundleName}.json`);

    try {
      await fs.unlink(bundleFile);
    } catch {
      // File doesn't exist, ignore
    }
  }

  /**
   * Validate a feature bundle
   */
  validateBundle(bundle: FeatureBundle): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!bundle.name) errors.push("Bundle name is required");
    if (!bundle.description) errors.push("Bundle description is required");
    if (!bundle.role) errors.push("Bundle role is required");
    if (!Array.isArray(bundle.components))
      errors.push("Components must be an array");
    if (!Array.isArray(bundle.actions)) errors.push("Actions must be an array");
    if (!Array.isArray(bundle.hooks)) errors.push("Hooks must be an array");
    if (!Array.isArray(bundle.routes)) errors.push("Routes must be an array");
    if (!bundle.database) errors.push("Database configuration is required");
    if (!Array.isArray(bundle.permissions))
      errors.push("Permissions must be an array");
    if (!bundle.metadata) errors.push("Metadata is required");

    // Validate role
    const validRoles = ["admin", "user", "guest"];
    if (!validRoles.includes(bundle.role)) {
      errors.push(
        `Invalid role: ${bundle.role}. Must be one of: ${validRoles.join(", ")}`
      );
    }

    // Validate actions
    bundle.actions.forEach((action, index) => {
      if (!action.name) errors.push(`Action ${index}: name is required`);
      if (!action.description)
        errors.push(`Action ${index}: description is required`);
      if (!action.file) errors.push(`Action ${index}: file is required`);
      if (!action.function)
        errors.push(`Action ${index}: function is required`);
      if (!action.returnType)
        errors.push(`Action ${index}: returnType is required`);
      if (!Array.isArray(action.permissions))
        errors.push(`Action ${index}: permissions must be an array`);
    });

    // Validate hooks
    bundle.hooks.forEach((hook, index) => {
      if (!hook.name) errors.push(`Hook ${index}: name is required`);
      if (!hook.description)
        errors.push(`Hook ${index}: description is required`);
      if (!hook.file) errors.push(`Hook ${index}: file is required`);
      if (!hook.function) errors.push(`Hook ${index}: function is required`);
      if (!hook.returnType)
        errors.push(`Hook ${index}: returnType is required`);
      if (!Array.isArray(hook.dependencies))
        errors.push(`Hook ${index}: dependencies must be an array`);
    });

    // Validate routes
    bundle.routes.forEach((route, index) => {
      if (!route.path) errors.push(`Route ${index}: path is required`);
      if (!route.method) errors.push(`Route ${index}: method is required`);
      if (!route.description)
        errors.push(`Route ${index}: description is required`);
      if (!route.file) errors.push(`Route ${index}: file is required`);
      if (!route.function) errors.push(`Route ${index}: function is required`);
      if (!route.responseType)
        errors.push(`Route ${index}: responseType is required`);
      if (!Array.isArray(route.permissions))
        errors.push(`Route ${index}: permissions must be an array`);
    });

    // Validate permissions
    bundle.permissions.forEach((permission, index) => {
      if (!permission.id) errors.push(`Permission ${index}: id is required`);
      if (!permission.resource)
        errors.push(`Permission ${index}: resource is required`);
      if (!permission.action)
        errors.push(`Permission ${index}: action is required`);
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get bundle summary for a role
   */
  async getBundleSummary(role: Role): Promise<{
    role: Role;
    bundles: Array<{
      name: string;
      description: string;
      components: number;
      actions: number;
      hooks: number;
      routes: number;
    }>;
    metadata: {
      totalBundles: number;
      totalComponents: number;
      totalActions: number;
      totalHooks: number;
      totalRoutes: number;
      lastUpdated: string;
    };
  } | null> {
    const summaryFile = path.join(this.bundlesDir, role, "summary.json");

    try {
      const content = await fs.readFile(summaryFile, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Update bundle summary for a role
   */
  async updateBundleSummary(
    role: Role,
    bundles: FeatureBundle[]
  ): Promise<void> {
    const roleDir = path.join(this.bundlesDir, role);
    await fs.mkdir(roleDir, { recursive: true });

    const summary = {
      role,
      bundles: bundles.map((bundle) => ({
        name: bundle.name,
        description: bundle.description,
        components: bundle.components.length,
        actions: bundle.actions.length,
        hooks: bundle.hooks.length,
        routes: bundle.routes.length,
      })),
      metadata: {
        totalBundles: bundles.length,
        totalComponents: bundles.reduce(
          (sum, bundle) => sum + bundle.components.length,
          0
        ),
        totalActions: bundles.reduce(
          (sum, bundle) => sum + bundle.actions.length,
          0
        ),
        totalHooks: bundles.reduce(
          (sum, bundle) => sum + bundle.hooks.length,
          0
        ),
        totalRoutes: bundles.reduce(
          (sum, bundle) => sum + bundle.routes.length,
          0
        ),
        lastUpdated: new Date().toISOString(),
      },
    };

    const summaryFile = path.join(roleDir, "summary.json");
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
  }

  /**
   * Search bundles by name or description
   */
  async searchBundles(query: string, role?: Role): Promise<FeatureBundle[]> {
    const bundles = role
      ? await this.loadBundlesForRole(role)
      : Array.from((await this.loadAllBundles()).values()).flat();

    const lowerQuery = query.toLowerCase();

    return bundles.filter(
      (bundle) =>
        bundle.name.toLowerCase().includes(lowerQuery) ||
        bundle.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get bundles by category
   */
  async getBundlesByCategory(
    category: string,
    role?: Role
  ): Promise<FeatureBundle[]> {
    const bundles = role
      ? await this.loadBundlesForRole(role)
      : Array.from((await this.loadAllBundles()).values()).flat();

    return bundles.filter(
      (bundle) =>
        bundle.metadata.dependencies.includes(category) ||
        bundle.name.toLowerCase().includes(category)
    );
  }

  /**
   * Export bundles to a file
   */
  async exportBundles(outputPath: string, role?: Role): Promise<void> {
    const bundles = role
      ? await this.loadBundlesForRole(role)
      : Array.from((await this.loadAllBundles()).values()).flat();

    const exportData = {
      exportedAt: new Date().toISOString(),
      role: role || "all",
      bundles,
    };

    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
  }

  /**
   * Import bundles from a file
   */
  async importBundles(
    inputPath: string,
    role?: Role
  ): Promise<FeatureBundle[]> {
    const content = await fs.readFile(inputPath, "utf-8");
    const importData = JSON.parse(content);

    const bundles: FeatureBundle[] = importData.bundles || [];
    const targetRole = role || importData.role || "admin";

    // Validate and save each bundle
    const validBundles: FeatureBundle[] = [];

    for (const bundle of bundles) {
      const validation = this.validateBundle(bundle);
      if (validation.valid) {
        bundle.role = targetRole;
        await this.saveBundle(bundle, targetRole);
        validBundles.push(bundle);
      } else {
        console.warn(
          `Skipping invalid bundle ${bundle.name}: ${validation.errors.join(
            ", "
          )}`
        );
      }
    }

    return validBundles;
  }

  /**
   * Clean up old or invalid bundles
   */
  async cleanupBundles(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      const allBundles = await this.loadAllBundles();

      for (const [role, bundles] of allBundles) {
        for (const bundle of bundles) {
          const validation = this.validateBundle(bundle);
          if (!validation.valid) {
            await this.deleteBundle(bundle.name, role);
            cleaned++;
            errors.push(
              `Deleted invalid bundle ${
                bundle.name
              } for role ${role}: ${validation.errors.join(", ")}`
            );
          }
        }
      }
    } catch (error) {
      errors.push(`Cleanup failed: ${error}`);
    }

    return { cleaned, errors };
  }
}
