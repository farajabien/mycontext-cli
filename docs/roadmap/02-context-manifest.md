# Context Manifest Specification

**Status**: 📋 Planned | **Priority**: P0 (Critical) | **Effort**: 3 days

## What is the Context Manifest?

The **Context Manifest** (`manifest.json`) is a single source of truth that describes your entire MyContext project state. It's like a map that shows:

- What components exist
- What screens have been generated
- Implementation status
- Dependencies between pieces
- Project metadata

**Think of it as**: The `package.json` for your project's context and specifications.

## Why It's Critical

### Current Pain Points

1. **No Central Index**
   - Information scattered across 7+ files
   - No single place to check project status
   - Can't quickly see what exists

2. **Manual Correlation**
   - AI tools must read multiple files
   - Must correlate component specs with screens
   - Must track dependencies manually

3. **No State Tracking**
   - Can't tell what's implemented
   - No visibility into progress
   - No way to mark completion

### Benefits of Manifest

1. **Single Source of Truth**
   ```json
   // One file answers:
   - How many components exist?
   - What's their status?
   - What depends on what?
   - What screens are available?
   ```

2. **Fast Queries**
   - MCP server reads one file
   - AI tools get instant answers
   - No parsing multiple markdown files

3. **Progress Tracking**
   ```json
   {
     "stats": {
       "total_components": 25,
       "completed": 10,
       "in_progress": 5,
       "planned": 10
     }
   }
   ```

## Manifest Structure

### Complete Schema

```typescript
interface ContextManifest {
  // Metadata
  version: string;                    // Manifest version (semver)
  generated: string;                  // ISO timestamp
  mycontextVersion: string;          // CLI version used

  // Project Info
  project: {
    name: string;
    description?: string;
    framework: 'instantdb' | 'nextjs' | 'other';
    path: string;
    git?: {
      remote?: string;
      branch?: string;
      commit?: string;
    };
  };

  // Components
  components: Component[];

  // Screens
  screens: Screen[];

  // Features
  features: Feature[];

  // Dependencies
  dependencies: DependencyGraph;

  // Context Files
  contextFiles: ContextFile[];

  // Stats
  stats: ProjectStats;

  // Metadata
  metadata: {
    aiProvider: string;
    generationCount: number;
    lastModified: string;
  };
}

interface Component {
  id: string;                         // Unique ID
  name: string;                       // Component name
  path: string;                       // File path
  type: 'page' | 'layout' | 'ui' | 'form' | 'display';
  status: 'planned' | 'in-progress' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  group?: string;                     // Component group
  description: string;
  props?: ComponentProp[];
  dependencies: string[];             // Component names it imports
  dependents: string[];               // Components that import it
  linkedScreens: string[];            // Associated screen IDs
  linkedFeatures: string[];           // Associated feature IDs
  tests?: {
    unit: boolean;
    integration: boolean;
    e2e: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface Screen {
  id: string;
  name: string;
  path: string;                       // Path to screen directory
  format: ('html' | 'jsx')[];
  group?: string;
  linkedComponents: string[];         // Component IDs used
  linkedFeatures: string[];           // Feature IDs implemented
  metadata: {
    model: string;
    timestamp: string;
    prompt: string;
  };
}

interface Feature {
  id: string;
  name: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  components: string[];               // Component IDs
  screens: string[];                  // Screen IDs
  acceptanceCriteria: string[];
  estimatedHours?: number;
  actualHours?: number;
  assignee?: string;
  dueDate?: string;
}

interface DependencyGraph {
  components: {
    [componentName: string]: {
      imports: string[];              // What it imports
      importedBy: string[];           // What imports it
      depth: number;                  // Dependency depth
    };
  };
}

interface ContextFile {
  name: string;
  path: string;
  type: 'prd' | 'flows' | 'branding' | 'specs' | 'types' | 'features' | 'components';
  size: number;
  lastModified: string;
  checksum: string;                   // For change detection
}

interface ProjectStats {
  total: {
    components: number;
    screens: number;
    features: number;
  };
  byStatus: {
    planned: number;
    inProgress: number;
    completed: number;
    blocked: number;
  };
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  coverage: {
    components: number;                // % with tests
    features: number;                  // % implemented
  };
}
```

### Example Manifest

