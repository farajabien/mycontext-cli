# mycontext PM - Technical Specification

## 🎯 **Overview**

mycontext PM is a **hybrid project management system** that can be deployed as an optional Next.js application for teams requiring advanced project oversight. The core MyContext CLI works independently, with PM UI as an optional enhancement.

## 🔄 **Integration Strategy**

### **CLI-First Approach**

MyContext CLI is the primary interface and works completely independently:

- **Core Promise**: Generate components → Assemble features → Deploy apps
- **No PM Required**: Full functionality without any PM system
- **Optional Enhancement**: PM UI adds team collaboration and advanced monitoring

### **Hybrid PM Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MyContext CLI │    │  mycontext PM   │    │   Admin UI      │
│   (Core)        │◄──►│  (Optional)     │◄──►│  (Self-hosted)  │
│                 │    │                 │    │                 │
│ • Components    │    │ • Task Planning │    │ • Dashboard     │
│ • Features      │    │ • Progress Sync │    │ • Team Mgmt     │
│ • Deployment    │    │ • Agent AI      │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **InstantDB + shadcn Alignment**

The PM system uses the same tech stack as the admin starter:

- **InstantDB**: Real-time database (consistent with admin starter)
- **shadcn/ui**: Component library (consistent with generated components)
- **Next.js 14+**: App Router (consistent with generated apps)

This ensures seamless integration when PM UI is deployed alongside MyContext-generated applications.

## 🔗 **CLI Integration Points**

### **Minimal PM Integration in CLI**

The CLI provides basic PM integration without requiring the full PM system:

```bash
# Export project data for PM systems
mycontext export-progress --format json --webhook <pm-url>

# Import PM project plans
mycontext import-project-plan ./pm-plan.json

# Sync progress with external PM tools
mycontext export-progress --auto-sync
```

### **Webhook Endpoints**

PM system can receive real-time updates from CLI:

- **Progress Updates**: Task completion, component generation status
- **Error Notifications**: Build failures, validation errors
- **Milestone Achievements**: Architecture complete, features assembled

### **Export/Import Commands**

- **Export**: Project structure, component list, progress data
- **Import**: PM-generated project plans, task breakdowns
- **Sync**: Bidirectional data synchronization

## 🚀 **Future Roadmap**

### **Phase 5+: Optional PM Dashboard (Future)**

The following features are documented for future implementation as an optional self-hosted PM dashboard:

#### **PM Agent Implementation (Optional)**

- Multi-agent architecture with PM, PA, and Developer agents
- Requirement extraction system with schema validation
- PM agent for task decomposition, planning, and assignment logic
- MCP connectors for GitHub, project management tools, and communication platforms
- Real-time monitoring system with hourly checks and progress updates
- Audit system with approval workflows and human oversight

#### **Cloud-Hosted PM Option**

- Team collaboration features
- Multi-tenant project management
- Advanced analytics and reporting
- Integration with external PM tools (Jira, Asana, Linear)

#### **Self-Hosted PM Dashboard**

- Local deployment with Docker
- InstantDB + shadcn UI
- Real-time progress monitoring
- Team member management
- Project analytics and insights

## 🏗️ **Technical Architecture**

### **Tech Stack**

```typescript
// Core Framework
- Next.js 14+ (App Router)
- TypeScript 5.0+
- Node.js 18+

// Database & ORM
- PostgreSQL 15+
- Prisma ORM
- Database URL: postgresql://username:password@localhost:5432/mycontext_pm

// Authentication & Security
- NextAuth.js 4.24+
- JWT tokens for API authentication
- bcryptjs for password hashing

// UI & Styling
- Tailwind CSS 3.3+
- shadcn/ui component library
- Radix UI primitives
- Lucide React icons

// Real-time Features
- Socket.IO for real-time updates
- WebSocket connections for live progress monitoring

// AI Integration
- @anthropic-ai/sdk for Claude Agent SDK
- Agent orchestration with context management
- Streaming responses for real-time agent communication

// API & Communication
- RESTful APIs with tRPC
- Webhook endpoints for CLI integration
- CORS configuration for cross-origin requests

// Development & Testing
- Jest + React Testing Library
- Playwright for E2E testing
- ESLint + Prettier for code quality
```

