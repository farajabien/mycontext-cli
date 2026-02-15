import { ProjectConfig } from "./index";

/**
 * MEGA CONTEXT (The Source of Truth)
 * 
 * This interface represents the 100% complete state required to
 * deterministically scaffold a Next.js + InstantDB project.
 * 
 * "Deterministic" means:
 * - No AI guessing during scaffold.
 * - All routes, components, and data points are known.
 * - If a field is missing, the TUI must prompt for it BEFORE generation.
 */
export interface MegaContext {
  // 1. Project Metadata
  project: ProjectConfig & {
    framework: "nextjs";
    backend: "instantdb";
    styling: "tailwind-shadcn";
  };

  // 2. Branding & Design System
  topLevelDesign: {
    theme: "light" | "dark" | "system";
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      foreground: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
    radius: number; // Border radius for ShadCN
  };

  // 3. Authentication & Permissions
  auth: {
    provider: "instantdb" | "clerk" | "kinde" | "next-auth"; // Default: instantdb
    userModel: {
      fields: Record<string, string>; // e.g. { "phoneNumber": "string", "isVerified": "boolean" }
    };
    roles: RoleDefinition[];
    permissions: PermissionRule[];
  };

  // 4. Database Schema (InstantDB)
  // We define this structurally so we can generate `instant.schema.ts` accurately
  database: {
    entities: Record<string, EntityDefinition>;
    relationships: RelationshipDefinition[];
  };

  // 5. Routing & Page Structure (Next.js App Router)
  // A recursive tree of routes
  routing: {
    routes: Record<string, RouteNode>; // Key is path, e.g. "/dashboard/settings"
  };

  // 6. State Management (Global)
  // e.g. Zustand stores needed
  globalState: {
    stores: StoreDefinition[];
  };
}

// --- Sub-types ---

export interface RoleDefinition {
  name: string; // e.g. "admin", "tenant", "landlord"
  description: string;
  extends?: string; // Inherits permissions from another role
}

export interface PermissionRule {
  role: string;
  resource: string; // e.g. "properties", "users"
  action: "create" | "read" | "update" | "delete" | "manage";
  condition?: string; // e.g. "auth.id == resource.ownerId" (InstantDB Cel format)
}

export interface EntityDefinition {
  name: string; // e.g. "profiles", "goals"
  fields: Record<string, {
    type: "string" | "number" | "boolean" | "json" | "date" | "ref";
    required: boolean;
    unique?: boolean;
    indexed?: boolean;
  }>;
}

export interface RelationshipDefinition {
  from: string; // Entity name
  to: string;   // Entity name
  type: "one-to-one" | "one-to-many" | "many-to-many";
  inverseName: string; // e.g. "posts" <-> "author"
}

export interface RouteNode {
  path: string; // "/dashboard"
  type: "page" | "layout" | "group"; // group = (folder)
  isProtected: boolean;
  allowedRoles?: string[];
  
  // Page Requirements
  ui?: {
    title: string;
    description: string;
    layout?: "default" | "dashboard" | "auth";
    components: ComponentUsage[]; 
  };
  
  // Data Requirements
  data?: {
    queries: DataQuery[]; // Data to fetch on server/client
    mutations: DataMutation[]; // Server actions available
  };
}

export interface ComponentUsage {
  name: string; // e.g. "Header", "PropertyCard"
  type: "shadcn" | "custom";
  props?: Record<string, any>;
  children?: ComponentUsage[]; // For composition
}

export interface DataQuery {
  name: string; // e.g. "getUserProfile"
  entity: string;
  source: "server-component" | "client-hook";
  filter?: Record<string, any>;
}

export interface DataMutation {
  name: string; // e.g. "updateProfile"
  description: string;
  args: Record<string, string>;
  inputEntity?: string;
}

export interface StoreDefinition {
  name: string; // e.g. "useCartStore"
  state: Record<string, string>; // { "items": "CartItem[]" }
  actions: string[]; // ["addItem", "removeItem"]
}
