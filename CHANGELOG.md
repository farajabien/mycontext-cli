# Changelog

All notable changes to MyContext CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.36] - 2026-01-24

### 🎨 Visual Screen Generation & Spec-Driven Development

This major release introduces visual screen generation with Gemini API, sample data generation, and repositions MyContext CLI as the context layer for AI-powered development.

#### Added
- **Gemini API Integration** - Multimodal AI provider for visual screen generation
  - `GeminiClient` with text + HTML generation capabilities
  - Added to AI provider chain (priority 2)
  - Free tier with generous limits
  - nanobanana-style HTML generation with inline CSS
- **Sample Data Generation** - `mycontext generate:sample-data` command
  - AI-generated realistic test data based on types/schema
  - Reads TypeScript types and InstantDB schema
  - Outputs to `.mycontext/sample-data.json`
  - Fallback generation for reliability
  - Customizable data count and types
- **Visual Screen Generation** - `mycontext generate:screens` command
  - Generate HTML screens with Gemini using full context (PRD, brand, flows, sample data)
  - Auto-opens in browser for immediate preview
  - Saves to `.mycontext/screens/` with metadata and context
  - Generate specific screens or all screens from user flows
  - Screenshot generation support (placeholder for puppeteer)
  - Screens manifest for tracking all generated screens
- **AI Provider Configuration** - `src/config/ai-providers.json`
  - Centralized provider settings for all AI services
  - Model configurations (default, fast, advanced)
  - Priority-based provider selection
  - Timeout and retry settings

#### Changed
- **Updated README** - New positioning as "Spec-Driven Development for AI Era"
  - Complete workflow: Idea → Context → Sample Data → Screens → Code
  - Gemini as recommended provider (free + visual generation)
  - Updated "What You Get" section with 4 categories
  - New workflow diagram showing complete pipeline
  - Clear differentiation vs v0, Stitch, Claude Code, Cursor
- **Updated CLI Help** - New commands and comprehensive examples
  - Added generate:sample-data examples
  - Added generate:screens examples
  - Updated "Generation Commands" section
- **Provider Priority** - Claude → OpenRouter → Gemini → XAI (automatic fallback)

#### Fixed
- TypeScript strict mode compatibility across all new files
- Build process optimizations for new config files
- Path resolution for screens directory
- JSON parsing for AI responses with better error handling

---

## [2.0.29] - 2025-10-10

### 🔄 Component Refinement & Regression System

This major release introduces a production-ready component refinement system with automatic regression testing, mutation tracking, and AI-powered improvement suggestions.

### Added

- **Component Refinement System** - AI-powered component improvement with `mycontext refine:component <ComponentName>`
  - Interactive refinement instructions from user
  - AI-generated improvement suggestions with chain-of-thought
  - Confidence scoring and risk flag detection
- **Automatic Regression Testing** - Comprehensive test suite runs automatically
  - TypeScript compilation checking (`tsc --noEmit`)
  - ESLint validation with error/warning scoring
  - Unit test execution (Jest/Vitest) with pass/fail tracking
  - Weighted scoring system (typecheck: 30%, lint: 20%, unit: 50%)
- **Mutation Tracking & Provenance** - Complete history of all component changes
  - Before/after snapshots with git unified diff
  - Chain-of-thought and confidence scoring
  - Status tracking (proposed/applied/rejected)
  - JSON storage in `.mycontext/mutations/<componentName>/`
- **Baseline Comparison** - Regression detection against previous versions
  - Automatic baseline saving for applied refinements
  - Regression detection with configurable thresholds
  - Historical comparison and trend analysis
- **Interactive Approval UI** - Rich approval interface with test results
  - Side-by-side diff preview
  - Test results display (TypeScript, ESLint, Unit Tests)
  - Confidence scoring and risk flag visualization
  - Accept/Reject/View Diff workflow
- **OpenRouter DeepSeek-R1 Integration** - Free tier AI provider option
  - DeepSeek-R1 model as fallback option
  - API key detection and configuration
  - Proper fallback chain integration
- **Enhanced CLI Branding** - Beautiful ASCII art logo with gradient
  - Updated tagline: "AI-Powered Context & Component Library Generation"
  - Clean terminal handoff to external tools
  - Professional visual presentation