### **Project Structure**

```
mycontext-pm/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── projects/
│   │   ├── tasks/
│   │   └── settings/
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── agents/
│   │   └── webhooks/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # Reusable UI components
│   ├── ui/                       # shadcn/ui components
│   ├── forms/                    # Form components
│   ├── dashboard/                # Dashboard-specific components
│   └── agents/                   # Agent-related components
├── lib/                          # Utility libraries
│   ├── agents/                   # Claude Agent implementations
│   ├── database/                 # Database utilities
│   ├── auth/                     # Authentication utilities
│   ├── validations/              # Zod schemas
│   └── webhooks/                 # Webhook handlers
├── prisma/                       # Database schema
│   ├── schema.prisma
│   └── migrations/
├── types/                        # TypeScript type definitions
│   ├── api.ts
│   ├── database.ts
│   └── agents.ts
├── hooks/                        # Custom React hooks
├── utils/                        # Utility functions
└── middleware.ts                 # Next.js middleware
```

## 🗄️ **Database Schema**

### **Core Entities**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  projects     Project[]
  ownedProjects Project[] @relation("ProjectOwner")
  tasks        Task[]
  sessions     Session[]
  accounts     Account[]

  @@map("users")
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(PLANNING)

  // Client information
  clientName    String?
  clientEmail   String?
  clientCompany String?

  // Timeline
  startDate     DateTime?
  endDate       DateTime?
  estimatedHours Int?

  // Budget (optional)
  budget        Float?
  currency      String @default("USD")

  // Tech stack
  techStack     Json? // Array of strings

  // AI-generated content
  aiAnalysis    Json? // Claude analysis results
  breakdown     Json? // Epics, user stories, tasks

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  ownerId     String
  owner       User @relation("ProjectOwner", fields: [ownerId], references: [id])
  members     User[]
  epics       Epic[]
  tasks       Task[]
  agents      Agent[]

  @@map("projects")
}

model Epic {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      EpicStatus @default(PLANNED)
  priority    Priority @default(MEDIUM)

  // Timeline
  startDate   DateTime?
  endDate     DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  projectId   String
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userStories UserStory[]

  @@map("epics")
}

model UserStory {
  id          String   @id @default(cuid())
  title       String
  description String?
  acceptanceCriteria String?
  status      UserStoryStatus @default(PLANNED)
  priority    Priority @default(MEDIUM)
  storyPoints Int?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  epicId      String
  epic        Epic @relation(fields: [epicId], references: [id], onDelete: Cascade)
  tasks       Task[]

  @@map("user_stories")
}

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority @default(MEDIUM)

  // Estimation
  estimatedHours Float?
  actualHours    Float?

  // Assignment
  assignedToId String?
  assignedTo   User? @relation(fields: [assignedToId], references: [id])

  // Timeline
  dueDate     DateTime?
  completedAt DateTime?

  // CLI Integration
  cliTaskId   String? // Reference to MyContext CLI task
  cliStatus   String? // Sync status from CLI

  // Metadata
  tags        String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  projectId   String
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userStoryId String?
  userStory   UserStory? @relation(fields: [userStoryId], references: [id])
  createdById String
  createdBy   User @relation(fields: [createdById], references: [id])

  @@map("tasks")
}

model Agent {
  id          String   @id @default(cuid())
  name        String
  type        AgentType
  status      AgentStatus @default(IDLE)

  // Configuration
  systemPrompt String?
  model       String @default("claude-3-5-sonnet-20241022")
  temperature Float @default(0.7)

  // Activity tracking
  lastActive  DateTime?
  messageCount Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])

  @@map("agents")
}

