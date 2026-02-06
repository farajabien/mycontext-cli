# MCP Server Implementation

**Status**: 📋 Planned | **Priority**: P0 (Critical) | **Effort**: 2 weeks

## What is the MCP Server?

The **Model Context Protocol (MCP) Server** is a standardized way for AI coding assistants like Claude Code to query and interact with development tools in real-time.

Instead of AI tools manually reading files, they can **query** the MyContext MCP server:

```typescript
// Instead of this:
const prd = await readFile('.mycontext/01-prd.md')
const components = JSON.parse(await readFile('.mycontext/04-component-list.json'))
// ... parse and understand structure

// AI tools can do this:
const components = await mcp.query("List all components")
const loginSpec = await mcp.query("Show me the login component spec")
const status = await mcp.query("What's the implementation status?")
```

## Why It's Critical

### Current Pain Points

1. **Manual File Reading** (2-5 minutes per query)
   - AI must read multiple files
   - Parse markdown structure
   - Correlate information across files

2. **No Real-Time State**
   - Can't track what's implemented
   - No visibility into changes
   - Can't validate against specs

3. **Context Window Waste**
   - Must load entire files into context
   - Can't selectively query information
   - Expensive in tokens

### Benefits of MCP Server

1. **Instant Queries** (< 1 second)
   ```typescript
   // Get exactly what you need
   mcp.query("Components that depend on Button")
   mcp.query("Unimplemented features")
   mcp.query("Show auth flow screens")
   ```

2. **Real-Time Validation**
   ```typescript
   // Check if code matches specs
   mcp.validate({
     component: "LoginForm",
     code: generatedCode
   })
   ```

3. **State Tracking**
   ```typescript
   // Know what's done
   mcp.getStatus("all") // { total: 10, completed: 3, in_progress: 2 }
   ```

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────┐
│                  AI Tools                       │
│         (Claude Code, Cursor, etc.)             │
└────────────────┬────────────────────────────────┘
                 │ MCP Protocol
                 │ (JSON-RPC over stdio/HTTP)
                 ↓
