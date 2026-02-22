import { ASL, EntitySpec, PageSpec } from "../types/asl";
import * as path from "path";
import * as fs from "fs-extra";

export interface ShadCNComponent {
  name: string;
  dependencies: string[];
  useCases: string[];
  description: string;
  required: boolean;
}

export interface ShadCNCatalog {
  components: ShadCNComponent[];
  metadata: {
    version: string;
    totalComponents: number;
    lastUpdated: string;
  };
}

/**
 * ComponentInferenceEngine - Smart inference of needed shadCN components
 *
 * Analyzes ASL specification to determine which shadCN UI components
 * are needed for the project. Automatically resolves dependencies.
 *
 * Benefits:
 * - Only installs what's needed (saves tokens and time)
 * - Resolves dependencies automatically
 * - Provides reasoning for each component choice
 */
export class ComponentInferenceEngine {
  private catalog: ShadCNCatalog;

  constructor() {
    this.catalog = this.loadCatalog();
  }

  /**
   * Infer which shadCN components are needed based on ASL
   * Returns array of component names to install
   */
  inferNeededComponents(asl: ASL): string[] {
    const needed = new Set<string>();

    // Base components (always needed for any app)
    needed.add('button');
    needed.add('card');

    // Auth-based components
    if (asl.auth) {
      needed.add('form');
      needed.add('input');
      needed.add('label');
      needed.add('toast'); // for error messages
    }

    // Entity CRUD forms
    if (asl.entities && Object.keys(asl.entities).length > 0) {
      needed.add('form');
      needed.add('input');
      needed.add('textarea'); // for long text fields
      needed.add('select'); // for references/dropdowns
      needed.add('dialog'); // for create/edit modals
      needed.add('label');
    }

    // List views (tables for data display)
    if (this.hasListViews(asl)) {
      needed.add('table');
    }

    // Admin/RBAC features
    if (this.hasAdminFeatures(asl)) {
      needed.add('dropdown-menu'); // for actions
      needed.add('badge'); // for status/roles
    }

    // Resolve dependencies (e.g., form needs button, label)
    return this.resolveDependencies(needed);
  }

  /**
   * Check if ASL has list/table views
   */
  private hasListViews(asl: ASL): boolean {
    // Entities imply list views
    if (asl.entities && Object.keys(asl.entities).length > 0) {
      return true;
    }

    // Check for explicit list pages
    return asl.pages.some(p =>
      p.path.includes('/list') ||
      this.isEntityListPage(p, asl.entities)
    );
  }

  /**
   * Check if a page is an entity list page
   */
  private isEntityListPage(page: PageSpec, entities: Record<string, EntitySpec>): boolean {
    if (!entities) return false;
    const entityNames = Object.keys(entities).map(name => name.toLowerCase() + 's');
    return entityNames.some(name => page.path.includes('/' + name));
  }

  /**
   * Check if ASL has admin/RBAC features
   */
  private hasAdminFeatures(asl: ASL): boolean {
    if (!asl.permissions) return false;
    return asl.permissions.some(p =>
      p.role === 'admin' ||
      p.role === 'moderator' ||
      p.actions.includes('manage')
    );
  }

  /**
   * Resolve component dependencies
   * E.g., if we need 'form', we also need 'button' and 'label'
   */
  private resolveDependencies(components: Set<string>): string[] {
    const resolved = new Set(components);

    // Keep resolving until no new dependencies are added
    let changed = true;
    while (changed) {
      changed = false;
      const current = Array.from(resolved);

      for (const comp of current) {
        const definition = this.catalog.components.find(c => c.name === comp);
        if (definition) {
          for (const dep of definition.dependencies) {
            if (!resolved.has(dep)) {
              resolved.add(dep);
              changed = true;
            }
          }
        }
      }
    }

    // Return sorted array
    return Array.from(resolved).sort();
  }