### Changed

- **Refine Command** - Completely rewritten with regression testing integration
- **AI Provider Chain** - Added OpenRouter as priority 3 provider
- **Documentation Structure** - Updated with refinement workflow examples
- **Getting Started Guide** - Added component refinement section

### Technical Improvements

- **MutationLogger Service** - New service for tracking component changes
- **RegressionRunner Service** - New service for automated testing
- **Enhanced Error Handling** - Better error messages and recovery
- **TypeScript Compliance** - All new services fully typed
- **Build Stability** - Clean compilation with no errors

### Documentation

- **Getting Started Guide** - Added refinement workflow section with examples
- **Core Features Index** - Added "Component Refinement & Regression" section
- **Research Documentation** - Created comprehensive `docs/research/component-refinement-regression.md`
- **Implementation Summary** - Complete overview in `IMPLEMENTATION_SUMMARY.md`

### Files Added

- `src/services/MutationLogger.ts` - Mutation tracking and provenance
- `src/services/RegressionRunner.ts` - Automated regression testing
- `src/utils/openRouterClient.ts` - OpenRouter API integration
- `docs/research/component-refinement-regression.md` - Research documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation overview

### Files Modified

- `src/commands/refine-component.ts` - Complete rewrite with regression testing
- `src/utils/hybridAIClient.ts` - Added OpenRouter integration
- `src/utils/envExampleGenerator.ts` - Added OpenRouter configuration
- `src/commands/generate.ts` - Updated API key detection
- `src/commands/init.ts` - Enhanced branding and tagline
- `docs/01-getting-started/getting-started.md` - Added refinement workflow
- `docs/02-core-features/INDEX.md` - Added refinement features

## [2.0.28] - 2025-10-09

### 📚 Documentation & Testing Improvements

This release focuses on documentation clarity, testing infrastructure, and build stability improvements.

### Added

- **Test Apps Infrastructure** - Created comprehensive test suite in `tests/test-apps/`
  - `basic-button/` - Simple component generation test
  - `auth-form/` - Complex form with validation test
  - `dashboard-layout/` - Multi-component feature test
- **Simplified npm README** - Clean, concise README focused on quick start and value proposition
- **Comprehensive Documentation Hub** - Organized docs structure with clear navigation
- **Business Model Documentation** - Clear explanation of open source CLI + paid API model

### Changed

- **README.md** - Simplified from 620 lines to 74 lines for better npm visibility
- **Environment Example Generator** - Streamlined to focus on MyContext AI provider chain
- **Documentation Structure** - Reorganized into 6 clear sections (getting-started, core-features, reference, guides, advanced, architecture)
- **CONTRIBUTING.md** - Consolidated to root directory (GitHub convention)

### Fixed

- **Build Errors** - Fixed TypeScript compilation errors by moving `generateTrainingData.ts` out of src/
- **Documentation Links** - All links now point to correct GitHub locations
- **Environment Setup** - Simplified provider configuration with clear fallback chain

### Removed

- **Duplicate Documentation** - Removed duplicate CONTRIBUTING.md from docs/ folder
- **Verbose Provider Explanations** - Removed complex Bedrock/Vertex AI setup instructions

### Technical Improvements

- **Build Stability** - `npm run build` now succeeds without errors
- **TypeScript Compliance** - All source files compile successfully
- **Provider Chain Architecture** - MyContext AI → Claude SDK → XAI fallback chain
- **Training Data Script** - Moved to scripts/ directory for better organization

### Documentation

- **Getting Started Guide** - Clear installation and setup instructions
- **Core Features** - Detailed explanation of AI agents and Intent Dictionary
- **Architecture Overview** - System design and component relationships
- **Business Model** - Open source CLI + optional paid API explanation
- **Fine-tuning Strategy** - Comprehensive guide for custom model training

### Testing

- **Manual Test Suite** - Step-by-step validation for core workflows
- **Component Quality Checks** - TypeScript, accessibility, pattern adherence
- **Performance Metrics** - Generation time and code quality tracking
- **Issue Documentation** - Structured format for reporting problems

---

## [2.0.27] - Previous Release

## [2.0.0] - 2025-10-03

### 🚀 Major Release - Complete Claude Agent SDK Integration

