# Structured Formats (JSON Context Files)

**Status**: 📋 Planned | **Priority**: P1 (Important) | **Effort**: 1 week

## Overview

Transform MyContext context files from **markdown** to **structured JSON** with validation schemas. This enables:
- Machine-readable, queryable data
- Automated validation
- Type-safe consumption by AI tools
- Consistent structure across projects

## Problem Statement

### Current Issues with Markdown

1. **Inconsistent Structure**
   ```markdown
   # Features

   ## Authentication
   - Login
   - Register

   vs.

   ## Features

   ### Authentication
   * Login
   * Register
   ```
   Different projects use different formatting styles.

2. **Hard to Parse**
   ```typescript
   // AI tool must parse markdown
   const content = await fs.readFile('01-prd.md', 'utf-8');
   const sections = content.split('##');
   const features = sections.find(s => s.includes('Features'));
   // ... complex parsing logic
   ```

3. **No Validation**
   - Typos go undetected
   - Missing sections aren't flagged
   - Invalid data accepted
   - No schema enforcement

4. **Limited Queryability**
   - Can't filter by priority
   - Can't search by status
   - Can't aggregate metrics
   - Must read entire file

### Benefits of JSON

1. **Structured & Queryable**
   ```json
   {
     "features": [
       {
         "id": "feat-001",
         "name": "Authentication",
         "priority": "critical",
         "status": "in-progress"
       }
     ]
   }
   ```

2. **Validation with JSON Schema**
   ```json
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "type": "object",
     "required": ["features"],
     "properties": {
       "features": {
         "type": "array",
         "items": { "$ref": "#/definitions/Feature" }
       }
     }
   }
   ```

3. **Type-Safe Consumption**
   ```typescript
   const prd: PRDSchema = JSON.parse(await fs.readFile('prd.json'));
   const criticalFeatures = prd.features.filter(f => f.priority === 'critical');
   ```

4. **Fast Queries**
   ```typescript
   // No parsing needed - direct object access
   const inProgressFeatures = prd.features.filter(f => f.status === 'in-progress');
   ```

## JSON Schemas

### 1. Product Requirements Document (`prd.json`)

**Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Product Requirements Document",
  "type": "object",
  "required": ["version", "project", "overview", "features"],
  "properties": {
    "version": {
      "type": "string",
      "description": "Schema version",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "project": {
      "type": "object",
      "required": ["name", "description"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "description": { "type": "string", "minLength": 10 },
        "version": { "type": "string" },
        "targetAudience": {
          "type": "array",
          "items": { "type": "string" }
        },
        "businessGoals": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "overview": {
      "type": "object",
      "required": ["problem", "solution"],
      "properties": {
        "problem": { "type": "string", "minLength": 50 },
        "solution": { "type": "string", "minLength": 50 },
        "valueProposition": { "type": "string" },
        "competitiveAdvantage": { "type": "string" }
      }
    },
    "features": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "description", "priority"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^feat-\\d+$"
          },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "priority": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"]
          },
          "status": {
            "type": "string",
            "enum": ["planned", "in-progress", "completed", "blocked"],
            "default": "planned"
          },
          "userStories": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["role", "action", "benefit"],
              "properties": {
                "role": { "type": "string" },
                "action": { "type": "string" },
                "benefit": { "type": "string" },
                "acceptanceCriteria": {
                  "type": "array",
                  "items": { "type": "string" }
                }
              }
            }
          },
          "dependencies": {
            "type": "array",
            "items": { "type": "string" }
          },
          "estimatedHours": { "type": "number", "minimum": 0 },
          "actualHours": { "type": "number", "minimum": 0 }
        }
      }
    },
    "successMetrics": {
      "type": "object",
      "properties": {
        "user": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["metric", "target"],
            "properties": {
              "metric": { "type": "string" },
              "target": { "type": "string" },
              "measurement": { "type": "string" }
            }
          }
        },
        "business": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["metric", "target"],
            "properties": {
              "metric": { "type": "string" },
              "target": { "type": "string" },
              "measurement": { "type": "string" }
            }
          }
        }
      }
    },
    "timeline": {
      "type": "object",
      "properties": {
        "phases": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "duration"],
            "properties": {
              "name": { "type": "string" },
              "duration": { "type": "string" },
              "features": {
                "type": "array",
                "items": { "type": "string" }
              },
              "startDate": { "type": "string", "format": "date" },
              "endDate": { "type": "string", "format": "date" }
            }
          }
        }
      }
    }
  }
}
```

**Example**:
```json
{
  "version": "1.0.0",
  "project": {
    "name": "TaskMaster Pro",
    "description": "AI-powered task management for distributed teams",
    "version": "1.0.0",
    "targetAudience": [
      "Remote teams (10-50 people)",
      "Project managers",
      "Software development teams"
    ],
    "businessGoals": [
      "Achieve 10k MAU in 6 months",
      "30% conversion rate from free to paid",
      "$50k MRR by end of year 1"
    ]
  },
  "overview": {
    "problem": "Remote teams struggle with task coordination across time zones, leading to missed deadlines and duplicated work. Current tools lack AI-powered prioritization and smart notifications.",
    "solution": "TaskMaster Pro uses AI to automatically prioritize tasks, suggest optimal work times, and send context-aware notifications that respect team members' time zones and working hours.",
    "valueProposition": "Save 5+ hours per week on task management and never miss a critical deadline",
    "competitiveAdvantage": "Only tool that combines AI prioritization with timezone-aware collaboration"
  },
  "features": [
    {
      "id": "feat-001",
      "name": "AI Task Prioritization",
      "description": "Automatically prioritize tasks based on deadlines, dependencies, and team capacity",
      "priority": "critical",
      "status": "in-progress",
      "userStories": [
        {
          "role": "Project Manager",
          "action": "I want tasks automatically prioritized",
          "benefit": "so I can focus on execution instead of planning",
          "acceptanceCriteria": [
            "AI suggests priority for new tasks",
            "Priority updates based on changing deadlines",
            "Can override AI suggestions",
            "Priority explanation is clear"
          ]
        }
      ],
      "dependencies": [],
      "estimatedHours": 40,
      "actualHours": 25
    }
  ],
  "successMetrics": {
    "user": [
      {
        "metric": "Time saved per week",
        "target": "5+ hours",
        "measurement": "User survey + usage analytics"
      },
      {
        "metric": "User satisfaction",
        "target": "4.5+ stars",
        "measurement": "App store ratings"
      }
    ],
    "business": [
      {
        "metric": "Monthly Active Users",
        "target": "10,000",
        "measurement": "Analytics dashboard"
      },
      {
        "metric": "Conversion rate",
        "target": "30%",
        "measurement": "Payment analytics"
      }
    ]
  },
  "timeline": {
    "phases": [
      {
        "name": "MVP",
        "duration": "8 weeks",
        "features": ["feat-001", "feat-002", "feat-003"],
        "startDate": "2024-02-06",
        "endDate": "2024-04-01"
      }
    ]
  }
}
```

### 2. Features Document (`features.json`)

**Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Features Specification",
  "type": "object",
  "required": ["version", "features"],
  "properties": {
    "version": { "type": "string" },
    "features": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "category", "priority"],
        "properties": {
          "id": { "type": "string", "pattern": "^feat-\\d+$" },
          "name": { "type": "string" },
          "category": {
            "type": "string",
            "enum": ["core", "enhancement", "integration", "admin"]
          },
          "priority": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"]
          },
          "status": {
            "type": "string",
            "enum": ["planned", "in-progress", "completed", "blocked"]
          },
          "description": { "type": "string" },
          "requirements": {
            "type": "array",
            "items": { "type": "string" }
          },
          "components": {
            "type": "array",
            "items": { "type": "string" }
          },
          "screens": {
            "type": "array",
            "items": { "type": "string" }
          },
          "acceptanceCriteria": {
            "type": "array",
            "items": { "type": "string" }
          },
          "testingNotes": { "type": "string" },
          "estimatedEffort": {
            "type": "object",
            "properties": {
              "hours": { "type": "number" },
              "complexity": {
                "type": "string",
                "enum": ["low", "medium", "high"]
              }
            }
          }
        }
      }
    },
    "featureGroups": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "features"],
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "features": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

### 3. User Flows Document (`flows.json`)

**Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User Flows Specification",
  "type": "object",
  "required": ["version", "flows"],
  "properties": {
    "version": { "type": "string" },
    "flows": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "userType", "steps"],
        "properties": {
          "id": { "type": "string", "pattern": "^flow-\\d+$" },
          "name": { "type": "string" },
          "userType": { "type": "string" },
          "trigger": { "type": "string" },
          "goal": { "type": "string" },
          "steps": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["step", "screen", "action"],
              "properties": {
                "step": { "type": "integer", "minimum": 1 },
                "screen": { "type": "string" },
                "action": { "type": "string" },
                "userInput": { "type": "string" },
                "systemResponse": { "type": "string" },
                "alternativePaths": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "condition": { "type": "string" },
                      "nextStep": { "type": "integer" }
                    }
                  }
                },
                "components": {
                  "type": "array",
                  "items": { "type": "string" }
                }
              }
            }
          },
          "successCriteria": {
            "type": "array",
            "items": { "type": "string" }
          },
          "errorHandling": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "error": { "type": "string" },
                "handling": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

### 4. Branding Document (`branding.json`)

**Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Branding & Design System",
  "type": "object",
  "required": ["version", "colors", "typography"],
  "properties": {
    "version": { "type": "string" },
    "colors": {
      "type": "object",
      "required": ["primary", "secondary", "neutral"],
      "properties": {
        "primary": {
          "type": "object",
          "required": ["50", "500", "900"],
          "patternProperties": {
            "^(50|100|200|300|400|500|600|700|800|900)$": {
              "type": "string",
              "pattern": "^#[0-9A-Fa-f]{6}$"
            }
          }
        },
        "secondary": { "$ref": "#/properties/colors/properties/primary" },
        "neutral": { "$ref": "#/properties/colors/properties/primary" },
        "semantic": {
          "type": "object",
          "properties": {
            "success": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
            "warning": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
            "error": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
            "info": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" }
          }
        }
      }
    },
    "typography": {
      "type": "object",
      "required": ["fontFamily", "scale"],
      "properties": {
        "fontFamily": {
          "type": "object",
          "properties": {
            "sans": { "type": "string" },
            "serif": { "type": "string" },
            "mono": { "type": "string" }
          }
        },
        "scale": {
          "type": "object",
          "patternProperties": {
            "^(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$": {
              "type": "object",
              "required": ["size", "lineHeight"],
              "properties": {
                "size": { "type": "string" },
                "lineHeight": { "type": "string" },
                "letterSpacing": { "type": "string" },
                "fontWeight": { "type": "integer" }
              }
            }
          }
        }
      }
    },
    "spacing": {
      "type": "object",
      "properties": {
        "baseUnit": { "type": "integer", "default": 4 },
        "scale": {
          "type": "object",
          "patternProperties": {
            "^\\d+$": { "type": "string" }
          }
        }
      }
    },
    "breakpoints": {
      "type": "object",
      "properties": {
        "sm": { "type": "string" },
        "md": { "type": "string" },
        "lg": { "type": "string" },
        "xl": { "type": "string" },
        "2xl": { "type": "string" }
      }
    },
    "borderRadius": {
      "type": "object",
      "patternProperties": {
        "^(none|sm|base|md|lg|xl|full)$": { "type": "string" }
      }
    },
    "shadows": {
      "type": "object",
      "patternProperties": {
        "^(sm|base|md|lg|xl)$": { "type": "string" }
      }
    }
  }
}
```

