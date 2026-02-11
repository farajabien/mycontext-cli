/**
 * Role Permission Mapper
 *
 * Maps features, components, actions, and routes to role-based permissions
 * for the Feature Assembly system.
 */

import {
  Role,
  RoleDefinition,
  Permission,
  RoleHierarchy,
} from "../types/role-permissions";
import { FeatureBundle, FeatureTemplate } from "../types/feature-bundle";

export class RolePermissionMapper {
  private roleHierarchy: RoleHierarchy;

  constructor(roleHierarchy: RoleHierarchy) {
    this.roleHierarchy = roleHierarchy;
  }

  /**
   * Map feature to role-based configuration
   */
  mapFeatureToRoles(feature: FeatureBundle): Map<Role, FeatureBundle> {
    const roleFeatures = new Map<Role, FeatureBundle>();

    for (const role of this.roleHierarchy.roles) {
      const roleFeature = this.createRoleFeature(feature, role.name);
      roleFeatures.set(role.name, roleFeature);
    }

    return roleFeatures;
  }

  /**
   * Map component to permissions for a specific role
   */
  mapComponentToPermissions(component: string, role: Role): Permission[] {
    const roleDefinition = this.getRoleDefinition(role);
    if (!roleDefinition) return [];

    const permissions: Permission[] = [];
    const componentName = component.toLowerCase();

    // Map component to resource type
    const resourceType = this.mapComponentToResource(componentName);

    // Get permissions for this resource type and role
    const rolePermissions = roleDefinition.permissions.filter(
      (p) => p.resource === resourceType || p.resource === "all"
    );

    // Convert to component-specific permissions
    for (const rolePermission of rolePermissions) {
      permissions.push({
        id: `${component}-${role}-${rolePermission.action}`,
        resource: resourceType as any,
        action: rolePermission.action,
        conditions: rolePermission.conditions,
        description: `${rolePermission.action} access to ${component} component`,
      });
    }

    return permissions;
  }

  /**
   * Map action to permissions for a specific role
   */
  mapActionToPermissions(action: string, role: Role): Permission[] {
    const roleDefinition = this.getRoleDefinition(role);
    if (!roleDefinition) return [];

    const permissions: Permission[] = [];
    const actionName = action.toLowerCase();

    // Map action to resource type
    const resourceType = this.mapActionToResource(actionName);

    // Get permissions for this resource type and role
    const rolePermissions = roleDefinition.permissions.filter(
      (p) => p.resource === resourceType || p.resource === "all"
    );

    // Convert to action-specific permissions
    for (const rolePermission of rolePermissions) {
      permissions.push({
        id: `${action}-${role}-${rolePermission.action}`,
        resource: resourceType as any,
        action: rolePermission.action,
        conditions: rolePermission.conditions,
        description: `${rolePermission.action} access to ${action} action`,
      });
    }

    return permissions;
  }

  /**
   * Map route to permissions for a specific role
   */
  mapRouteToPermissions(route: string, role: Role): Permission[] {
    const roleDefinition = this.getRoleDefinition(role);
    if (!roleDefinition) return [];

    const permissions: Permission[] = [];
    const routePath = route.toLowerCase();

    // Map route to resource type
    const resourceType = this.mapRouteToResource(routePath);

    // Get permissions for this resource type and role
    const rolePermissions = roleDefinition.permissions.filter(
      (p) => p.resource === resourceType || p.resource === "all"
    );

    // Convert to route-specific permissions
    for (const rolePermission of rolePermissions) {
      permissions.push({
        id: `${route}-${role}-${rolePermission.action}`,
        resource: resourceType as any,
        action: rolePermission.action,
        conditions: rolePermission.conditions,
        description: `${rolePermission.action} access to ${route} route`,
      });
    }

    return permissions;
  }

  /**
   * Generate role-based code for a feature
   */
  generateRoleBasedCode(
    feature: FeatureBundle,
    role: Role,
    config: any
  ): string {
    const roleDefinition = this.getRoleDefinition(role);
    if (!roleDefinition) return "";

    const code = `
// Generated code for ${feature.name} - ${role} role
// Generated at: ${new Date().toISOString()}

import { Permission } from '../types/role-permissions';

export const ${feature.name}${
      role.charAt(0).toUpperCase() + role.slice(1)
    }Config = {
  role: '${role}',
  permissions: [
${this.generatePermissionCode(feature.permissions, role)}
  ],
  components: [
${feature.components.map((comp) => `    '${comp}'`).join(",\n")}
  ],
  actions: [
${feature.actions.map((action) => `    '${action.name}'`).join(",\n")}
  ],
  routes: [
${feature.routes.map((route) => `    '${route.path}'`).join(",\n")}
  ]
};

export const ${feature.name}${
      role.charAt(0).toUpperCase() + role.slice(1)
    }Permissions: Permission[] = [
${this.generatePermissionCode(feature.permissions, role)}
];
`;

    return code;
  }

  /**
   * Check if a role has permission for a specific action
   */
  hasPermission(role: Role, resource: string, action: string): boolean {
    const roleDefinition = this.getRoleDefinition(role);
    if (!roleDefinition) return false;

    return roleDefinition.permissions.some(
      (p) =>
        (p.resource === resource || p.resource === "all") && p.action === action
    );
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: Role): Permission[] {
    const roleDefinition = this.getRoleDefinition(role);
    if (!roleDefinition) return [];

    return roleDefinition.permissions;
  }

