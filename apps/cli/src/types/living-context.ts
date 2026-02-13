import { ProjectConfig, Component, ActionDefinition, RouteDefinition } from "./index";

/**
 * LivingContext: The structured "Living Brain" of a MyContext project.
 * This JSON represents the single source of truth for all agents.
 */
export interface LivingContext {
  metadata: {
    version: string;
    generatedAt: string;
    lastUpdatedAt: string;
    projectConfig: ProjectConfig;
  };

  // 01-prd content
  prd: {
    title: string;
    problemStatement: string;
    goals: string[];
    nonGoals?: string[];
    targetAudience: string;
    successMetrics: string[];
  };

  // 01a-features content
  features: Array<{
    id: string;
    name: string;
    description: string;
    priority: "high" | "medium" | "low";
    userValue: string;
    acceptanceCriteria: string[];
    dependencies: string[]; // Feature IDs or component names
  }>;

  // 01b-user-flows content
  flows: Array<{
    id: string;
    name: string;
    description: string;
    steps: string[];
    actors: string[];
  }>;

  // 01c-edge-cases content
  edgeCases: Array<{
    id: string;
    category: string;
    description: string;
    mitigation: string;
  }>;

  // 01d-technical-specs content
  specs: {
    architecture: string;
    techStack: {
      frontend: string[];
      backend: string[];
      database: string[];
      other: string[];
    };
    apiEndpoints: Array<{
      path: string;
      method: string;
      description: string;
      authRequired: boolean;
    }>;
    databaseSchema: {
      tables: Array<{
        name: string;
        columns: Array<{
          name: string;
          type: string;
          constraints?: string[];
        }>;
      }>;
    };
  };

  // Component manifest (merged from brand and generation)
  components: Array<Component & {
    path?: string;
    status: "planned" | "generated" | "verified";
  }>;

  // Logic/Actions (Living Brain core)
  actions: ActionDefinition[];
  
  // Routes/Pages
  routes: RouteDefinition[];
}