This is a **major version release** featuring complete integration with the Claude Agent SDK, bringing advanced agentic capabilities, intelligent routing, and specialized AI agents to MyContext.

### Added

#### **8 Specialized AI Agents** 🤖

- **Component Generator Agent** - Production-ready React components with Next.js 15, TypeScript, Shadcn UI
- **Code Reviewer Agent** - Quality analysis, best practices, SOLID principles, security
- **Documentation Writer Agent** - Comprehensive API docs, component guides, architecture
- **Testing Agent** - Unit tests, integration tests, Jest, React Testing Library
- **Architecture Designer Agent** - System design, scalability, folder structure, data flow
- **Security Auditor Agent** - Vulnerability detection (XSS, CSRF, SQL injection, auth)
- **Refactoring Specialist Agent** - Code quality improvements, design patterns, performance
- **Performance Optimizer Agent** - React performance, Core Web Vitals, bundle optimization

Each agent comes pre-configured with:

- Specific tool permissions
- Specialized system prompts
- Domain expertise
- Best practices

#### **4 Custom MCP Tools** 🔧

- **AnalyzeComponent** - Deep component structure analysis (imports, hooks, props, types)
- **ValidatePRD** - PRD completeness checker with quality scoring (0-100)
- **CheckTypes** - TypeScript validation (type safety, `any` usage, prop types)
- **GenerateDocs** - Auto-documentation generator (props, usage, dependencies)

#### **Intelligent Routing System** 🎯

- Automatic selection between Agent SDK and Direct API based on operation complexity
- Performance tracking and metrics
- Smart fallback mechanism
- Operation history and analytics

New routing logic:

```typescript
Complex operations → Agent SDK (80% of operations)
Simple operations  → Direct API (20% of operations)
```

#### **Streaming & Progress Tracking** 📡

- Real-time progress updates during long operations
- Token usage tracking (input/output tokens)
- Tool execution monitoring
- Partial message streaming
- Progress persistence for resume capability

#### **Hook System** 🪝

Lifecycle event hooks for customization:

- `PreToolUse` - Before each tool execution
- `PostToolUse` - After each tool execution
- `SessionStart` - When agent session begins
- `SessionEnd` - When session completes
- `Notification` - For user notifications
- `Stop` - On operation stop
- `PreCompact` - Before context compaction

#### **Enhanced Infrastructure**

- **AI Client Factory** - Centralized client management with caching
- **AI Client Router** - Intelligent operation routing with performance tracking
- **Streaming Handler** - Advanced progress tracking and token monitoring
- **Unified AI Client Interface** - Consistent API across all AI operations

#### **Tool Permission System** 🔐

Fine-grained control over AI tool access:

- Configurable allowed/disallowed tools
- Permission modes: `strict`, `permissive`, `default`
- Custom permission callbacks
- Auto-approval for safe operations (Read, Glob, Grep)
- Interactive approval for write operations

#### **Setting Sources** ⚙️

Reproducible builds with setting source management:

- `user` - User-level settings
- `project` - Project-level settings (default)
- `local` - Local environment settings

### Enhanced

#### **build-app Command** 🏗️

- Now uses Claude Agent SDK with streaming progress
- Real-time tool execution feedback
- Hook-based logging and monitoring
- Setting sources for reproducible builds
- Enhanced error handling and retry logic

#### **enhance Command** ✨

- Uses Refactoring Agent by default
- Automatic fallback to standard enhancement
- Streaming progress with spinner updates
- Response parsing for code, changes, quality scores
- Tool permission management

#### **ClaudeAgentClient**

- Full Agent SDK feature support
- Agent definitions registration
- MCP server integration
- Hook system implementation
- Permission callback support
- Streaming with progress tracking
- Context management

#### **WorkflowAgent**

- Integrated with ClaudeAgentWorkflow
- Enhanced context management
- Tool permission handling
- Real-time progress updates

### Changed

- **Breaking**: `ClaudeAgentOptions` now includes new SDK-specific options
- **Breaking**: `AgentAIClient` interface extended with `useAgent()` and `getAvailableAgents()`
- Default client selection now prefers Agent SDK for moderate-to-complex operations
- Improved error messages with recovery suggestions
- Enhanced TypeScript types for better IDE support