### 5. Technical Specifications (`specs.json`)

**Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Technical Specifications",
  "type": "object",
  "required": ["version", "stack", "architecture"],
  "properties": {
    "version": { "type": "string" },
    "stack": {
      "type": "object",
      "properties": {
        "frontend": {
          "type": "object",
          "properties": {
            "framework": { "type": "string" },
            "version": { "type": "string" },
            "ui": { "type": "string" },
            "stateManagement": { "type": "string" },
            "routing": { "type": "string" }
          }
        },
        "backend": {
          "type": "object",
          "properties": {
            "runtime": { "type": "string" },
            "framework": { "type": "string" },
            "database": { "type": "string" },
            "orm": { "type": "string" },
            "authentication": { "type": "string" }
          }
        },
        "infrastructure": {
          "type": "object",
          "properties": {
            "hosting": { "type": "string" },
            "cdn": { "type": "string" },
            "storage": { "type": "string" },
            "monitoring": { "type": "string" }
          }
        }
      }
    },
    "architecture": {
      "type": "object",
      "properties": {
        "pattern": {
          "type": "string",
          "enum": ["mvc", "mvvm", "clean", "layered", "microservices"]
        },
        "dataFlow": { "type": "string" },
        "folderStructure": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      }
    },
    "apiContracts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["endpoint", "method"],
        "properties": {
          "endpoint": { "type": "string" },
          "method": {
            "type": "string",
            "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"]
          },
          "description": { "type": "string" },
          "authentication": { "type": "boolean" },
          "requestBody": { "type": "object" },
          "responseBody": { "type": "object" },
          "errorCodes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "code": { "type": "integer" },
                "description": { "type": "string" }
              }
            }
          }
        }
      }
    },
    "constraints": {
      "type": "object",
      "properties": {
        "performance": {
          "type": "array",
          "items": { "type": "string" }
        },
        "security": {
          "type": "array",
          "items": { "type": "string" }
        },
        "scalability": {
          "type": "array",
          "items": { "type": "string" }
        },
        "compliance": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

## Migration Strategy

### Converter Implementation

```typescript
class MarkdownToJSONConverter {
  async convertPRD(markdownPath: string): Promise<PRDSchema> {
    const markdown = await fs.readFile(markdownPath, 'utf-8');
    const ast = parseMarkdown(markdown);

    return {
      version: '1.0.0',
      project: this.extractProjectInfo(ast),
      overview: this.extractOverview(ast),
      features: this.extractFeatures(ast),
      successMetrics: this.extractMetrics(ast),
      timeline: this.extractTimeline(ast)
    };
  }

  private extractFeatures(ast: MarkdownAST): Feature[] {
    const featuresSection = ast.findSection('Features');
    if (!featuresSection) return [];

    return featuresSection.subsections.map((subsection, index) => ({
      id: `feat-${String(index + 1).padStart(3, '0')}`,
      name: subsection.heading,
      description: subsection.content,
      priority: this.inferPriority(subsection),
      status: 'planned',
      userStories: this.extractUserStories(subsection),
      dependencies: [],
      estimatedHours: 0
    }));
  }
}
```

### CLI Commands

```bash
# Convert single file
mycontext convert:json 01-prd.md

# Convert all context files
mycontext convert:json --all

# Validate converted files
mycontext convert:json --all --validate

# Generate both formats
mycontext generate context --full --format both
```

### Gradual Migration

**Phase 1: Dual Format Support (Week 1)**
- Generate both .md and .json
- MCP reads .json if available, falls back to .md
- No breaking changes

**Phase 2: JSON Preferred (Week 2)**
- Documentation encourages JSON
- New projects default to JSON
- Converter available for migration

**Phase 3: JSON Required (Future)**
- Deprecation warning for .md-only projects
- Auto-convert on command execution
- Eventually remove .md support

## Validation

### Automatic Validation

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

class ContextValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.loadSchemas();
  }

  async validatePRD(prdPath: string): Promise<ValidationResult> {
    const prd = JSON.parse(await fs.readFile(prdPath, 'utf-8'));
    const validate = this.ajv.getSchema('prd');

    if (!validate) {
      throw new Error('PRD schema not loaded');
    }

    const valid = validate(prd);

    return {
      valid,
      errors: validate.errors || [],
      warnings: this.checkWarnings(prd)
    };
  }

  private checkWarnings(prd: any): Warning[] {
    const warnings: Warning[] = [];

    // Check for missing optional but recommended fields
    if (!prd.overview.competitiveAdvantage) {
      warnings.push({
        field: 'overview.competitiveAdvantage',
        message: 'Recommended: Add competitive advantage'
      });
    }

    // Check for features without user stories
    prd.features.forEach((feature: any, index: number) => {
      if (!feature.userStories || feature.userStories.length === 0) {
        warnings.push({
          field: `features[${index}].userStories`,
          message: `Feature "${feature.name}" has no user stories`
        });
      }
    });

    return warnings;
  }
}
```

### CLI Validation

```bash
# Validate all JSON files
mycontext validate:json