  /**
   * Load shadCN component catalog
   */
  private loadCatalog(): ShadCNCatalog {
    try {
      const catalogPath = path.join(__dirname, '../config/shadcn-catalog.json');
      return fs.readJSONSync(catalogPath);
    } catch (error) {
      // Return minimal catalog if file doesn't exist yet
      return this.getDefaultCatalog();
    }
  }

  /**
   * Default catalog (used if shadcn-catalog.json doesn't exist yet)
   */
  private getDefaultCatalog(): ShadCNCatalog {
    return {
      components: [
        {
          name: 'button',
          dependencies: [],
          useCases: ['forms', 'actions', 'navigation'],
          description: 'Interactive button component with variants',
          required: true
        },
        {
          name: 'form',
          dependencies: ['label', 'button'],
          useCases: ['auth', 'crud', 'settings'],
          description: 'Form wrapper with validation support',
          required: false
        },
        {
          name: 'input',
          dependencies: ['label'],
          useCases: ['auth', 'forms'],
          description: 'Text input field',
          required: false
        },
        {
          name: 'card',
          dependencies: [],
          useCases: ['lists', 'dashboard'],
          description: 'Container with header, content, footer',
          required: false
        },
        {
          name: 'table',
          dependencies: [],
          useCases: ['lists', 'admin', 'data-display'],
          description: 'Data table component',
          required: false
        },
        {
          name: 'dialog',
          dependencies: ['button'],
          useCases: ['modals', 'forms', 'confirmations'],
          description: 'Modal dialog component',
          required: false
        },
        {
          name: 'toast',
          dependencies: [],
          useCases: ['notifications', 'feedback'],
          description: 'Toast notification system',
          required: false
        },
        {
          name: 'select',
          dependencies: [],
          useCases: ['forms', 'filters'],
          description: 'Dropdown select component',
          required: false
        },
        {
          name: 'label',
          dependencies: [],
          useCases: ['forms'],
          description: 'Form label component',
          required: false
        },
        {
          name: 'textarea',
          dependencies: ['label'],
          useCases: ['forms', 'comments'],
          description: 'Multi-line text input',
          required: false
        },
        {
          name: 'dropdown-menu',
          dependencies: ['button'],
          useCases: ['navigation', 'actions', 'admin'],
          description: 'Dropdown menu component',
          required: false
        },
        {
          name: 'badge',
          dependencies: [],
          useCases: ['status', 'labels', 'counts'],
          description: 'Badge/pill component for status',
          required: false
        }
      ],
      metadata: {
        version: 'latest',
        totalComponents: 12,
        lastUpdated: '2026-02-22'
      }
    };
  }

  /**
   * Explain why each component was chosen
   */
  explainChoices(asl: ASL): Map<string, string> {
    const explanations = new Map<string, string>();
    const components = this.inferNeededComponents(asl);

    components.forEach(comp => {
      const definition = this.catalog.components.find(c => c.name === comp);
      if (!definition) return;

      if (comp === 'button' || comp === 'card') {
        explanations.set(comp, 'Always needed for UI');
      } else if (asl.auth && ['form', 'input', 'label', 'toast'].includes(comp)) {
        explanations.set(comp, 'Required for authentication');
      } else if (asl.entities && Object.keys(asl.entities).length > 0 && ['textarea', 'select', 'dialog'].includes(comp)) {
        explanations.set(comp, 'Required for CRUD forms');
      } else if (comp === 'table') {
        explanations.set(comp, 'Required for entity lists');
      } else if (this.hasAdminFeatures(asl) && ['dropdown-menu', 'badge'].includes(comp)) {
        explanations.set(comp, 'Required for admin features');
      } else {
        // Dependency
        const parent = components.find(c => {
          const def = this.catalog.components.find(d => d.name === c);
          return def?.dependencies.includes(comp);
        });
        if (parent) {
          explanations.set(comp, `Dependency of ${parent}`);
        } else {
          explanations.set(comp, definition.description);
        }
      }
    });

    return explanations;
  }
}
