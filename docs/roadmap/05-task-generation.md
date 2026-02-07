# Task Generation Implementation

**Status**: 📋 Planned | **Priority**: P2 (Important) | **Effort**: 3 days

## What is Task Generation?

**Task Generation** automatically creates actionable development tasks from your MyContext specifications. Instead of manually breaking down features into tasks, the system analyzes your PRD, component specs, and dependency graph to generate a complete, prioritized task list.

**Think of it as**: An AI project manager that reads your specs and creates a Jira/Linear board for you.

## Why It's Important

### Current Pain Points

1. **Manual Task Breakdown** (2-4 hours per project)
   - Must manually read PRD
   - Must break features into tasks
   - Must estimate effort for each task
   - Must determine task dependencies

2. **Inconsistent Task Quality**
   - Vague task descriptions
   - Missing acceptance criteria
   - Incorrect effort estimates
   - Poor prioritization

3. **No Integration with Specs**
   - Tasks not linked to specifications
   - Can't verify task completion against specs
   - Hard to track feature implementation progress

### Benefits of Task Generation

1. **Instant Task Breakdown** (< 30 seconds)
   ```bash
   mycontext tasks:generate
   # ✓ Generated 47 tasks from 8 features
   # ✓ Estimated 120 hours total effort
   # ✓ Created dependency graph
   ```

2. **Accurate Effort Estimation**
   ```typescript
   // AI analyzes complexity
   {
     "task": "Implement LoginForm component",
     "estimatedHours": 4,
     "confidence": 0.85,
     "factors": {
       "complexity": "medium",
       "dependencies": 3,
       "similar_tasks": ["SignupForm"]
     }
   }
   ```

3. **Smart Prioritization**
   ```typescript
   // Priority based on:
   // - Feature importance
   // - Dependencies
   // - User impact
   // - Technical risk
   {
     "priority": "critical",
     "reason": "Blocking 5 other tasks"
   }
   ```

## Task Structure

### Data Model

```typescript
interface Task {
  id: string;
  title: string;
  description: string;

  // Categorization
  type: 'feature' | 'component' | 'bug' | 'refactor' | 'docs' | 'test';
  category: string; // e.g., 'authentication', 'ui', 'api'

  // Priority
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityScore: number; // 0-100

  // Effort
  estimatedHours: number;
  complexity: 'simple' | 'medium' | 'complex';
  confidence: number; // 0-1

  // Relationships
  feature?: string; // Feature ID
  component?: string; // Component name
  dependsOn: string[]; // Task IDs
  blockedBy: string[]; // Task IDs
  blocks: string[]; // Task IDs

  // Implementation
  acceptanceCriteria: string[];
  technicalNotes: string[];
  relatedFiles: string[];
  testRequirements: string[];

  // Status
  status: 'todo' | 'in-progress' | 'review' | 'done';
  assignee?: string;
  dueDate?: string;

  // Tracking
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;

  // External integration
  externalId?: string; // GitHub issue number, Linear ID, etc.
  externalUrl?: string;
}

interface TaskList {
  tasks: Task[];
  summary: TaskSummary;
  buildOrder: string[][]; // Tasks grouped by dependency layer
}

interface TaskSummary {
  total: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byStatus: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  totalEstimatedHours: number;
  criticalPath: string[]; // Task IDs on critical path
  nextTasks: string[]; // Tasks ready to start
}
```

### Example Task

```json
{
  "id": "task-001",
  "title": "Implement LoginForm component",
  "description": "Create a reusable login form component with email/password fields, validation, and error handling",

  "type": "component",
  "category": "authentication",

  "priority": "critical",
  "priorityScore": 95,

  "estimatedHours": 4,
  "complexity": "medium",
  "confidence": 0.85,

  "feature": "feat-auth-001",
  "component": "LoginForm",
  "dependsOn": ["task-002", "task-003"],
  "blockedBy": [],
  "blocks": ["task-010", "task-011"],

  "acceptanceCriteria": [
    "Form validates email format",
    "Form validates password requirements (8+ chars, 1 number, 1 special char)",
    "Shows error messages for invalid inputs",
    "Handles loading state during submission",
    "Shows success message on successful login",
    "Redirects to dashboard after login"
  ],

  "technicalNotes": [
    "Use react-hook-form for form management",
    "Use zod for validation schema",
    "Follow design system in .mycontext/03-branding.md",
    "Implement according to spec in .mycontext/04-component-list.json"
  ],

  "relatedFiles": [
    "components/auth/LoginForm.tsx",
    ".mycontext/screens/login/login.jsx",
    ".mycontext/04-component-list.json"
  ],

  "testRequirements": [
    "Unit tests for validation logic",
    "Integration test for form submission",
    "E2E test for login flow"
  ],

  "status": "todo",
  "createdAt": "2024-02-06T10:00:00Z",
  "updatedAt": "2024-02-06T10:00:00Z"
}
```

