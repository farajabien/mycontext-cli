/**
 * Unified Context — Single Source of Truth
 * 
 * Merges the best of MegaContext (typed, deterministic scaffolding)
 * with Brain (narrative, registry, scan memory, checkpoints).
 * 
 * context.json can contain ANY combination of these sections.
 * PlanningMode and ContextSyncer work with whatever sections are present.
 */

import { ProjectConfig } from "./index";
import {
  MegaContext,
  RoleDefinition,
  PermissionRule,
  EntityDefinition,
  RelationshipDefinition,
  RouteNode,
  StoreDefinition,
} from "./mega-context";

// --- Brain Sections (for existing/scanned projects) ---

export interface BrainSection {
  version?: string;
  narrative?: string;           // What this project is about
  status?: string;              // "active" | "planning" | "archived"
  checkpoints?: Checkpoint[];
  updates?: any[];
  tasks?: any[];
  artifacts?: Record<string, any>;
  memory?: Record<string, any>; // Scan results, LLM assessments, etc.
  registry?: ComponentRegistry;
}

export interface Checkpoint {
  id: string;
  label: string;
  status: "complete" | "in-progress" | "planned";
}

export interface RegisteredComponent {
  name: string;
  description: string;
  path: string;
}

export interface ComponentRegistry {
  components: RegisteredComponent[];
}

export interface ArchitectureSection {
  type?: string;                // "monorepo" | "single-app" | etc
  packages?: Record<string, PackageInfo>;
}

export interface PackageInfo {
  name?: string;
  version?: string;
  description?: string;
  entrypoint?: string;
  techStack?: string[];
  modules?: Record<string, any>;
  exports?: string[];
}

export interface CapabilitiesSection {
  [key: string]: string;        // e.g. { "init": "Interactive TUI...", "scan": "Walk file tree..." }
}

// --- Unified Context ---

/**
 * The context.json file can contain any mix of these sections.
 * MegaContext fields are used for fresh scaffold projects.
 * Brain fields are used for existing/scanned projects.
 * Both can coexist.
 */
export interface UnifiedContext {
  // === Brain sections (for existing/scanned projects) ===
  brain?: BrainSection;
  architecture?: ArchitectureSection;
  capabilities?: CapabilitiesSection;

  // === MegaContext sections (for deterministic scaffolding) ===
  project?: ProjectConfig & {
    framework?: string;
    backend?: string;
    styling?: string;
    type?: string;              // "monorepo" | "single-app"
    techStack?: string[];
    targetStack?: string[];
  };

  topLevelDesign?: MegaContext["topLevelDesign"];
  auth?: MegaContext["auth"];
  database?: MegaContext["database"];
  routing?: MegaContext["routing"];
  globalState?: MegaContext["globalState"];

  // === Additional metadata ===
  experiments?: string[];
}

/**
 * Helper: Extract human-readable summary from any context shape
 */
export function getContextSummary(ctx: UnifiedContext): {
  name: string;
  description: string;
  entities: string[];
  routes: string[];
  roles: string[];
  components: RegisteredComponent[];
  checkpoints: Checkpoint[];
  capabilities: string[];
} {
  return {
    name: ctx.project?.name || ctx.brain?.narrative?.split(".")[0] || "Unknown",
    description: ctx.project?.description || ctx.brain?.narrative || "",
    entities: ctx.database?.entities
      ? Object.keys(ctx.database.entities)
      : [],
    routes: ctx.routing?.routes
      ? Object.keys(ctx.routing.routes)
      : [],
    roles: ctx.auth?.roles
      ? ctx.auth.roles.map((r) => r.name)
      : [],
    components: ctx.brain?.registry?.components || [],
    checkpoints: ctx.brain?.checkpoints || [],
    capabilities: ctx.capabilities
      ? Object.keys(ctx.capabilities)
      : [],
  };
}

/**
 * Helper: Check if context has MegaContext fields (scaffold-ready)
 */
export function isMegaContext(ctx: UnifiedContext): ctx is UnifiedContext & { database: any; routing: any; auth: any } {
  return !!ctx.database?.entities && !!ctx.routing?.routes && !!ctx.auth?.roles;
}

/**
 * Helper: Check if context has Brain fields (scanned project)
 */
export function isBrainContext(ctx: UnifiedContext): boolean {
  return !!ctx.brain?.narrative || !!ctx.brain?.registry || !!ctx.architecture;
}
