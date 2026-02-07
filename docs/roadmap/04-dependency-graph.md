# Dependency Graph Implementation

**Status**: 📋 Planned | **Priority**: P2 (Important) | **Effort**: 4 days

## What is the Dependency Graph?

The **Dependency Graph** maps the relationships between components, screens, and features in your project. It answers questions like:

- What components does `LoginForm` depend on?
- What components depend on `Button`?
- What's the safe order to build components?
- Are there any circular dependencies?

**Think of it as**: A complete map showing how every piece of your project connects to every other piece.

## Why It's Important

### Current Pain Points

1. **Manual Dependency Tracking**
   - No visibility into component relationships
   - Can't tell what breaks when you change something
   - Must manually trace imports across files

2. **No Build Order Guidance**
   - Don't know which components to build first
   - Can't identify "foundation" vs "leaf" components
   - No way to prioritize implementation

3. **Hidden Circular Dependencies**
   - Circular imports cause runtime errors
   - Hard to detect manually
   - Can't be caught until they break

### Benefits of Dependency Graph

1. **Visual Relationships**
   ```
   Button (depth: 0)
     ↑ used by
       LoginForm (depth: 1)
         ↑ used by
           LoginPage (depth: 2)
   ```

2. **Safe Refactoring**
   ```typescript
   // Know impact before changing
   graph.getDependents('Button')
   // → ['LoginForm', 'SignupForm', 'Dashboard', ...]
   ```

3. **Build Order**
   ```typescript
   // Get optimal implementation order
   graph.getBuildOrder()
   // → ['Button', 'Input', 'LoginForm', 'LoginPage', ...]
   ```

4. **Circular Dependency Detection**
   ```typescript
   graph.findCircularDependencies()
   // → [['ComponentA', 'ComponentB', 'ComponentA']]
   ```

## Graph Structure

### Data Model

```typescript
interface DependencyGraph {
  // Components
  components: {
    [componentName: string]: ComponentNode;
  };

  // Screens
  screens: {
    [screenName: string]: ScreenNode;
  };

  // Features
  features: {
    [featureName: string]: FeatureNode;
  };

  // Metadata
  metadata: {
    totalNodes: number;
    maxDepth: number;
    circularDependencies: CircularDependency[];
    generatedAt: string;
  };
}

interface ComponentNode {
  name: string;
  path: string;
  type: 'page' | 'layout' | 'ui' | 'form' | 'display';

  // Dependencies (what this imports)
  imports: string[];

  // Dependents (what imports this)
  importedBy: string[];

  // Depth in dependency tree (0 = no dependencies)
  depth: number;

  // Screens that use this component
  usedInScreens: string[];

  // Features that include this component
  partOfFeatures: string[];

  // External dependencies (from node_modules)
  externalDependencies: string[];
}

interface ScreenNode {
  name: string;
  path: string;

  // Components used in this screen
  components: string[];

  // Features implemented by this screen
  features: string[];
}

interface FeatureNode {
  name: string;

  // Components needed for this feature
  components: string[];

  // Screens that implement this feature
  screens: string[];

  // Dependencies (other features this depends on)
  dependsOn: string[];
}

interface CircularDependency {
  cycle: string[];
  severity: 'error' | 'warning';
  message: string;
}
```

### Example Graph

```json
{
  "components": {
    "Button": {
      "name": "Button",
      "path": "components/ui/Button.tsx",
      "type": "ui",
      "imports": [],
      "importedBy": ["LoginForm", "SignupForm", "Dashboard"],
      "depth": 0,
      "usedInScreens": ["login", "signup", "dashboard"],
      "partOfFeatures": ["authentication", "user-management"],
      "externalDependencies": ["react", "class-variance-authority"]
    },
    "Input": {
      "name": "Input",
      "path": "components/ui/Input.tsx",
      "type": "ui",
      "imports": [],
      "importedBy": ["LoginForm", "SignupForm"],
      "depth": 0,
      "usedInScreens": ["login", "signup"],
      "partOfFeatures": ["authentication"],
      "externalDependencies": ["react"]
    },
    "LoginForm": {
      "name": "LoginForm",
      "path": "components/auth/LoginForm.tsx",
      "type": "form",
      "imports": ["Button", "Input", "useAuth"],
      "importedBy": ["LoginPage"],
      "depth": 1,
      "usedInScreens": ["login"],
      "partOfFeatures": ["authentication"],
      "externalDependencies": ["react", "react-hook-form"]
    },
    "LoginPage": {
      "name": "LoginPage",
      "path": "app/login/page.tsx",
      "type": "page",
      "imports": ["LoginForm"],
      "importedBy": [],
      "depth": 2,
      "usedInScreens": ["login"],
      "partOfFeatures": ["authentication"],
      "externalDependencies": ["react", "next"]
    }
  },
  "screens": {
    "login": {
      "name": "login",
      "path": ".mycontext/screens/login",
      "components": ["LoginForm", "Button", "Input"],
      "features": ["authentication"]
    }
  },
  "features": {
    "authentication": {
      "name": "User Authentication",
      "components": ["LoginForm", "Button", "Input", "LoginPage"],
      "screens": ["login", "signup"],
      "dependsOn": []
    }
  },
  "metadata": {
    "totalNodes": 4,
    "maxDepth": 2,
    "circularDependencies": [],
    "generatedAt": "2024-02-06T10:30:00Z"
  }
}
```