```json
{
  "version": "1.0.0",
  "generated": "2024-02-06T10:30:00Z",
  "mycontextVersion": "4.0.0",

  "project": {
    "name": "my-saas-app",
    "description": "AI-powered code review SaaS",
    "framework": "instantdb",
    "path": "/Users/dev/projects/my-saas-app",
    "git": {
      "remote": "https://github.com/user/my-saas-app",
      "branch": "main",
      "commit": "abc123"
    }
  },

  "components": [
    {
      "id": "comp-001",
      "name": "LoginForm",
      "path": "components/auth/LoginForm.tsx",
      "type": "form",
      "status": "completed",
      "priority": "critical",
      "group": "authentication",
      "description": "User login form with email and password",
      "props": [
        {
          "name": "onSubmit",
          "type": "(data: LoginData) => Promise<void>",
          "required": true,
          "description": "Callback when form is submitted"
        },
        {
          "name": "loading",
          "type": "boolean",
          "required": false,
          "default": "false"
        }
      ],
      "dependencies": ["Button", "Input", "useAuth"],
      "dependents": ["LoginPage", "AuthFlow"],
      "linkedScreens": ["screen-login"],
      "linkedFeatures": ["feat-auth-001"],
      "tests": {
        "unit": true,
        "integration": true,
        "e2e": false
      },
      "createdAt": "2024-02-05T09:00:00Z",
      "updatedAt": "2024-02-06T10:15:00Z"
    },
    {
      "id": "comp-002",
      "name": "Button",
      "path": "components/ui/Button.tsx",
      "type": "ui",
      "status": "completed",
      "priority": "high",
      "description": "Reusable button component",
      "dependencies": [],
      "dependents": ["LoginForm", "SignupForm", "Dashboard"],
      "linkedScreens": [],
      "linkedFeatures": [],
      "createdAt": "2024-02-05T08:00:00Z",
      "updatedAt": "2024-02-05T08:30:00Z"
    }
  ],

  "screens": [
    {
      "id": "screen-login",
      "name": "login",
      "path": ".mycontext/screens/login",
      "format": ["html", "jsx"],
      "group": "authentication",
      "linkedComponents": ["comp-001", "comp-002"],
      "linkedFeatures": ["feat-auth-001"],
      "metadata": {
        "model": "gpt-4o",
        "timestamp": "2024-02-05T10:00:00Z",
        "prompt": "Generate a login screen for this application"
      }
    }
  ],

  "features": [
    {
      "id": "feat-auth-001",
      "name": "User Authentication",
      "description": "Email/password authentication with magic link fallback",
      "status": "in-progress",
      "priority": "critical",
      "components": ["comp-001"],
      "screens": ["screen-login"],
      "acceptanceCriteria": [
        "Users can login with email/password",
        "Failed login shows error message",
        "Successful login redirects to dashboard"
      ],
      "estimatedHours": 8,
      "actualHours": 5
    }
  ],

  "dependencies": {
    "components": {
      "LoginForm": {
        "imports": ["Button", "Input", "useAuth"],
        "importedBy": ["LoginPage", "AuthFlow"],
        "depth": 1
      },
      "Button": {
        "imports": [],
        "importedBy": ["LoginForm", "SignupForm", "Dashboard"],
        "depth": 0
      }
    }
  },

  "contextFiles": [
    {
      "name": "01-prd.md",
      "path": ".mycontext/01-prd.md",
      "type": "prd",
      "size": 15420,
      "lastModified": "2024-02-05T09:00:00Z",
      "checksum": "sha256:abc123..."
    }
  ],

  "stats": {
    "total": {
      "components": 25,
      "screens": 12,
      "features": 8
    },
    "byStatus": {
      "planned": 10,
      "inProgress": 5,
      "completed": 10,
      "blocked": 0
    },
    "byPriority": {
      "critical": 5,
      "high": 8,
      "medium": 10,
      "low": 2
    },
    "coverage": {
      "components": 60,
      "features": 40
    }
  },

  "metadata": {
    "aiProvider": "github-models",
    "generationCount": 15,
    "lastModified": "2024-02-06T10:30:00Z"
  }
}
```

## Generation Strategy

### When to Generate

The manifest is generated/updated:

1. **After `mycontext init`**
   - Creates initial manifest with project info
   - Empty components, screens, features arrays

2. **After `mycontext generate context`**
   - Adds context files to manifest
   - Indexes features from generated files

3. **After `mycontext generate:screens`**
   - Adds screens to manifest
   - Links screens to components/features

4. **After `mycontext generate-components`**
   - Adds components to manifest
   - Generates dependency graph
   - Links components to screens/features

5. **Manual Updates**
   - `mycontext manifest:update` - Regenerate from current state
   - `mycontext manifest:validate` - Check for inconsistencies

### Generation Algorithm