model AgentConversation {
  id        String   @id @default(cuid())
  agentId   String
  projectId String?

  // Conversation data
  messages  Json // Array of message objects
  context   Json? // Additional context data

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  agent   Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@map("agent_conversations")
}

model WebhookLog {
  id        String   @id @default(cuid())
  url       String
  method    String
  statusCode Int?
  requestBody Json?
  responseBody Json?
  error     String?

  createdAt DateTime @default(now())

  @@map("webhook_logs")
}

// Enums
enum UserRole {
  USER
  ADMIN
  CLIENT
}

enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum EpicStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum UserStoryStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AgentType {
  PROJECT_MANAGER
  PERSONAL_ASSISTANT
  DEVELOPER
}

enum AgentStatus {
  IDLE
  ACTIVE
  ERROR
}
```

## 🔐 **Authentication & Security**

### **NextAuth.js Configuration**

```typescript
// lib/auth/config.ts
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );
        if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },
};
```

### **API Security**

```typescript
// lib/auth/api-protection.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./config";

export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  options: { requiredRole?: string } = {}
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return {
      error: { message: "Unauthorized", statusCode: 401 },
    };
  }

  if (options.requiredRole && session.user.role !== options.requiredRole) {
    return {
      error: { message: "Insufficient permissions", statusCode: 403 },
    };
  }

  return { session };
}

// API key authentication for CLI integration
export async function requireApiKey(req: NextApiRequest) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    throw new Error("API key required");
  }

  // Verify API key against database
  const project = await prisma.project.findFirst({
    where: { apiKey },
  });

  if (!project) {
    throw new Error("Invalid API key");
  }

  return project;
}
```

## 🤖 **Agent Implementation**

### **Claude Agent SDK Integration**

```typescript
// lib/agents/base-agent.ts
import Anthropic from "@anthropic-ai/sdk";

export abstract class BaseAgent {
  protected client: Anthropic;
  protected agentId: string;
  protected systemPrompt: string;

  constructor(agentId: string, systemPrompt: string) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    this.agentId = agentId;
    this.systemPrompt = systemPrompt;
  }

  protected async callClaude(
    messages: Anthropic.Messages.MessageParam[],
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ) {
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      system: this.systemPrompt,
      messages,
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  abstract async processRequest(input: any): Promise<any>;
}
```

### **Project Manager Agent**

```typescript
// lib/agents/project-manager.ts
import { BaseAgent } from "./base-agent";

interface ProjectRequirements {
  description: string;
  techStack: string[];
  timeline: {
    startDate: string;
    endDate: string;
  };
  budget?: number;
  teamSize?: number;
}

interface ProjectBreakdown {
  epics: Array<{
    title: string;
    description: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    estimatedHours: number;
    userStories: Array<{
      title: string;
      description: string;
      acceptanceCriteria: string;
      storyPoints: number;
      tasks: Array<{
        title: string;
        description: string;
        estimatedHours: number;
        dependencies: string[];
      }>;
    }>;
  }>;
}

export class ProjectManagerAgent extends BaseAgent {
  constructor() {
    super(
      "project-manager",
      `You are an expert project manager who decomposes client requirements into structured project plans.
      Your role is to:
      1. Analyze client requirements and constraints
      2. Break down projects into epics, user stories, and tasks
      3. Estimate effort and create realistic timelines
      4. Identify risks and dependencies
      5. Ensure projects are deliverable within constraints

      Always provide detailed, actionable breakdowns with clear acceptance criteria.`
    );
  }

