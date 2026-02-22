import { ASL } from "../types/asl";
import * as path from "path";
import * as fs from "fs-extra";

export interface ShadCNComponentMetadata {
  name: string;
  version: string;
  installedAt: string;
}

export interface CustomComponentMetadata {
  name: string;
  type: 'auth' | 'entity' | 'custom';
  path: string;
  shadcnDeps: string[];
  props?: Record<string, string>;
  createdAt: string;
  lastModified?: string;
  usedIn: string[];
}

export interface ComponentRegistryData {
  version: string;
  shadcnComponents: ShadCNComponentMetadata[];
  customComponents: CustomComponentMetadata[];
  stats: {
    totalShadCN: number;
    totalCustom: number;
  };
}

/**
 * ComponentRegistry - Track all components in the project
 *
 * Maintains .mycontext/components_registry.json with metadata about:
 * - Installed shadCN components
 * - Custom generated components
 * - Component dependencies and usage
 *
 * Enables:
 * - LEGO assembly (component reuse)
 * - Token usage tracking
 * - Avoiding duplicate installations
 */
export class ComponentRegistry {
  /**
   * Initialize component registry for a new project
   */
  async initialize(
    projectPath: string,
    asl: ASL,
    shadcnComponents: string[]
  ): Promise<void> {
    const registry: ComponentRegistryData = {
      version: '1.0',
      shadcnComponents: shadcnComponents.map(name => ({
        name,
        version: 'latest',
        installedAt: new Date().toISOString()
      })),
      customComponents: [],
      stats: {
        totalShadCN: shadcnComponents.length,
        totalCustom: 0
      }
    };

    const registryPath = path.join(projectPath, '.mycontext', 'components_registry.json');
    await fs.ensureDir(path.dirname(registryPath));
    await fs.writeJSON(registryPath, registry, { spaces: 2 });
  }

  /**
   * Register a custom component
   */
  async registerComponent(
    projectPath: string,
    component: CustomComponentMetadata
  ): Promise<void> {
    const registryPath = path.join(projectPath, '.mycontext', 'components_registry.json');

    // Load existing registry
    const registry: ComponentRegistryData = await fs.readJSON(registryPath);

    // Add component
    registry.customComponents.push(component);
    registry.stats.totalCustom = registry.customComponents.length;

    // Save
    await fs.writeJSON(registryPath, registry, { spaces: 2 });
  }

  /**
   * Check if a shadCN component is installed
   */
  async has(projectPath: string, componentName: string): Promise<boolean> {
    try {
      const registryPath = path.join(projectPath, '.mycontext', 'components_registry.json');
      const registry: ComponentRegistryData = await fs.readJSON(registryPath);
      return registry.shadcnComponents.some(c => c.name === componentName);
    } catch {
      return false;
    }
  }

  /**
   * Get all custom components of a specific type
   */
  async findByType(
    projectPath: string,
    type: CustomComponentMetadata['type']
  ): Promise<CustomComponentMetadata[]> {
    try {
      const registryPath = path.join(projectPath, '.mycontext', 'components_registry.json');
      const registry: ComponentRegistryData = await fs.readJSON(registryPath);
      return registry.customComponents.filter(c => c.type === type);
    } catch {
      return [];
    }
  }

  /**
   * Get registry stats
   */
  async getStats(projectPath: string): Promise<ComponentRegistryData['stats'] | null> {
    try {
      const registryPath = path.join(projectPath, '.mycontext', 'components_registry.json');
      const registry: ComponentRegistryData = await fs.readJSON(registryPath);
      return registry.stats;
    } catch {
      return null;
    }
  }
}