```typescript
class ManifestGenerator {
  async generate(projectPath: string): Promise<ContextManifest> {
    const manifest: ContextManifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      mycontextVersion: getVersion(),
      project: await this.getProjectInfo(projectPath),
      components: await this.indexComponents(projectPath),
      screens: await this.indexScreens(projectPath),
      features: await this.extractFeatures(projectPath),
      dependencies: await this.buildDependencyGraph(projectPath),
      contextFiles: await this.indexContextFiles(projectPath),
      stats: this.calculateStats(),
      metadata: this.getMetadata()
    };

    return manifest;
  }

  private async indexComponents(projectPath: string): Promise<Component[]> {
    // Scan components directory
    const componentFiles = await glob(`${projectPath}/components/**/*.tsx`);

    return Promise.all(componentFiles.map(async (file) => {
      const content = await fs.readFile(file, 'utf-8');
      const ast = parseTypeScript(content);

      return {
        id: generateId('comp'),
        name: extractComponentName(ast),
        path: file,
        type: inferComponentType(ast),
        status: 'completed', // Exists = completed
        priority: 'medium',  // Default
        description: extractJsDocDescription(ast),
        props: extractProps(ast),
        dependencies: extractImports(ast),
        dependents: [],     // Filled in second pass
        linkedScreens: [],  // Filled from screens data
        linkedFeatures: [], // Filled from features data
        createdAt: (await fs.stat(file)).birthtime.toISOString(),
        updatedAt: (await fs.stat(file)).mtime.toISOString()
      };
    }));
  }
}
```

## CLI Commands

### Generate Manifest

```bash
# Generate manifest from current project state
mycontext manifest:generate

# Force regenerate (overwrites existing)
mycontext manifest:generate --force

# Generate with specific output path
mycontext manifest:generate --output ./custom-manifest.json
```

### Update Manifest

```bash
# Update manifest with new changes
mycontext manifest:update

# Update only components section
mycontext manifest:update --only components

# Update and validate
mycontext manifest:update --validate
```

### Validate Manifest

```bash
# Validate manifest against schema
mycontext manifest:validate

# Validate and show warnings
mycontext manifest:validate --warnings

# Validate and fix common issues
mycontext manifest:validate --fix
```

### Query Manifest

```bash
# List all components
mycontext manifest:query components

# Filter by status
mycontext manifest:query components --status completed

# Get specific component
mycontext manifest:query component LoginForm

# Get project stats
mycontext manifest:query stats
```

## Integration with MCP Server

The MCP server primarily reads from the manifest:

```typescript
class ContextManager {
  async getComponents(filters?: ComponentFilters): Promise<Component[]> {
    // Read from manifest instead of parsing files
    const manifest = await this.loadManifest();
    let components = manifest.components;

    if (filters) {
      components = components.filter(c => {
        if (filters.status && c.status !== filters.status) return false;
        if (filters.group && c.group !== filters.group) return false;
        return true;
      });
    }

    return components;
  }

  async getDependencies(componentName: string): Promise<DependencyInfo> {
    const manifest = await this.loadManifest();
    return manifest.dependencies.components[componentName];
  }

  async getStatus(): Promise<ProjectStats> {
    const manifest = await this.loadManifest();
    return manifest.stats;
  }
}
```

## Validation Rules

### Schema Validation
- All IDs must be unique
- All references must exist (e.g., linkedScreens must reference valid screen IDs)
- Dates must be valid ISO strings
- Enums must have valid values

### Consistency Validation
- Component dependencies must be bidirectional
- If A imports B, B's dependents must include A
- Linked screens/features must exist
- Stats must match actual counts

### Quality Validation
- Warnings for missing descriptions
- Warnings for no tests
- Warnings for blocked status without reason

## Migration Strategy

### From Current State

1. **Week 1: Add Manifest Generation**
   - Generate manifest alongside existing files
   - Don't change existing workflows
   - Manifest is supplementary

2. **Week 2: Update MCP Server**
   - MCP server reads manifest
   - Falls back to files if manifest missing
   - Hybrid approach

3. **Week 3: Encourage Adoption**
   - Document benefits
   - Show performance gains
   - Tutorials using manifest

4. **Future: Manifest-First**
   - Manifest becomes primary source
   - Files become secondary
   - Full migration complete

## Performance Considerations

### File Size
- Target: < 1MB for most projects
- Large projects (1000+ components): < 5MB
- Compress for storage/transfer

### Load Time
- Target: < 50ms to load manifest
- Cache in memory
- Use streaming for large files

### Update Time
- Incremental updates preferred
- Full regeneration: < 5 seconds
- Update only changed sections

## Success Metrics

- **Generation Speed**: < 3 seconds for 100 components
- **Accuracy**: 100% match with actual project state
- **Query Performance**: < 10ms for any query
- **Adoption**: 80% of projects using manifest within 6 months

## Next Steps

1. **Define JSON Schema**: Create formal JSON schema for validation
2. **Implement Generator**: Build manifest generation logic
3. **Add CLI Commands**: Implement manifest:* commands
4. **Integrate MCP**: Update MCP server to use manifest
5. **Documentation**: Write comprehensive guides

## Related Documentation

- [MCP Server Implementation](./01-mcp-server.md) - How manifest is consumed
- [Structured Formats](./03-structured-formats.md) - JSON format for context files
- [Dependency Graph](./04-dependency-graph.md) - How dependencies are tracked

---

**Status**: 📋 Planned
**Priority**: P0 (Critical)
**Effort**: 3 days
**Dependencies**: None (foundational)
**Last Updated**: February 6, 2024