## Implementation Strategy

### Phase 1: AST Parsing (Day 1)

Extract imports from component files using TypeScript AST parsing.

```typescript
import ts from 'typescript';
import path from 'path';

class ImportExtractor {
  extractImports(filePath: string): ImportInfo {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const imports: string[] = [];
    const externalImports: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;

        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;

          // Check if it's a local import (starts with . or @/)
          if (importPath.startsWith('.') || importPath.startsWith('@/')) {
            const componentName = this.resolveComponentName(importPath, filePath);
            if (componentName) {
              imports.push(componentName);
            }
          } else {
            // External dependency (from node_modules)
            externalImports.push(importPath.split('/')[0]);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      localImports: [...new Set(imports)],
      externalImports: [...new Set(externalImports)]
    };
  }

  private resolveComponentName(importPath: string, fromFile: string): string | null {
    // Resolve relative path to component name
    const absolutePath = path.resolve(path.dirname(fromFile), importPath);

    // Extract component name from path
    // Example: /path/to/components/ui/Button.tsx → Button
    const match = absolutePath.match(/\/(\w+)\.tsx?$/);
    return match ? match[1] : null;
  }
}
```

### Phase 2: Graph Building (Day 2)

Build the dependency graph from extracted imports.

```typescript
class DependencyGraphBuilder {
  async build(projectPath: string): Promise<DependencyGraph> {
    const extractor = new ImportExtractor();
    const graph: DependencyGraph = {
      components: {},
      screens: {},
      features: {},
      metadata: {
        totalNodes: 0,
        maxDepth: 0,
        circularDependencies: [],
        generatedAt: new Date().toISOString()
      }
    };

    // Step 1: Find all components
    const componentFiles = await glob(`${projectPath}/**/*.tsx`, {
      ignore: ['**/node_modules/**', '**/.next/**']
    });

    // Step 2: Extract imports for each component
    for (const file of componentFiles) {
      const componentName = this.getComponentName(file);
      const { localImports, externalImports } = extractor.extractImports(file);

      graph.components[componentName] = {
        name: componentName,
        path: file,
        type: this.inferComponentType(file),
        imports: localImports,
        importedBy: [], // Will be filled in next step
        depth: 0, // Will be calculated later
        usedInScreens: [],
        partOfFeatures: [],
        externalDependencies: externalImports
      };
    }

    // Step 3: Build reverse dependencies (importedBy)
    for (const [name, node] of Object.entries(graph.components)) {
      for (const imported of node.imports) {
        if (graph.components[imported]) {
          graph.components[imported].importedBy.push(name);
        }
      }
    }

    // Step 4: Calculate depths
    this.calculateDepths(graph);

    // Step 5: Link screens and features
    await this.linkScreensAndFeatures(graph, projectPath);

    // Step 6: Detect circular dependencies
    graph.metadata.circularDependencies = this.detectCircularDependencies(graph);

    // Step 7: Calculate metadata
    graph.metadata.totalNodes = Object.keys(graph.components).length;
    graph.metadata.maxDepth = Math.max(
      ...Object.values(graph.components).map(c => c.depth)
    );

    return graph;
  }

  private calculateDepths(graph: DependencyGraph) {
    // Topological sort to calculate depths
    const visited = new Set<string>();
    const depths = new Map<string, number>();

    const visit = (name: string): number => {
      if (depths.has(name)) return depths.get(name)!;
      if (visited.has(name)) return 0; // Circular dependency, default to 0

      visited.add(name);
      const node = graph.components[name];

      if (!node || node.imports.length === 0) {
        depths.set(name, 0);
        return 0;
      }

      const maxDepth = Math.max(
        ...node.imports.map(imp => visit(imp))
      );

      const depth = maxDepth + 1;
      depths.set(name, depth);
      node.depth = depth;

      return depth;
    };

    for (const name of Object.keys(graph.components)) {
      visit(name);
    }
  }

  private detectCircularDependencies(graph: DependencyGraph): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (name: string): boolean => {
      visited.add(name);
      recursionStack.add(name);
      path.push(name);

      const node = graph.components[name];
      if (!node) return false;

      for (const imported of node.imports) {
        if (!visited.has(imported)) {
          if (dfs(imported)) return true;
        } else if (recursionStack.has(imported)) {
          // Found a cycle
          const cycleStart = path.indexOf(imported);
          const cycle = [...path.slice(cycleStart), imported];

          cycles.push({
            cycle,
            severity: 'error',
            message: `Circular dependency detected: ${cycle.join(' → ')}`
          });

          return true;
        }
      }

      recursionStack.delete(name);
      path.pop();
      return false;
    };

    for (const name of Object.keys(graph.components)) {
      if (!visited.has(name)) {
        dfs(name);
      }
    }

    return cycles;
  }
}
```