  async analyzeRequirements(
    requirements: ProjectRequirements
  ): Promise<ProjectBreakdown> {
    const prompt = `
Analyze these project requirements and create a detailed breakdown:

CLIENT REQUIREMENTS:
${requirements.description}

TECHNICAL STACK:
${requirements.techStack.join(", ")}

TIMELINE:
Start: ${requirements.startDate}
End: ${requirements.endDate}

${requirements.budget ? `BUDGET: $${requirements.budget}` : ""}
${requirements.teamSize ? `TEAM SIZE: ${requirements.teamSize} developers` : ""}

Please provide a JSON response with this exact structure:
{
  "epics": [
    {
      "title": "string",
      "description": "string",
      "priority": "HIGH|MEDIUM|LOW",
      "estimatedHours": number,
      "userStories": [
        {
          "title": "string",
          "description": "string",
          "acceptanceCriteria": "string",
          "storyPoints": number,
          "tasks": [
            {
              "title": "string",
              "description": "string",
              "estimatedHours": number,
              "dependencies": ["task-id-1", "task-id-2"]
            }
          ]
        }
      ]
    }
  ]
}
`;

    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: prompt },
    ];

    const response = await this.callClaude(messages);
    return JSON.parse(response);
  }

  async monitorProgress(projectId: string): Promise<{
    status: "ON_TRACK" | "AT_RISK" | "BEHIND";
    issues: string[];
    recommendations: string[];
  }> {
    // Implementation for progress monitoring
    const prompt = `Monitor project progress and provide status assessment...`;
    const response = await this.callClaude([{ role: "user", content: prompt }]);
    return JSON.parse(response);
  }
}
```

### **Personal Assistant Agent**

```typescript
// lib/agents/personal-assistant.ts
import { BaseAgent } from "./base-agent";

export class PersonalAssistantAgent extends BaseAgent {
  constructor() {
    super(
      "personal-assistant",
      `You are a professional personal assistant for project management.
      Your role is to:
      1. Schedule meetings and manage calendars
      2. Send notifications and reminders
      3. Prepare status reports and documentation
      4. Handle administrative tasks
      5. Ensure smooth communication between stakeholders`
    );
  }

  async scheduleMeeting(details: {
    title: string;
    participants: string[];
    duration: number;
    preferredTime?: string;
  }) {
    // Implementation for meeting scheduling
  }

  async sendNotification(
    recipient: string,
    message: string,
    priority: "LOW" | "MEDIUM" | "HIGH"
  ) {
    // Implementation for notifications
  }

  async generateStatusReport(projectId: string) {
    // Implementation for status reports
  }
}
```

## 🌐 **API Endpoints**

### **REST API Routes**

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-protection";
import { prisma } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuth(request, NextResponse);
    if ("error" in session)
      return NextResponse.json(session.error, {
        status: session.error.statusCode,
      });

    const projects = await prisma.project.findMany({
      where: { ownerId: session.user.id },
      include: {
        tasks: true,
        epics: true,
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth(request, NextResponse);
    if ("error" in session)
      return NextResponse.json(session.error, {
        status: session.error.statusCode,
      });

    const body = await request.json();
    const { name, description, techStack, timeline } = body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        techStack,
        startDate: new Date(timeline.startDate),
        endDate: new Date(timeline.endDate),
        ownerId: session.user.id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
```

### **Webhook Endpoints for CLI Integration**

```typescript
// app/api/webhooks/cli-progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-protection";
import { prisma } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const project = await requireApiKey(request);
    const body = await request.json();

    const { tasks, progress, issues } = body;

    // Update task statuses
    for (const taskUpdate of tasks) {
      await prisma.task.update({
        where: { cliTaskId: taskUpdate.id },
        data: {
          status: taskUpdate.status,
          cliStatus: taskUpdate.cliStatus,
          actualHours: taskUpdate.actualHours,
          completedAt: taskUpdate.completedAt
            ? new Date(taskUpdate.completedAt)
            : null,
        },
      });
    }

    // Log webhook
    await prisma.webhookLog.create({
      data: {
        url: "/api/webhooks/cli-progress",
        method: "POST",
        statusCode: 200,
        requestBody: body,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    await prisma.webhookLog.create({
      data: {
        url: "/api/webhooks/cli-progress",
        method: "POST",
        statusCode: 500,
        error: error instanceof Error ? error.message : "Unknown error",
        requestBody: await request.json().catch(() => null),
      },
    });

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
```