## Generation Algorithm

### Phase 1: Extract Features (Day 1)

```typescript
class TaskGenerator {
  async generateTasks(projectPath: string): Promise<TaskList> {
    const manifest = await this.loadManifest(projectPath);

    // Step 1: Generate feature-level tasks
    const featureTasks = await this.generateFeatureTasks(manifest.features);

    // Step 2: Generate component-level tasks
    const componentTasks = await this.generateComponentTasks(manifest.components);

    // Step 3: Generate test tasks
    const testTasks = await this.generateTestTasks(manifest);

    // Step 4: Calculate priorities
    const allTasks = [...featureTasks, ...componentTasks, ...testTasks];
    this.calculatePriorities(allTasks, manifest);

    // Step 5: Estimate effort
    await this.estimateEffort(allTasks, manifest);

    // Step 6: Build dependency graph
    this.buildTaskDependencies(allTasks, manifest);

    // Step 7: Generate summary
    const summary = this.generateSummary(allTasks);

    return {
      tasks: allTasks,
      summary,
      buildOrder: this.calculateBuildOrder(allTasks)
    };
  }

  private async generateFeatureTasks(features: Feature[]): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const feature of features) {
      // Create main feature task
      const featureTask: Task = {
        id: `task-feat-${feature.id}`,
        title: `Implement ${feature.name}`,
        description: feature.description,
        type: 'feature',
        category: this.categorizeFeature(feature),
        priority: feature.priority,
        priorityScore: 0, // Will be calculated
        estimatedHours: feature.estimatedHours || 0,
        complexity: this.assessComplexity(feature),
        confidence: 0.7,
        feature: feature.id,
        dependsOn: [],
        blockedBy: [],
        blocks: [],
        acceptanceCriteria: feature.acceptanceCriteria || [],
        technicalNotes: [],
        relatedFiles: [],
        testRequirements: [
          'Integration tests for all acceptance criteria',
          'E2E tests for user flows'
        ],
        status: feature.status === 'completed' ? 'done' : 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      tasks.push(featureTask);
    }

    return tasks;
  }

  private async generateComponentTasks(components: Component[]): Promise<Task[]> {
    const tasks: Task[] = [];

    for (const component of components) {
      // Skip if already completed
      if (component.status === 'completed') continue;

      const task: Task = {
        id: `task-comp-${component.id}`,
        title: `Build ${component.name} component`,
        description: component.description,
        type: 'component',
        category: component.group || 'general',
        priority: component.priority,
        priorityScore: 0,
        estimatedHours: this.estimateComponentHours(component),
        complexity: this.assessComponentComplexity(component),
        confidence: 0.8,
        component: component.name,
        dependsOn: [], // Will be filled from dependency graph
        blockedBy: [],
        blocks: [],
        acceptanceCriteria: this.generateComponentAcceptanceCriteria(component),
        technicalNotes: [
          `Implements specification in .mycontext/04-component-list.json`,
          `Follow design system in .mycontext/03-branding.md`,
          component.linkedScreens.length > 0
            ? `Reference screen design in .mycontext/screens/${component.linkedScreens[0]}`
            : ''
        ].filter(Boolean),
        relatedFiles: [
          component.path,
          ...component.linkedScreens.map(s => `.mycontext/screens/${s}`)
        ],
        testRequirements: [
          'Unit tests for all props and variants',
          'Accessibility tests (ARIA, keyboard navigation)',
          component.type === 'form' ? 'Form validation tests' : ''
        ].filter(Boolean),
        status: 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      tasks.push(task);
    }

    return tasks;
  }

  private estimateComponentHours(component: Component): number {
    let hours = 2; // Base time

    // Adjust based on type
    const typeMultipliers = {
      page: 4,
      layout: 3,
      form: 3,
      ui: 2,
      display: 1
    };
    hours *= typeMultipliers[component.type] || 2;

    // Adjust based on props count
    if (component.props) {
      hours += component.props.length * 0.5;
    }

    // Adjust based on dependencies
    hours += component.dependencies.length * 0.3;

    // Adjust based on complexity
    if (component.description.length > 200) {
      hours *= 1.5; // Long description = complex component
    }

    return Math.round(hours * 2) / 2; // Round to nearest 0.5
  }

  private assessComponentComplexity(component: Component): 'simple' | 'medium' | 'complex' {
    let score = 0;

    // Factor 1: Type
    if (component.type === 'page') score += 3;
    else if (component.type === 'layout' || component.type === 'form') score += 2;
    else score += 1;

    // Factor 2: Dependencies
    score += Math.min(component.dependencies.length, 3);

    // Factor 3: Props
    if (component.props) {
      score += Math.min(component.props.length / 3, 2);
    }

    if (score <= 3) return 'simple';
    if (score <= 6) return 'medium';
    return 'complex';
  }
}
```