### Phase 3: Visualization (Day 3)

Generate visual representations of the dependency graph.

```typescript
class GraphVisualizer {
  // Generate Mermaid diagram
  toMermaid(graph: DependencyGraph, options?: VisualizationOptions): string {
    const lines: string[] = ['graph TD'];

    // Add nodes
    for (const [name, node] of Object.entries(graph.components)) {
      const shape = this.getNodeShape(node.type);
      const label = `${name}\n(depth: ${node.depth})`;
      lines.push(`  ${name}${shape[0]}${label}${shape[1]}`);
    }

    // Add edges
    for (const [name, node] of Object.entries(graph.components)) {
      for (const imported of node.imports) {
        lines.push(`  ${name} --> ${imported}`);
      }
    }

    // Highlight circular dependencies
    for (const circular of graph.metadata.circularDependencies) {
      for (let i = 0; i < circular.cycle.length - 1; i++) {
        lines.push(`  ${circular.cycle[i]} -.->|CIRCULAR| ${circular.cycle[i + 1]}`);
      }
    }

    return lines.join('\n');
  }

  // Generate Graphviz DOT format
  toGraphviz(graph: DependencyGraph): string {
    const lines: string[] = ['digraph Dependencies {'];
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');

    // Add nodes with styling
    for (const [name, node] of Object.entries(graph.components)) {
      const color = this.getNodeColor(node.type);
      lines.push(`  "${name}" [fillcolor="${color}", style=filled];`);
    }

    // Add edges
    for (const [name, node] of Object.entries(graph.components)) {
      for (const imported of node.imports) {
        lines.push(`  "${name}" -> "${imported}";`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  private getNodeShape(type: string): [string, string] {
    switch (type) {
      case 'page': return ['[/', '/]'];
      case 'layout': return ['[[', ']]'];
      case 'ui': return ['[', ']'];
      case 'form': return ['([', '])'];
      default: return ['(', ')'];
    }
  }

  private getNodeColor(type: string): string {
    switch (type) {
      case 'page': return 'lightblue';
      case 'layout': return 'lightgreen';
      case 'ui': return 'lightyellow';
      case 'form': return 'lightpink';
      default: return 'white';
    }
  }
}
```

### Phase 4: Integration (Day 4)

Integrate with manifest and MCP server.

```typescript
// Add to manifest generation
class ManifestGenerator {
  async generate(projectPath: string): Promise<ContextManifest> {
    const graphBuilder = new DependencyGraphBuilder();
    const dependencyGraph = await graphBuilder.build(projectPath);

    const manifest: ContextManifest = {
      // ... other fields
      dependencies: dependencyGraph,
    };

    return manifest;
  }
}

// Add to MCP server
class ContextManager {
  async getDependencies(componentName: string): Promise<DependencyInfo> {
    const manifest = await this.loadManifest();
    const node = manifest.dependencies.components[componentName];

    if (!node) {
      throw new Error(`Component not found: ${componentName}`);
    }

    return {
      component: componentName,
      imports: node.imports,
      importedBy: node.importedBy,
      depth: node.depth,
      buildOrder: this.getBuildOrder(componentName, manifest.dependencies)
    };
  }

  private getBuildOrder(componentName: string, graph: DependencyGraph): string[] {
    // Return components in order they should be built
    const order: string[] = [];
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const node = graph.components[name];
      if (!node) return;

      // Visit dependencies first
      for (const imported of node.imports) {
        visit(imported);
      }

      order.push(name);
    };

    visit(componentName);
    return order;
  }
}
```

## CLI Commands

### Generate Dependency Graph

```bash
# Generate dependency graph
mycontext graph:generate

# Generate with visualization
mycontext graph:generate --format mermaid --output dependency-graph.mmd

# Generate as Graphviz
mycontext graph:generate --format graphviz --output dependency-graph.dot
```

### Query Dependencies

```bash
# Get dependencies of a component
mycontext graph:deps LoginForm

# Output:
# LoginForm depends on:
#   - Button (ui)
#   - Input (ui)
#   - useAuth (hook)
#
# LoginForm is used by:
#   - LoginPage (page)
#   - AuthFlow (layout)

# Get build order
mycontext graph:build-order LoginPage

# Output:
# Build order for LoginPage:
#   1. Button (depth: 0)
#   2. Input (depth: 0)
#   3. useAuth (depth: 0)
#   4. LoginForm (depth: 1)
#   5. LoginPage (depth: 2)
```