# Validate specific file
mycontext validate:json prd.json

# Show warnings
mycontext validate:json --warnings

# Fix auto-fixable issues
mycontext validate:json --fix
```

## TypeScript Types

Generate TypeScript types from JSON schemas:

```bash
# Generate types
mycontext types:generate

# Output: src/types/context.ts
```

```typescript
// Auto-generated from schemas
export interface PRDSchema {
  version: string;
  project: ProjectInfo;
  overview: Overview;
  features: Feature[];
  successMetrics?: SuccessMetrics;
  timeline?: Timeline;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'planned' | 'in-progress' | 'completed' | 'blocked';
  userStories?: UserStory[];
  dependencies?: string[];
  estimatedHours?: number;
  actualHours?: number;
}

// ... etc
```

## Performance Considerations

### File Size Comparison

| Format | PRD | Features | Flows | Total |
|--------|-----|----------|-------|-------|
| Markdown | 45KB | 30KB | 25KB | 100KB |
| JSON | 65KB | 45KB | 35KB | 145KB |
| JSON (gzipped) | 15KB | 10KB | 8KB | 33KB |

**Recommendation**: Always serve JSON with gzip compression.

### Parse Speed

| Format | Parse Time (100 features) |
|--------|---------------------------|
| Markdown | ~50ms (with parsing) |
| JSON | ~5ms (native) |

**10x faster** with JSON.

## Success Metrics

- **Conversion Accuracy**: 100% data preservation
- **Validation Coverage**: Catch 95% of common errors
- **Adoption Rate**: 80% of projects using JSON within 6 months
- **Performance**: 10x faster than markdown parsing

## Implementation Tasks

### Week 1: Foundation
- [ ] Define all JSON schemas
- [ ] Implement schema validation
- [ ] Create TypeScript types
- [ ] Write unit tests

### Week 2: Conversion
- [ ] Implement markdown → JSON converter
- [ ] Add `convert:json` command
- [ ] Handle edge cases
- [ ] Integration tests

### Week 3: Integration
- [ ] Update generators to output JSON
- [ ] Update MCP server to read JSON
- [ ] Add dual-format support
- [ ] Documentation

## Related Documentation

- [Context Manifest](./02-context-manifest.md) - Uses JSON schemas
- [MCP Server](./01-mcp-server.md) - Consumes JSON files
- [Implementation Priority](./implementation-priority.md) - Timeline

---

**Status**: 📋 Planned
**Priority**: P1 (Important)
**Effort**: 1 week
**Dependencies**: Context Manifest
**Last Updated**: February 6, 2024