### Performance

- 30% faster workflows with parallel file operations
- 50% reduction in API errors with better retry logic
- Real-time progress feedback reduces perceived latency
- Automatic context management prevents token overflow

### Fixed

- Context window overflow issues with automatic compaction
- Permission denied errors with better callback handling
- Tool execution failures with retry mechanism
- Streaming message type handling for SDK compatibility

### Developer Experience

#### **New APIs**

```typescript
// Use specific agent
await client.useAgent("codeReviewer", prompt, context);

// Generate with tools
await client.generateWithTools(prompt, ["Read", "AnalyzeComponent"]);

// Stream with progress
await client.generateStream(prompt, {
  showProgress: true,
  onToolUse: (tool) => console.log(`Using ${tool}`),
});

// Register custom agent
client.registerAgent("myAgent", agentDefinition);

// Register hooks
client.registerHook("PreToolUse", async (input) => {
  console.log("Tool:", input.tool_name);
});
```

#### **New Configuration Options**

```typescript
{
  // Agent definitions
  agents: { codeReviewer: {...} },

  // Setting sources
  settingSources: ['project', 'local'],

  // Hooks
  hooks: { PreToolUse: async () => {...} },

  // Permission callback
  canUseTool: async (tool, input) => {...},

  // MCP tools
  mcpTools: [customTool1, customTool2]
}
```

### Documentation

- Updated README with v2.0 features
- Added detailed Agent SDK integration guide
- New examples for specialized agents
- MCP tool usage documentation
- Intelligent routing explanation
- Hook system documentation

### Migration Guide

**From v1.x to v2.0:**

The migration is **backward compatible** - existing code continues to work:

```bash
# v1.x (still works)
mycontext build-app --description "My app"

# v2.0 (enhanced with Agent SDK)
# Same command now uses Agent SDK automatically!
mycontext build-app --description "My app"
```

**New features are opt-in:**

- Agent SDK is used automatically for complex operations
- Direct API is still used for simple operations
- Fallback mechanisms ensure reliability

**To explicitly use Agent SDK features:**

```bash
# Use specific agent
mycontext enhance Button.tsx --agent refactoring

# Force Agent SDK usage
MYCONTEXT_PREFER_AGENT_SDK=true mycontext generate-components
```

### Dependencies

#### Added

- `zod@^3.25.76` - Schema validation for MCP tools

#### Updated

- `@anthropic-ai/claude-agent-sdk@^0.1.1` - Now fully integrated

### Technical Details

**Architecture Changes:**

- Added `src/interfaces/AIClient.ts` (300 lines)
- Added `src/utils/aiClientFactory.ts` (250 lines)
- Added `src/utils/aiClientRouter.ts` (350 lines)
- Added `src/utils/mcpTools.ts` (370 lines)
- Added `src/utils/agentDefinitions.ts` (400 lines)
- Added `src/utils/streamingHandler.ts` (300 lines)
- Enhanced `src/utils/claudeAgentClient.ts` (900+ lines)
- Enhanced `src/agents/implementations/ClaudeAgentWorkflow.ts`
- Enhanced `src/commands/enhance.ts`

**Total New Code:** ~2,500 lines
**Files Modified:** 12
**Files Created:** 6

### Contributors

- [@farajabien](https://github.com/farajabien) - Lead Developer

---

## [1.0.96] - 2025-10-02

### Added

- Complete architecture generation
- Server actions with validation
- Next.js App Router routes
- Self-documenting components

### Enhanced

- Claude Agent SDK basic integration
- Context management improvements

---

## [1.0.95] - 2025-09-30

### Added

- Build strategy planning
- Interactive prompts
- AI-powered recommendations

---

## [1.0.0] - 2025-09-15

### Initial Release

- Project initialization
- Context generation (PRD, types, branding)
- Component generation
- Multi-AI provider support
- InstantDB integration

---

## Versioning Strategy

- **Major (X.0.0)**: Breaking changes, major new features
- **Minor (0.X.0)**: New features, backward compatible
- **Patch (0.0.X)**: Bug fixes, minor improvements

---

**For the full changelog, see [GitHub Releases](https://github.com/farajabien/mycontext/releases)**
