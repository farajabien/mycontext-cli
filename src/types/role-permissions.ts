/**
 * Role-Based Permission Types
 *
 * Defines the permission system for role-based access control
 * in the Feature Assembly system.
 */

export type Role = "admin" | "user" | "guest" | "moderator" | "editor";

export type Resource =
  | "users"
  | "posts"
  | "comments"
  | "settings"
  | "analytics"
  | "files"
  | "notifications"
  | "reports"
  | "audit-logs";

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage"
  | "approve"
  | "reject"
  | "export"
  | "import";

export interface Permission {
  id: string;
  resource: Resource;
  action: Action;
  conditions?: PermissionCondition[];
  description?: string;
  metadata?: Record<string, any>;
}

export interface PermissionCondition {
  field: string;
  operator: PermissionOperator;
  value: any;
  description?: string;
}

export type PermissionOperator =
  | "equals"
  | "notEquals"
  | "in"
  | "notIn"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "between"
  | "isNull"
  | "isNotNull";

export interface RoleDefinition {
  name: Role;
  displayName: string;
  description: string;
  level: number; // 0 = guest, 1 = user, 2 = editor, 3 = moderator, 4 = admin
  permissions: Permission[];
  inherits?: Role[];
  restrictions?: PermissionRestriction[];
  metadata?: {
    color?: string;
    icon?: string;
    badge?: string;
  };
}

export interface PermissionRestriction {
  resource: Resource;
  action: Action;
  reason: string;
  conditions?: PermissionCondition[];
}

export interface RoleHierarchy {
  roles: RoleDefinition[];
  inheritance: RoleInheritance[];
  defaultRole: Role;
  fallbackRole: Role;
}

export interface RoleInheritance {
  child: Role;
  parent: Role;
  type: "full" | "partial" | "conditional";
  conditions?: PermissionCondition[];
}

export interface PermissionCheck {
  role: Role;
  resource: Resource;
  action: Action;
  context?: PermissionContext;
  result: boolean;
  reason?: string;
  conditions?: PermissionCondition[];
}

export interface PermissionContext {
  userId?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RolePermissionMatrix {
  [role: string]: {
    [resource: string]: Action[];
  };
}

export interface FeaturePermission {
  feature: string;
  role: Role;
  access: "full" | "read-only" | "none";
  restrictions?: string[];
  customPermissions?: Permission[];
}

export interface PermissionPolicy {
  name: string;
  description: string;
  rules: PermissionRule[];
  exceptions?: PermissionException[];
  metadata?: Record<string, any>;
}

export interface PermissionRule {
  id: string;
  name: string;
  description: string;
  conditions: PermissionCondition[];
  actions: PermissionAction[];
  priority: number;
  enabled: boolean;
}

export interface PermissionAction {
  type: "allow" | "deny" | "require-approval";
  resource: Resource;
  action: Action;
  conditions?: PermissionCondition[];
}

export interface PermissionException {
  id: string;
  ruleId: string;
  conditions: PermissionCondition[];
  action: "allow" | "deny";
  reason: string;
  expiresAt?: string;
}

export interface RoleAssignment {
  userId: string;
  role: Role;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
  conditions?: PermissionCondition[];
  metadata?: Record<string, any>;
}

export interface PermissionAudit {
  id: string;
  userId: string;
  action: string;
  resource: Resource;
  result: "allowed" | "denied";
  reason?: string;
  timestamp: string;
  context?: PermissionContext;
  metadata?: Record<string, any>;
}

export interface RoleBasedFeatureConfig {
  feature: string;
  roles: {
    [role in Role]?: {
      enabled: boolean;
      permissions: Permission[];
      restrictions?: string[];
      customizations?: Record<string, any>;
    };
  };
  defaultRole: Role;
  fallbackRole: Role;
}

export interface PermissionManager {
  checkPermission(
    role: Role,
    resource: Resource,
    action: Action,
    context?: PermissionContext
  ): Promise<PermissionCheck>;

  getUserRoles(userId: string): Promise<Role[]>;

  assignRole(userId: string, role: Role, assignedBy: string): Promise<void>;

  revokeRole(userId: string, role: Role, revokedBy: string): Promise<void>;

  getRolePermissions(role: Role): Promise<Permission[]>;

  createRole(role: RoleDefinition): Promise<void>;

  updateRole(role: RoleDefinition): Promise<void>;

  deleteRole(role: Role): Promise<void>;

  auditPermission(
    userId: string,
    resource: Resource,
    action: Action,
    result: "allowed" | "denied",
    context?: PermissionContext
  ): Promise<void>;
}

export interface RolePermissionMapper {
  mapFeatureToRoles(feature: string): RoleBasedFeatureConfig;

  mapComponentToPermissions(component: string, role: Role): Permission[];

  mapActionToPermissions(action: string, role: Role): Permission[];

  mapRouteToPermissions(route: string, role: Role): Permission[];

  generateRoleBasedCode(
    feature: string,
    role: Role,
    config: RoleBasedFeatureConfig
  ): string;
}