┌─────────────────────────────────────────────────┐
│            MyContext MCP Server                 │
│  ┌──────────────────────────────────────────┐  │
│  │      Query Engine                        │  │
│  │  - Natural language → Structured query  │  │
│  │  - Caching layer                        │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │      Context Providers                   │  │
│  │  - Manifest Reader                       │  │
│  │  - Component Index                       │  │
│  │  - Dependency Graph                      │  │
│  │  - Screen Registry                       │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │      Validators                          │  │
│  │  - Schema validation                     │  │
│  │  - Spec compliance checking              │  │
│  └──────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│           .mycontext/ Directory                 │
│  - manifest.json                                │
│  - component-list.json                          │
│  - dependency-graph.json                        │
│  - screens/                                     │
└─────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. MCP Server Core (`src/mcp/server.ts`)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class MyContextMCPServer {
  private server: Server;
  private contextManager: ContextManager;

  constructor(projectPath: string) {
    this.server = new Server({
      name: 'mycontext-server',
      version: '1.0.0',
    }, {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    });

    this.contextManager = new ContextManager(projectPath);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle resource requests
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return await this.contextManager.listResources();
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleToolCall(request);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

#### 2. Context Manager (`src/mcp/context-manager.ts`)

```typescript
export class ContextManager {
  private projectPath: string;
  private manifest: ContextManifest;
  private cache: Map<string, any>;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.cache = new Map();
    this.loadManifest();
  }

  async query(query: string): Promise<any> {
    // Parse natural language query
    const parsed = this.parseQuery(query);

    // Route to appropriate handler
    switch (parsed.type) {
      case 'component-list':
        return this.getComponents(parsed.filters);
      case 'component-detail':
        return this.getComponent(parsed.componentName);
      case 'dependency-graph':
        return this.getDependencies(parsed.componentName);
      case 'status':
        return this.getStatus(parsed.scope);
      default:
        throw new Error(`Unknown query type: ${parsed.type}`);
    }
  }

  async getComponents(filters?: ComponentFilters): Promise<Component[]> {
    const components = this.manifest.components;

    if (!filters) return components;

    return components.filter(c => {
      if (filters.status && c.status !== filters.status) return false;
      if (filters.group && c.group !== filters.group) return false;
      if (filters.priority && c.priority !== filters.priority) return false;
      return true;
    });
  }
}
```

#### 3. Query Parser (`src/mcp/query-parser.ts`)

```typescript
export class QueryParser {
  // Convert natural language to structured query
  parse(query: string): ParsedQuery {
    const lowercaseQuery = query.toLowerCase();

    // Component queries
    if (lowercaseQuery.includes('component')) {
      if (lowercaseQuery.includes('list') || lowercaseQuery.includes('all')) {
        return { type: 'component-list', filters: this.extractFilters(query) };
      }
      const componentName = this.extractComponentName(query);
      if (componentName) {
        return { type: 'component-detail', componentName };
      }
    }

    // Dependency queries
    if (lowercaseQuery.includes('depend')) {
      const componentName = this.extractComponentName(query);
      return { type: 'dependency-graph', componentName };
    }

    // Status queries
    if (lowercaseQuery.includes('status') || lowercaseQuery.includes('progress')) {
      return { type: 'status', scope: 'all' };
    }

    throw new Error(`Could not parse query: ${query}`);
  }
}
```

## MCP Protocol Tools

### Available Tools

#### 1. `query_context`
Query project context with natural language

```json
{
  "name": "query_context",
  "description": "Query the MyContext project using natural language",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language query (e.g., 'List all components', 'Show me the login flow')"
      }
    },
    "required": ["query"]
  }
}
```

**Example Usage**:
```typescript
const result = await mcp.callTool('query_context', {
  query: "List all high-priority components"
});
```

#### 2. `get_component`
Get detailed component specification

```json
{
  "name": "get_component",
  "description": "Get detailed specification for a specific component",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Component name"
      }
    },
    "required": ["name"]
  }
}
```

#### 3. `validate_code`
Validate generated code against specs

```json
{
  "name": "validate_code",
  "description": "Validate that generated code matches the specification",
  "inputSchema": {
    "type": "object",
    "properties": {
      "component": {
        "type": "string",
        "description": "Component name"
      },
      "code": {
        "type": "string",
        "description": "Generated code to validate"
      }
    },
    "required": ["component", "code"]
  }
}
```

#### 4. `get_dependencies`
Get component dependency graph

```json
{
  "name": "get_dependencies",
  "description": "Get the dependency graph for a component",
  "inputSchema": {
    "type": "object",
    "properties": {
      "component": {
        "type": "string",
        "description": "Component name"
      },
      "direction": {
        "type": "string",
        "enum": ["imports", "importedBy", "both"],
        "description": "Dependency direction"
      }
    },
    "required": ["component"]
  }
}
```

#### 5. `update_status`
Update implementation status

```json
{
  "name": "update_status",
  "description": "Update the implementation status of a component or feature",
  "inputSchema": {
    "type": "object",
    "properties": {
      "target": {
        "type": "string",
        "description": "Component or feature name"
      },
      "status": {
        "type": "string",
        "enum": ["planned", "in-progress", "completed", "blocked"],
        "description": "New status"
      }
    },
    "required": ["target", "status"]
  }
}
```

## Implementation Plan

### Phase 1: Core Server (Week 1)

**Tasks**:
1. Set up MCP SDK dependencies
2. Create basic server with stdio transport
3. Implement `query_context` tool
4. Implement `get_component` tool
5. Add basic caching

**Deliverable**: Working MCP server that can answer basic queries

### Phase 2: Advanced Features (Week 2)

**Tasks**:
1. Add `validate_code` tool
2. Add `get_dependencies` tool
3. Add `update_status` tool
4. Implement query parser
5. Add comprehensive error handling
6. Write integration tests

**Deliverable**: Production-ready MCP server with all tools

### Phase 3: Integration (Week 3)

**Tasks**:
1. Update `mycontext` CLI to include `serve` command
2. Write Claude Code integration guide
3. Write Cursor integration guide
4. Create example projects
5. Documentation and tutorials

**Deliverable**: Fully documented and integrated MCP server

## Usage Examples

### Starting the Server

```bash
# Start MCP server for current project
mycontext serve

# Start with specific project path
mycontext serve --project ./my-app

# Start with HTTP transport (for remote access)
mycontext serve --http --port 3000
```

### Claude Code Integration

1. **Configure Claude Code**:
   ```json
   // claude_desktop_config.json
   {
     "mcpServers": {
       "mycontext": {
         "command": "mycontext",
         "args": ["serve"],
         "cwd": "/path/to/your/project"
       }
     }
   }
   ```

2. **Query from Claude Code**:
   ```typescript
   // Claude Code can now use MCP tools
   const components = await mcp.query_context({
     query: "List all components in the auth group"
   });

   const loginSpec = await mcp.get_component({
     name: "LoginForm"
   });
   ```

### Cursor Integration

```json
// .cursor/mcp-config.json
{
  "servers": {
    "mycontext": {
      "command": "mycontext serve",
      "autoStart": true
    }
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('ContextManager', () => {
  it('should list all components', async () => {
    const manager = new ContextManager('./test-project');
    const components = await manager.getComponents();
    expect(components).toHaveLength(10);
  });

  it('should filter components by status', async () => {
    const manager = new ContextManager('./test-project');
    const completed = await manager.getComponents({ status: 'completed' });
    expect(completed).toHaveLength(3);
  });
});
```

### Integration Tests
```typescript
describe('MCP Server', () => {
  it('should handle query_context tool', async () => {
    const server = new MyContextMCPServer('./test-project');
    await server.start();

    const result = await server.handleToolCall({
      name: 'query_context',
      arguments: { query: 'List all components' }
    });

    expect(result.components).toBeDefined();
  });
});
```

## Performance Considerations

### Caching Strategy
- Cache manifest in memory
- Invalidate on file changes (watch mode)
- LRU cache for query results
- Target: < 100ms per query

### Scalability
- Support projects with 1000+ components
- Lazy load dependency graphs
- Paginate large result sets
- Index component names for fast lookup

## Security Considerations

- Only serve local project (no remote access by default)
- Validate all tool inputs
- Sanitize file paths
- No arbitrary code execution
- Read-only by default (writes require explicit flag)

## Migration Path

### For Existing Users

1. **No Breaking Changes**:
   - MCP server is optional
   - Existing workflows continue working
   - `mycontext serve` is a new command

2. **Gradual Adoption**:
   - Try MCP with one project
   - Compare speed vs. manual file reading
   - Migrate when comfortable

3. **Documentation**:
   - Clear migration guide
   - Before/after examples
   - Video tutorials

## Success Metrics

- **Query Response Time**: < 100ms average
- **Cache Hit Rate**: > 80%
- **AI Tool Integrations**: 3+ tools in first month
- **User Adoption**: 50% of active users within 3 months
- **Query Success Rate**: > 95% accurate responses

## Next Steps

1. **Review Architecture**: [Current State Documentation](../architecture/current-state.md)
2. **Check Dependencies**: Install MCP SDK
3. **Start Coding**: Follow [Development Setup](../contributing/development-setup.md)
4. **Test Early**: Use dogfooding approach

## Related Documentation

- [Context Manifest Specification](./02-context-manifest.md) - What the MCP server reads
- [Implementation Priority](./implementation-priority.md) - Development schedule
- [Contributing Guide](../contributing/development-setup.md) - How to contribute

---

**Status**: 📋 Planned
**Priority**: P0 (Critical)
**Effort**: 2 weeks
**Dependencies**: Context Manifest, JSON schemas
**Last Updated**: February 6, 2024