  /**
   * Get inherited permissions for a role
   */
  getInheritedPermissions(role: Role): Permission[] {
    const roleDefinition = this.getRoleDefinition(role);
    if (!roleDefinition || !roleDefinition.inherits) return [];

    const inheritedPermissions: Permission[] = [];

    for (const parentRole of roleDefinition.inherits) {
      const parentPermissions = this.getRolePermissions(parentRole);
      inheritedPermissions.push(...parentPermissions);
    }

    return inheritedPermissions;
  }

  /**
   * Create a role-specific feature from a base feature
   */
  private createRoleFeature(
    baseFeature: FeatureBundle,
    role: Role
  ): FeatureBundle {
    const roleDefinition = this.getRoleDefinition(role);
    if (!roleDefinition) return baseFeature;

    // Create a copy of the base feature
    const roleFeature: FeatureBundle = JSON.parse(JSON.stringify(baseFeature));

    // Update role
    roleFeature.role = role;

    // Filter components based on role permissions
    roleFeature.components = roleFeature.components.filter((component) =>
      this.hasComponentPermission(component, role)
    );

    // Filter actions based on role permissions
    roleFeature.actions = roleFeature.actions.filter((action) =>
      this.hasActionPermission(action.name, role)
    );

    // Filter hooks based on role permissions
    roleFeature.hooks = roleFeature.hooks.filter((hook) =>
      this.hasHookPermission(hook.name, role)
    );

    // Filter routes based on role permissions
    roleFeature.routes = roleFeature.routes.filter((route) =>
      this.hasRoutePermission(route.path, role)
    );

    // Update permissions to match role
    roleFeature.permissions = roleFeature.permissions.filter((permission) =>
      this.hasPermission(role, permission.resource, permission.action)
    );

    // Add role-specific restrictions
    roleFeature.permissions = this.applyRoleRestrictions(
      roleFeature.permissions,
      roleDefinition
    );

    return roleFeature;
  }

  /**
   * Map component name to resource type
   */
  private mapComponentToResource(component: string): string {
    if (component.includes("admin") || component.includes("manage"))
      return "admin";
    if (component.includes("user") || component.includes("profile"))
      return "users";
    if (component.includes("post") || component.includes("content"))
      return "posts";
    if (component.includes("comment")) return "comments";
    if (component.includes("setting")) return "settings";
    if (component.includes("analytics") || component.includes("dashboard"))
      return "analytics";
    if (component.includes("file")) return "files";
    if (component.includes("notification")) return "notifications";
    if (component.includes("report")) return "reports";
    if (component.includes("audit")) return "audit-logs";

    return "public";
  }

  /**
   * Map action name to resource type
   */
  private mapActionToResource(action: string): string {
    if (action.includes("user")) return "users";
    if (action.includes("post")) return "posts";
    if (action.includes("comment")) return "comments";
    if (action.includes("setting")) return "settings";
    if (action.includes("analytics")) return "analytics";
    if (action.includes("file")) return "files";
    if (action.includes("notification")) return "notifications";
    if (action.includes("report")) return "reports";
    if (action.includes("audit")) return "audit-logs";

    return "public";
  }

  /**
   * Map route path to resource type
   */
  private mapRouteToResource(route: string): string {
    if (route.includes("/users")) return "users";
    if (route.includes("/posts")) return "posts";
    if (route.includes("/comments")) return "comments";
    if (route.includes("/settings")) return "settings";
    if (route.includes("/analytics")) return "analytics";
    if (route.includes("/files")) return "files";
    if (route.includes("/notifications")) return "notifications";
    if (route.includes("/reports")) return "reports";
    if (route.includes("/audit")) return "audit-logs";

    return "public";
  }

  /**
   * Check if a role has permission for a component
   */
  private hasComponentPermission(component: string, role: Role): boolean {
    const resourceType = this.mapComponentToResource(component.toLowerCase());
    return this.hasPermission(role, resourceType, "read");
  }

  /**
   * Check if a role has permission for an action
   */
  private hasActionPermission(action: string, role: Role): boolean {
    const resourceType = this.mapActionToResource(action.toLowerCase());
    return (
      this.hasPermission(role, resourceType, "create") ||
      this.hasPermission(role, resourceType, "update") ||
      this.hasPermission(role, resourceType, "delete")
    );
  }

  /**
   * Check if a role has permission for a hook
   */
  private hasHookPermission(hook: string, role: Role): boolean {
    const resourceType = this.mapActionToResource(hook.toLowerCase());
    return this.hasPermission(role, resourceType, "read");
  }

  /**
   * Check if a role has permission for a route
   */
  private hasRoutePermission(route: string, role: Role): boolean {
    const resourceType = this.mapRouteToResource(route.toLowerCase());
    return (
      this.hasPermission(role, resourceType, "read") ||
      this.hasPermission(role, resourceType, "create") ||
      this.hasPermission(role, resourceType, "update") ||
      this.hasPermission(role, resourceType, "delete")
    );
  }

  /**
   * Apply role-specific restrictions to permissions
   */
  private applyRoleRestrictions(
    permissions: Permission[],
    roleDefinition: RoleDefinition
  ): Permission[] {
    return permissions.map((permission) => {
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

  /**
   * Generate permission code for a role
   */
  private generatePermissionCode(
    permissions: Permission[],
    role: Role
  ): string {
    return permissions
      .filter((p) => this.hasPermission(role, p.resource, p.action))
      .map(
        (permission) => `    {
      id: '${permission.id}',
      resource: '${permission.resource}',
      action: '${permission.action}',
      conditions: ${JSON.stringify(permission.conditions || [])},
      description: '${permission.description}'
    }`
      )
      .join(",\n");
  }

  /**
   * Get role definition by name
   */
  private getRoleDefinition(role: Role): RoleDefinition | undefined {
    return this.roleHierarchy.roles.find((r) => r.name === role);
  }
}