### **Agent API Endpoints**

```typescript
// app/api/agents/project-manager/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-protection";
import { ProjectManagerAgent } from "@/lib/agents/project-manager";

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth(request, NextResponse);
    if ("error" in session)
      return NextResponse.json(session.error, {
        status: session.error.statusCode,
      });

    const requirements = await request.json();
    const agent = new ProjectManagerAgent();

    const analysis = await agent.analyzeRequirements(requirements);

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
```

## 🎨 **UI Components & Design**

### **Dashboard Layout**

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### **Project Dashboard**

```tsx
// app/(dashboard)/projects/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TaskBoard } from "@/components/dashboard/task-board";
import { ProjectTimeline } from "@/components/dashboard/project-timeline";
import { AgentChat } from "@/components/agents/agent-chat";

export default function ProjectDashboard() {
  const params = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    // Load project data
    fetchProject(params.id);
  }, [params.id]);

  const fetchProject = async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}`);
    const data = await response.json();
    setProject(data.project);
    setTasks(data.tasks);
    setAgents(data.agents);
  };

  if (!project) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-gray-600 mt-2">{project.description}</p>
          <div className="flex gap-2 mt-4">
            <Badge
              variant={project.status === "ACTIVE" ? "default" : "secondary"}
            >
              {project.status}
            </Badge>
            <Badge variant="outline">{project.techStack?.join(", ")}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Progress</div>
          <div className="text-2xl font-bold">{project.progress}%</div>
          <Progress value={project.progress} className="w-32 mt-2" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Board */}
        <div className="lg:col-span-2">
          <TaskBoard tasks={tasks} onTaskUpdate={handleTaskUpdate} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectTimeline
                startDate={project.startDate}
                endDate={project.endDate}
                milestones={project.milestones}
              />
            </CardContent>
          </Card>

          {/* Agent Chat */}
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentChat
                projectId={project.id}
                agents={agents}
                onMessage={handleAgentMessage}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => exportToCLI(project)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export to MyContext CLI
              </button>
              <button
                onClick={() => generateReport(project)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Generate Report
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

### **Task Board Component**

```tsx
// components/dashboard/task-board.tsx
"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assignedTo?: { name: string };
  dueDate?: string;
}

interface TaskBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export function TaskBoard({ tasks, onTaskUpdate }: TaskBoardProps) {
  const [columns] = useState([
    { id: "TODO", title: "To Do", color: "bg-gray-100" },
    { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-100" },
    { id: "IN_REVIEW", title: "In Review", color: "bg-yellow-100" },
    { id: "COMPLETED", title: "Completed", color: "bg-green-100" },
  ]);

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    onTaskUpdate(draggableId, { status: newStatus });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className={`p-4 rounded-lg ${column.color}`}>
              <h3 className="font-semibold text-gray-800">
                {column.title} ({getTasksByStatus(column.id).length})
              </h3>
            </div>

            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 min-h-[200px]"
                >
                  {getTasksByStatus(column.id).map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                    >
                      {(provided) => (
                        <Card
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          ref={provided.innerRef}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm">
                                {task.title}
                              </h4>
                              <Badge
                                variant={
                                  task.priority === "CRITICAL"
                                    ? "destructive"
                                    : task.priority === "HIGH"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {task.priority}
                              </Badge>
                            </div>

                            {task.assignedTo && (
                              <div className="text-xs text-gray-500 mb-2">
                                Assigned to {task.assignedTo.name}
                              </div>
                            )}

                            {task.dueDate && (
                              <div className="text-xs text-gray-500">
                                Due{" "}
                                {new Date(task.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
```

## 🔄 **Real-time Features**

### **Socket.IO Integration**

```typescript
// lib/socket/server.ts
import { Server as NetServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIo = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

export const initSocket = (httpServer: NetServer) => {
  const io = new ServerIO(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXTAUTH_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join project room
    socket.on("join-project", (projectId: string) => {
      socket.join(`project-${projectId}`);
      console.log(`User ${socket.id} joined project ${projectId}`);
    });

    // Leave project room
    socket.on("leave-project", (projectId: string) => {
      socket.leave(`project-${projectId}`);
      console.log(`User ${socket.id} left project ${projectId}`);
    });

    // Task updates
    socket.on(
      "task-update",
      (data: { projectId: string; taskId: string; updates: any }) => {
        io.to(`project-${data.projectId}`).emit("task-updated", {
          taskId: data.taskId,
          updates: data.updates,
          timestamp: new Date(),
        });
      }
    );

    // Agent messages
    socket.on(
      "agent-message",
      (data: { projectId: string; agentId: string; message: string }) => {
        io.to(`project-${data.projectId}`).emit("agent-message-received", {
          agentId: data.agentId,
          message: data.message,
          timestamp: new Date(),
        });
      }
    );

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};
```

### **Real-time CLI Progress Monitoring**

```typescript
// lib/webhooks/cli-monitor.ts
import { prisma } from "@/lib/database";
import { initSocket } from "@/lib/socket/server";

export class CLIMonitor {
  private io: any;

  constructor(io: any) {
    this.io = io;
  }

  async processCLIUpdate(
    projectId: string,
    updates: {
      tasks: Array<{
        id: string;
        status: string;
        progress: number;
        message?: string;
      }>;
      overallProgress: number;
    }
  ) {
    // Update database
    for (const taskUpdate of updates.tasks) {
      await prisma.task.updateMany({
        where: {
          projectId,
          cliTaskId: taskUpdate.id,
        },
        data: {
          cliStatus: taskUpdate.status,
          updatedAt: new Date(),
        },
      });
    }

    // Broadcast real-time updates
    this.io.to(`project-${projectId}`).emit("cli-progress-update", {
      tasks: updates.tasks,
      overallProgress: updates.overallProgress,
      timestamp: new Date(),
    });

    // Check for blockers or issues
    await this.analyzeProgress(projectId, updates);
  }

  private async analyzeProgress(projectId: string, updates: any) {
    // Analyze for potential issues
    const issues = [];

    // Check for overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        projectId,
        dueDate: { lt: new Date() },
        status: { not: "COMPLETED" },
      },
    });

    if (overdueTasks.length > 0) {
      issues.push(`${overdueTasks.length} tasks are overdue`);
    }

    // Check for blocked tasks
    const blockedTasks = updates.tasks.filter(
      (t: any) =>
        t.message?.toLowerCase().includes("error") ||
        t.message?.toLowerCase().includes("failed")
    );

    if (blockedTasks.length > 0) {
      issues.push(`${blockedTasks.length} tasks appear to be blocked`);
    }

    if (issues.length > 0) {
      // Notify PM agent for intervention
      await this.notifyPMAgent(projectId, issues);
    }
  }

  private async notifyPMAgent(projectId: string, issues: string[]) {
    // Trigger PM agent analysis
    this.io.to(`project-${projectId}`).emit("pm-agent-alert", {
      type: "ISSUES_DETECTED",
      issues,
      timestamp: new Date(),
    });
  }
}
```

## 🚀 **Deployment & DevOps**

### **Environment Configuration**

```bash
# .env.local
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mycontext_pm"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# AI Integration
ANTHROPIC_API_KEY="sk-ant-api03-xxxx"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Webhooks
WEBHOOK_SECRET="your-webhook-secret"
```

### **Docker Configuration**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: mycontext_pm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mycontext_pm
      - NEXTAUTH_URL=http://localhost:3000
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - db

volumes:
  postgres_data:
```

### **Production Deployment**

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@anthropic-ai/sdk"],
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## 🧪 **Testing Strategy**

### **Unit Tests**

```typescript
// __tests__/agents/project-manager.test.ts
import { ProjectManagerAgent } from "@/lib/agents/project-manager";

describe("ProjectManagerAgent", () => {
  let agent: ProjectManagerAgent;

  beforeEach(() => {
    agent = new ProjectManagerAgent();
  });

  it("should analyze project requirements", async () => {
    const requirements = {
      description: "Build a task management app",
      techStack: ["Next.js", "TypeScript", "Tailwind"],
      timeline: {
        startDate: "2024-01-01",
        endDate: "2024-02-01",
      },
    };

    const result = await agent.analyzeRequirements(requirements);

    expect(result).toHaveProperty("epics");
    expect(Array.isArray(result.epics)).toBe(true);
    expect(result.epics.length).toBeGreaterThan(0);
  });
});
```

### **Integration Tests**

```typescript
// __tests__/api/projects.test.ts
import { createTestClient } from "@/lib/test-utils";

describe("/api/projects", () => {
  it("should create a new project", async () => {
    const client = createTestClient();
    const response = await client.post("/api/projects", {
      name: "Test Project",
      description: "A test project",
      techStack: ["Next.js"],
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty("id");
  });
});
```

## 📋 **Development Roadmap**

### **Phase 1: Core Foundation (Week 1-2) - COMPLETED**

- [x] Database schema design
- [x] Authentication setup
- [x] Basic project CRUD operations
- [x] Agent framework implementation

### **Phase 2: PM Core Features (Week 3-4) - COMPLETED**

- [x] Project breakdown and task creation
- [x] Agent orchestration and communication
- [x] Basic dashboard UI
- [x] CLI integration webhooks

### **Phase 3: Advanced Features (Week 5-6) - COMPLETED**

- [x] Real-time progress monitoring
- [x] AI-powered insights and recommendations
- [x] Advanced reporting and analytics
- [x] Team collaboration features

### **Phase 4: Production Polish (Week 7-8) - COMPLETED**

- [x] Performance optimization
- [x] Comprehensive testing
- [x] Security hardening
- [x] Documentation and deployment

### **Phase 5+: Optional PM Dashboard (Future/Optional)**

**Note**: The following features are documented for future implementation as an optional self-hosted PM dashboard. The core MyContext CLI works independently without requiring these features.

#### **PM Agent Implementation (Optional)**

- [ ] Multi-agent architecture with PM, PA, and Developer agents
- [ ] Requirement extraction system with schema validation
- [ ] PM agent for task decomposition, planning, and assignment logic
- [ ] MCP connectors for GitHub, project management tools, and communication platforms
- [ ] Real-time monitoring system with hourly checks and progress updates
- [ ] Audit system with approval workflows and human oversight

#### **Cloud-Hosted PM Option (Optional)**

- [ ] Team collaboration features
- [ ] Multi-tenant project management
- [ ] Advanced analytics and reporting
- [ ] Integration with external PM tools (Jira, Asana, Linear)

#### **Self-Hosted PM Dashboard (Optional)**

- [ ] Local deployment with Docker
- [ ] InstantDB + shadcn UI
- [ ] Real-time progress monitoring
- [ ] Team member management
- [ ] Project analytics and insights

## 🎯 **Success Metrics**

- **User Adoption**: Projects created per week
- **Task Completion**: Percentage of tasks completed on time
- **CLI Integration**: Successful webhook deliveries
- **Agent Performance**: Response time and accuracy
- **User Satisfaction**: Feature usage and feedback

---

**This technical specification documents the optional mycontext PM Next.js application for teams requiring advanced project oversight. The core MyContext CLI works independently, with PM UI as an optional enhancement. The modular architecture ensures scalability and maintainability while providing seamless integration with MyContext-generated applications.**