### Detect Circular Dependencies

```bash
# Check for circular dependencies
mycontext graph:check

# Output:
# ✓ No circular dependencies found

# Or:
# ✗ Found 2 circular dependencies:
#   1. ComponentA → ComponentB → ComponentA
#   2. FeatureX → FeatureY → FeatureZ → FeatureX
```

### Visualize Graph

```bash
# Open interactive visualization
mycontext graph:visualize

# Generate static visualization
mycontext graph:visualize --output graph.png

# Filter by component type
mycontext graph:visualize --type ui --output ui-components.png
```

## Integration with MCP Server

The MCP server exposes dependency information through the `get_dependencies` tool:

```typescript
// Claude Code can query dependencies
const deps = await mcp.get_dependencies({
  component: 'LoginForm',
  direction: 'both'
});

// Result:
{
  "component": "LoginForm",
  "imports": ["Button", "Input", "useAuth"],
  "importedBy": ["LoginPage", "AuthFlow"],
  "depth": 1,
  "buildOrder": ["Button", "Input", "useAuth", "LoginForm"],
  "circularDependencies": []
}
```

## Use Cases

### 1. Safe Refactoring

```bash
# Before refactoring Button, check impact
mycontext graph:deps Button

# Output shows all components that will be affected
# Button is used by:
#   - LoginForm
#   - SignupForm
#   - Dashboard
#   - SettingsPage
#   ... (20 more components)
```

### 2. Implementation Planning

```bash
# Get optimal build order for a feature
mycontext graph:build-order --feature authentication

# Output:
# Optimal build order for 'authentication' feature:
#   Foundation (depth 0):
#     1. Button
#     2. Input
#     3. Card
#
#   Layer 1 (depth 1):
#     4. LoginForm
#     5. SignupForm
#
#   Layer 2 (depth 2):
#     6. LoginPage
#     7. SignupPage
```

### 3. Impact Analysis

```bash
# Analyze impact of changing a component
mycontext graph:impact Button

# Output:
# Changing Button will affect:
#   - 15 components directly
#   - 32 components indirectly (through transitive dependencies)
#   - 8 screens
#   - 3 features
#
# Suggested actions:
#   1. Run tests for affected components
#   2. Update 8 screens in .mycontext/screens/
#   3. Verify 3 features still work correctly
```

## Performance Considerations

### Caching

- Cache parsed ASTs in memory
- Incremental updates (only re-parse changed files)
- Store graph in manifest.json (no re-computation)

### Scalability

- Support projects with 1000+ components
- Lazy loading for large graphs
- Pagination for graph queries
- Index component names for O(1) lookup

### Performance Targets

- Graph generation: < 5 seconds for 500 components
- Dependency query: < 10ms
- Circular dependency detection: < 1 second for 1000 components
- Visualization generation: < 2 seconds

## Validation Rules

### Graph Integrity

1. **All imports must exist**
   - If A imports B, B must be in the graph
   - Warn about missing components

2. **Bidirectional consistency**
   - If A imports B, B's importedBy must include A
   - Auto-fix inconsistencies

3. **No self-dependencies**
   - Component cannot import itself
   - Error if detected

4. **Depth consistency**
   - Component depth must be max(dependency depths) + 1
   - Recalculate if inconsistent

## Migration Strategy

### Phase 1: Generation (Week 4, Day 1-2)
- Generate dependency graph during manifest generation
- Store in manifest.json
- No breaking changes

### Phase 2: CLI Commands (Week 4, Day 3)
- Add `mycontext graph:*` commands
- Enable querying and visualization
- Documentation and examples

### Phase 3: MCP Integration (Week 4, Day 4)
- Add `get_dependencies` MCP tool
- Update ContextManager
- Integration tests

### Phase 4: Visualization (Week 4, Optional)
- Add interactive graph viewer
- Generate static diagrams
- Export to various formats

## Success Metrics

- **Accuracy**: 100% of dependencies captured
- **Performance**: < 5 seconds for 500 components
- **Circular Detection**: 100% detection rate
- **Query Speed**: < 10ms per query
- **Adoption**: Used in 70% of projects within 3 months

## Related Documentation

- [Context Manifest](./02-context-manifest.md) - Where dependency graph is stored
- [Context MCP Server](./01-mcp-server.md) - How dependencies are queried
- [Flow Testing MCP Server](./06-flow-testing-mcp.md) - Test missions can link to user flows
- [Implementation Priority](./implementation-priority.md) - Development timeline

---

**Status**: 📋 Planned
**Priority**: P2 (Important)
**Effort**: 4 days
**Dependencies**: Context Manifest
**Last Updated**: February 7, 2026