### Phase 2: Priority Calculation (Day 2)

```typescript
class PriorityCalculator {
  calculatePriority(task: Task, manifest: ContextManifest): number {
    let score = 0;

    // Factor 1: Feature priority (40% weight)
    if (task.feature) {
      const feature = manifest.features.find(f => f.id === task.feature);
      if (feature) {
        const priorityScores = {
          critical: 100,
          high: 75,
          medium: 50,
          low: 25
        };
        score += (priorityScores[feature.priority] || 50) * 0.4;
      }
    }

    // Factor 2: Blocking other tasks (30% weight)
    const blockingCount = task.blocks.length;
    score += Math.min(blockingCount * 10, 30);

    // Factor 3: Dependencies (20% weight)
    const dependencyCount = task.dependsOn.length;
    const dependencyScore = Math.max(0, 20 - dependencyCount * 5);
    score += dependencyScore;

    // Factor 4: Component depth (10% weight)
    if (task.component) {
      const component = manifest.components.find(c => c.name === task.component);
      if (component) {
        // Lower depth = higher priority (foundation components first)
        score += Math.max(0, 10 - component.depth * 2);
      }
    }

    return Math.min(100, Math.round(score));
  }

  updatePriorities(tasks: Task[], manifest: ContextManifest) {
    for (const task of tasks) {
      task.priorityScore = this.calculatePriority(task, manifest);

      // Update priority label based on score
      if (task.priorityScore >= 80) task.priority = 'critical';
      else if (task.priorityScore >= 60) task.priority = 'high';
      else if (task.priorityScore >= 40) task.priority = 'medium';
      else task.priority = 'low';
    }

    // Sort by priority score
    tasks.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}
```

### Phase 3: Integration with PM Tools (Day 3)

```typescript
// GitHub Issues Integration
class GitHubIntegration {
  async exportTasks(tasks: Task[], repo: string): Promise<void> {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    for (const task of tasks) {
      // Skip if already exported
      if (task.externalId) continue;

      const issue = await octokit.rest.issues.create({
        owner: repo.split('/')[0],
        repo: repo.split('/')[1],
        title: task.title,
        body: this.formatTaskDescription(task),
        labels: [
          task.priority,
          task.type,
          task.category
        ].filter(Boolean)
      });

      task.externalId = issue.data.number.toString();
      task.externalUrl = issue.data.html_url;
    }
  }

  private formatTaskDescription(task: Task): string {
    const sections: string[] = [];

    sections.push(`## Description`);
    sections.push(task.description);
    sections.push('');

    sections.push(`## Details`);
    sections.push(`- **Type**: ${task.type}`);
    sections.push(`- **Category**: ${task.category}`);
    sections.push(`- **Estimated Effort**: ${task.estimatedHours}h`);
    sections.push(`- **Complexity**: ${task.complexity}`);
    sections.push('');

    if (task.acceptanceCriteria.length > 0) {
      sections.push(`## Acceptance Criteria`);
      task.acceptanceCriteria.forEach(criteria => {
        sections.push(`- [ ] ${criteria}`);
      });
      sections.push('');
    }

    if (task.technicalNotes.length > 0) {
      sections.push(`## Technical Notes`);
      task.technicalNotes.forEach(note => {
        sections.push(`- ${note}`);
      });
      sections.push('');
    }

    if (task.relatedFiles.length > 0) {
      sections.push(`## Related Files`);
      task.relatedFiles.forEach(file => {
        sections.push(`- \`${file}\``);
      });
      sections.push('');
    }

    if (task.dependsOn.length > 0) {
      sections.push(`## Dependencies`);
      sections.push(`This task depends on: ${task.dependsOn.join(', ')}`);
      sections.push('');
    }

    sections.push(`---`);
    sections.push(`_Generated by MyContext CLI_`);

    return sections.join('\n');
  }
}

// Linear Integration
class LinearIntegration {
  async exportTasks(tasks: Task[], teamId: string): Promise<void> {
    const linearClient = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

    for (const task of tasks) {
      if (task.externalId) continue;

      const issue = await linearClient.createIssue({
        teamId,
        title: task.title,
        description: this.formatTaskDescription(task),
        priority: this.mapPriority(task.priority),
        estimate: Math.ceil(task.estimatedHours / 4), // Convert hours to story points
        labelIds: await this.getLabelIds(linearClient, [task.type, task.category])
      });

      task.externalId = issue.id;
      task.externalUrl = issue.url;
    }
  }

  private mapPriority(priority: string): number {
    const mapping = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4
    };
    return mapping[priority] || 3;
  }
}
```

## CLI Commands

### Generate Tasks

```bash
# Generate tasks from current project
mycontext tasks:generate

