/**
 * Feature Bundle Types
 *
 * Defines the structure for feature bundles that combine components,
 * types, actions, hooks, and routes into complete working features.
 */

import {
  Role,
  Resource,
  Action,
  PermissionOperator,
  Permission,
  PermissionCondition,
} from "./role-permissions";

export interface FeatureBundle {
  name: string;
  description: string;
  role: Role;
  components: string[];
  types: string[];
  actions: ServerAction[];
  hooks: CustomHook[];
  routes: APIRoute[];
  database: {
    schema: string;
    queries: string[];
    mutations: string[];
  };
  permissions: Permission[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    dependencies: string[];
  };
}

export interface ServerAction {
  name: string;
  description: string;
  file: string;
  function: string;
  parameters: ActionParameter[];
  returnType: string;
  permissions: string[];
  validation?: ActionValidation;
}

export interface ActionParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface ActionValidation {
  schema: any; // JSON Schema
  rules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: "required" | "minLength" | "maxLength" | "pattern" | "custom";
  value?: any;
  message: string;
}

export interface CustomHook {
  name: string;
  description: string;
  file: string;
  function: string;
  parameters: HookParameter[];
  returnType: string;
  dependencies: string[];
}

export interface HookParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface APIRoute {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description: string;
  file: string;
  function: string;
  parameters: RouteParameter[];
  responseType: string;
  permissions: string[];
  middleware?: string[];
}

export interface RouteParameter {
  name: string;
  type: "query" | "body" | "params" | "headers";
  dataType: string;
  required: boolean;
  description?: string;
}

export interface FeatureTemplate {
  name: string;
  description: string;
  category:
    | "authentication"
    | "user-management"
    | "content"
    | "settings"
    | "analytics"
    | "communication";
  components: ComponentTemplate[];
  actions: ActionTemplate[];
  hooks: HookTemplate[];
  routes: RouteTemplate[];
  database: DatabaseTemplate;
  permissions: PermissionTemplate[];
  dependencies: string[];
  setupInstructions: string[];
}

export interface ComponentTemplate {
  name: string;
  type: "page" | "component" | "layout" | "form" | "modal" | "table" | "card";
  description: string;
  props: ComponentProp[];
  children?: string[];
  dependencies: string[];
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface ActionTemplate {
  name: string;
  description: string;
  type: "server" | "client" | "api";
  parameters: ActionParameter[];
  returnType: string;
  permissions: string[];
}

export interface HookTemplate {
  name: string;
  description: string;
  type: "data" | "ui" | "form" | "api" | "auth";
  parameters: HookParameter[];
  returnType: string;
  dependencies: string[];
}

export interface RouteTemplate {
  path: string;
  method: string;
  description: string;
  parameters: RouteParameter[];
  responseType: string;
  permissions: string[];
}

export interface DatabaseTemplate {
  tables: TableTemplate[];
  relationships: RelationshipTemplate[];
  indexes: IndexTemplate[];
}

export interface TableTemplate {
  name: string;
  description: string;
  columns: ColumnTemplate[];
  primaryKey: string[];
  uniqueKeys: string[][];
}

export interface ColumnTemplate {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  description?: string;
  constraints?: string[];
}

export interface RelationshipTemplate {
  from: {
    table: string;
    column: string;
  };
  to: {
    table: string;
    column: string;
  };
  type: "one-to-one" | "one-to-many" | "many-to-many";
  onDelete?: "cascade" | "set-null" | "restrict";
}

export interface IndexTemplate {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type?: "btree" | "hash" | "gin" | "gist";
}

export interface PermissionTemplate {
  role: string;
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
}

export interface FeatureAssemblyOptions {
  fromComponents?: boolean;
  useStarter?: boolean;
  role?: "admin" | "user" | "guest";
  feature?: string;
  output?: string;
  template?: string;
  includeTests?: boolean;
  includeDocs?: boolean;
  verbose?: boolean;
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

export interface AdminStarterBundle {
  name: string;
  description: string;
  version: string;
  source: string;
  features: string[];
  stack: {
    framework: string;
    database: string;
    ui: string;
    auth: string;
    deployment?: string;
  };
  setup: {
    commands: string[];
    environment: Record<string, string>;
    dependencies: string[];
  };
  structure: {
    directories: string[];
    files: string[];
    configs: string[];
  };
  featureTemplates: {
    [key: string]: FeatureTemplate;
  };
}
