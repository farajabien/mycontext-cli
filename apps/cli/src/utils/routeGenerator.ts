import {
  RouteDefinition,
  EnhancedComponent,
  ActionDefinition,
  ServerActionDefinition,
} from "../types";

/**
 * Route Generator
 * Generates Next.js App Router routes based on component hierarchy
 */
export class RouteGenerator {
  /**
   * Generate routes for a component
   */
  async generateRoutes(
    component: EnhancedComponent,
    level: number,
    parentPath: string = ""
  ): Promise<RouteDefinition[]> {
    const routes: RouteDefinition[] = [];

    // Root level components get root route
    if (level === 0) {
      routes.push(this.generateRootRoute(component));
    }

    // Feature-level components get their own routes
    if (component.type === "layout" && level === 1) {
      routes.push(this.generateFeatureRoute(component, parentPath));
    }

    // Form components get specific routes
    if (component.type === "form") {
      routes.push(...this.generateFormRoutes(component, parentPath));
    }

    // Generate dynamic routes if needed
    if (this.needsDynamicRoute(component)) {
      routes.push(this.generateDynamicRoute(component, parentPath));
    }

    return routes;
  }

  /**
   * Generate root route
   */
  private generateRootRoute(component: EnhancedComponent): RouteDefinition {
    return {
      path: "/",
      type: "page",
      page: component.name,
      layout: "RootLayout",
      components: [component.name],
      actions: [],
      metadata: {
        title: component.description || component.name,
        description: `${component.name} - Main Application`,
      },
    };
  }

  /**
   * Generate feature route
   */
  private generateFeatureRoute(
    component: EnhancedComponent,
    parentPath: string
  ): RouteDefinition {
    const path = `${parentPath}/${this.toKebabCase(component.name)}`;

    return {
      path,
      type: "page",
      page: component.name,
      layout: `${component.name}Layout`,
      components: this.collectComponentNames(component),
      actions: component.actions?.map((a) => a.name) || [],
      metadata: {
        title: component.description || component.name,
        description: component.description,
      },
    };
  }

  /**
   * Generate form routes (create, edit)
   */
  private generateFormRoutes(
    component: EnhancedComponent,
    parentPath: string
  ): RouteDefinition[] {
    const routes: RouteDefinition[] = [];
    const baseName = this.extractBaseName(component.name);

    // Create route
    routes.push({
      path: `${parentPath}/${this.toKebabCase(baseName)}/new`,
      type: "page",
      page: component.name,
      layout: `${baseName}Layout`,
      components: [component.name],
      actions: component.actions
        ?.filter((a) => a.type === "form-action")
        .map((a) => a.name) || [],
      metadata: {
        title: `Create ${baseName}`,
        description: `Create new ${baseName}`,
      },
    });

    // Edit route
    routes.push({
      path: `${parentPath}/${this.toKebabCase(baseName)}/[id]/edit`,
      type: "dynamic",
      page: component.name,
      layout: `${baseName}Layout`,
      components: [component.name],
      actions: component.actions
        ?.filter((a) => a.type === "form-action")
        .map((a) => a.name) || [],
      metadata: {
        title: `Edit ${baseName}`,
        description: `Edit existing ${baseName}`,
      },
    });

    return routes;
  }

  /**
   * Generate dynamic route
   */
  private generateDynamicRoute(
    component: EnhancedComponent,
    parentPath: string
  ): RouteDefinition {
    const baseName = this.extractBaseName(component.name);

    return {
      path: `${parentPath}/${this.toKebabCase(baseName)}/[id]`,
      type: "dynamic",
      page: component.name,
      layout: `${baseName}Layout`,
      components: this.collectComponentNames(component),
      actions: component.actions
        ?.filter((a) => a.type === "server-action")
        .map((a) => a.name) || [],
      metadata: {
        title: `${baseName} Details`,
        description: `View ${baseName} details`,
      },
    };
  }

  /**
   * Generate route metadata from component and actions
   */
  generateRouteMetadata(
    component: EnhancedComponent,
    actions: ServerActionDefinition[]
  ): RouteDefinition["metadata"] {
    return {
      title: component.description || component.name,
      description: component.description,
      openGraph: {
        title: component.description || component.name,
        description: component.description,
        type: "website",
      },
    };
  }

  /**
   * Determine if component needs a dynamic route
   */
  private needsDynamicRoute(component: EnhancedComponent): boolean {
    // Components that display individual items need dynamic routes
    if (component.name.includes("Detail")) return true;
    if (component.name.includes("View")) return true;

    // Components with actions that require an ID
    const hasIdAction = component.actions?.some(
      (a) => a.parameters?.includes("id")
    );
    if (hasIdAction) return true;

    return false;
  }

  /**
   * Collect all component names from hierarchy
   */
  private collectComponentNames(component: EnhancedComponent): string[] {
    const names = [component.name];

    if (component.children) {
      Object.values(component.children).forEach((child) => {
        names.push(...this.collectComponentNames(child));
      });
    }

    return names;
  }

  /**
   * Extract base name from component name (e.g., "ProductForm" -> "Product")
   */
  private extractBaseName(componentName: string): string {
    return componentName
      .replace(/Form$/, "")
      .replace(/List$/, "")
      .replace(/Grid$/, "")
      .replace(/Detail$/, "")
      .replace(/View$/, "")
      .replace(/Card$/, "");
  }

  /**
   * Helper: Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  /**
   * Generate layout file content for route
   */
  generateLayoutContent(
    component: EnhancedComponent,
    childRoutes: RouteDefinition[]
  ): string {
    return `
import { ReactNode } from 'react';

export default function ${component.name}Layout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="${this.toKebabCase(component.name)}-layout">
      {/* Add layout-specific UI here */}
      {children}
    </div>
  );
}
`;
  }

  /**
   * Generate page file content for route
   */
  generatePageContent(
    component: EnhancedComponent,
    route: RouteDefinition
  ): string {
    const isDynamic = route.type === "dynamic";
    const params = isDynamic ? "{ params }: { params: { id: string } }" : "";

    return `
import { ${component.name} } from '@/components/${this.toKebabCase(component.name)}';
${route.actions.map((action) => `import { ${action} } from '@/actions/${this.toKebabCase(action)}';`).join("\n")}

export default async function ${component.name}Page(${params}) {
  ${isDynamic ? "const data = await " + route.actions[0] + "(params.id);" : ""}

  return (
    <div className="container">
      <${component.name} ${isDynamic ? "data={data}" : ""} />
    </div>
  );
}
`;
  }
}