# Output:
# ✓ Analyzed 8 features
# ✓ Found 25 components
# ✓ Generated 47 tasks
# ✓ Total estimated effort: 120 hours
# ✓ Tasks saved to .mycontext/tasks.json

# Generate and export to GitHub
mycontext tasks:generate --export github --repo username/repo

# Generate and export to Linear
mycontext tasks:generate --export linear --team TEAM-ID

# Filter by feature
mycontext tasks:generate --feature authentication

# Filter by priority
mycontext tasks:generate --priority critical --priority high
```

### List Tasks

```bash
# List all tasks
mycontext tasks:list

# Output:
# Critical (5):
#   1. Build Button component (4h)
#   2. Build Input component (3h)
#   3. Implement LoginForm (4h)
#   ...
#
# High (8):
#   ...

# List next tasks to work on
mycontext tasks:next

# Output:
# Ready to start (no blockers):
#   1. Build Button component (4h, critical)
#   2. Build Input component (3h, critical)
#   3. Build Card component (2h, high)

# List by assignee
mycontext tasks:list --assignee @me
```

### Update Task Status

```bash
# Mark task as in progress
mycontext tasks:update task-001 --status in-progress

# Mark task as completed
mycontext tasks:update task-001 --status done

# Assign task
mycontext tasks:update task-001 --assignee john@example.com

# Update estimate
mycontext tasks:update task-001 --hours 6
```

### Task Analytics

```bash
# Show task statistics
mycontext tasks:stats

# Output:
# Total Tasks: 47
# Completed: 12 (26%)
# In Progress: 5 (11%)
# To Do: 30 (63%)
#
# Total Effort: 120h
# Completed: 30h (25%)
# Remaining: 90h (75%)
#
# By Priority:
#   Critical: 5 tasks (20h)
#   High: 8 tasks (32h)
#   Medium: 24 tasks (52h)
#   Low: 10 tasks (16h)
#
# Critical Path: 8 tasks (32h)

# Show burndown
mycontext tasks:burndown

# Output:
# Week 1: 120h remaining
# Week 2: 90h remaining (-30h)
# Week 3: 60h remaining (-30h)
# Projected completion: Week 4
```

## Integration with MCP Server

Add task information to MCP queries:

```typescript
class ContextManager {
  async getNextTasks(filters?: TaskFilters): Promise<Task[]> {
    const tasks = await this.loadTasks();

    // Filter to ready tasks (no blockers)
    const readyTasks = tasks.filter(t =>
      t.status === 'todo' &&
      t.blockedBy.length === 0
    );

    // Sort by priority
    readyTasks.sort((a, b) => b.priorityScore - a.priorityScore);

    return readyTasks.slice(0, 5); // Top 5 tasks
  }

  async getTasksForComponent(componentName: string): Promise<Task[]> {
    const tasks = await this.loadTasks();
    return tasks.filter(t => t.component === componentName);
  }
}
```

## Use Cases

### 1. Project Kickoff

```bash
# Initialize project and generate tasks
mycontext init my-saas-app
mycontext generate context --full
mycontext tasks:generate --export github

# Result: Complete project board in GitHub Issues
```

### 2. Sprint Planning

```bash
# Get next sprint tasks (40 hours capacity)
mycontext tasks:next --hours 40

# Output:
# Recommended for next sprint (39h total):
#   1. Build Button component (4h, critical)
#   2. Build Input component (3h, critical)
#   3. Build Card component (2h, high)
#   4. Implement LoginForm (4h, critical)
#   5. Implement SignupForm (4h, high)
#   ... (8 more tasks)
```

### 3. Progress Tracking

```bash
# Check daily progress
mycontext tasks:stats

# Sync with GitHub Issues
mycontext tasks:sync github

# Generate report
mycontext tasks:report --format markdown > weekly-report.md
```

## Success Metrics

- **Task Generation Speed**: < 30 seconds for 50 tasks
- **Effort Estimate Accuracy**: Within 30% of actual time
- **Priority Accuracy**: 80% agreement with manual prioritization
- **Adoption**: 60% of users export tasks to PM tools
- **Time Savings**: 2-4 hours saved per project on task planning

## Related Documentation

- [Context Manifest](./02-context-manifest.md) - Source data for task generation
- [Dependency Graph](./04-dependency-graph.md) - Used for task dependencies
- [Flow Testing MCP Server](./06-flow-testing-mcp.md) - Test creation as a task type
- [Implementation Priority](./implementation-priority.md) - Development timeline

---

**Status**: 📋 Planned
**Priority**: P2 (Important)
**Effort**: 3 days
**Dependencies**: Context Manifest, Dependency Graph
**Last Updated**: February 7, 2026
