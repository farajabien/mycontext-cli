# mycontext-cli

**The Command-Line Anchor for Zero-Drift Autonomous Development.**

`mycontext-cli` is your AI-powered development companion that transforms screenshots into specs, generates production-ready code, and keeps your implementation perfectly aligned with design intent.

## ✨ Key Features

🎯 **Screenshot → Spec** - Reverse-engineer any UI into comprehensive specifications.
🧠 **Living Brain (Shared State)** - A single source of truth (`context.json`) that acts as the "blackboard" for all agents.
🤖 **Context-Aware Co-Pilot** - Agents that *read* your code before writing, ensuring non-destructive updates.
🛡️ **Zero-Drift Sync** - Perfect alignment between design intent, code, and documentation via the `.ALIGN` guard.
🚀 **Instant Setup** - Initialize Next.js projects with `shadcn/ui`, `lucide-react`, and standard error/loading states.

## 🤖 Scalable Agent Teams Architecture

MyContext implements **Antigravity ("Shared State")** architecture. Instead of fragile, direct message-passing between agents (which breaks at scale), we use a **Living Brain** (`context.json`) as a persistent state machine.

- **The "Notebook" Pattern**: Agents (Architect, Engineer, QA) coordinate by reading and writing to the Living Brain.
- **Context-Aware**: The CLI reads your existing components before modifying them, preventing "amnesiac" overwrites.
- **Infinite Scalability**: Add as many specialized agents as needed; they all sync through the single source of truth.

---

## 🚀 Installation

```bash
# Install globally
npm install -g mycontext-cli

# Or use without installation
npx mycontext-cli init
```

---

## 🛠️ Commands Reference

### `mycontext init`
Initialize a new project with the MyContext ecosystem.

```bash
mycontext init

# Skip prompts (use defaults)
mycontext init --yes
```

**What it does:**
- Creates `.mycontext/` directory structure
- Generates initial `design-manifest.json`
- Sets up shadcn/ui components
- Optional InstantDB initialization
- Installs required dependencies

---

### `mycontext analyze <screenshot>`
Analyze a screenshot and generate comprehensive specifications.

```bash
mycontext analyze path/to/screenshot.png

# Output to specific file
mycontext analyze screenshot.png --output .mycontext/screen-spec.json
```

**What it does:**
- Uses Gemini 2.0 Flash vision model
- Extracts UI components, layout, and design tokens
- Generates detailed specifications
- Updates design manifest

---

### `mycontext generate`
Generate context files, components, or code from your specifications.

```bash
# Generate full context for AI coding assistants
mycontext generate context --full

# Generate specific components
mycontext generate components

# Generate Next.js routes from specs
mycontext generate screens

# Generate sample data
mycontext generate sample-data
```

**Context files include:**
- Project overview and architecture
- Design tokens and component hierarchy
- Data models and API specifications
- Current implementation status

---

### `mycontext status`
Check narrative compliance - analyze drift between spec and implementation.

```bash
mycontext status

# Detailed report
mycontext status --verbose
```

**What it checks:**
- Design manifest integrity
- Component implementation status
- Missing dependencies
- Configuration issues

---

### `mycontext agent`
Autonomous development agent for feature implementation.

```bash
# Generate implementation plan
mycontext agent --plan "Add user authentication"

# Execute autonomous code generation
mycontext agent --execute "Implement shopping cart"
```

**Features:**
- Multi-agent orchestration (Architect, CodeGen, QA, Security)
- Deterministic prompt construction
- Context-aware code generation
- Built-in testing and validation

---

## 🎯 Quick Start Example

```bash
# 1. Create a new Next.js project
npx create-next-app my-app
cd my-app

# 2. Initialize MyContext
npx mycontext-cli init

# 3. Configure AI provider (choose one)
# GitHub Models (Free, High Quality)
echo 'GITHUB_TOKEN=your-token' >> .mycontext/.env

# Or Gemini (Free tier + Vision)
echo 'GEMINI_API_KEY=your-key' >> .mycontext/.env

# 4. Analyze a design screenshot
mycontext analyze designs/homepage.png

# 5. Generate full context for AI assistants
mycontext generate context --full

# 6. Use autonomous agent for feature development
mycontext agent --plan "Add dark mode toggle"
```

---

## 🔧 Configuration

### AI Provider Setup

MyContext supports multiple AI providers. Configure in `.mycontext/.env`:

**GitHub Models** (Recommended - Free & High Quality)
```bash
GITHUB_TOKEN=ghp_your_token_here
# Get token: https://github.com/settings/tokens
```

**Gemini** (Free Tier + Vision for screenshots)
```bash
GEMINI_API_KEY=your_gemini_key
# Get key: https://aistudio.google.com/apikey
```

**Claude** (Best for advanced reasoning)
```bash
ANTHROPIC_API_KEY=your_claude_key
# Get key: https://console.anthropic.com/
```

**OpenAI**
```bash
OPENAI_API_KEY=your_openai_key
```

---

## 📁 Project Structure

After running `mycontext init`, your project will have:

```
.mycontext/
├── .env                      # AI provider configuration
├── context.json              # Living Brain - primary source of truth (JSON)
├── ALIGN                     # Alignment Guard - Instructions for AI assistants
├── context/                  # Exported Markdown views for humans/AI
│   ├── 01-prd.md
│   ├── 01a-features.md
│   └── ...
└── logs/                     # Operation logs
```

---

## 🎯 The Philosophy: Hard Gravity

Every project starts with a **deterministic spec**. The CLI ensures that code never drifts from its design intent, providing a "Hard Gravity" anchor that keeps the project cohesive even as it scales beyond human capacity to track every detail.

**Zero-Drift Development:**
1. **Screenshot → Spec** - AI vision extracts design intent
2. **Spec → Code** - Agents generate implementation
3. **Code → Validation** - Continuous narrative compliance checks
4. **Never Drift** - Living DB maintains alignment

---

## 🤝 Contributing

This package is part of the [MyContext Monorepo](https://github.com/farajabien/mycontext-cli).

For local development:
```bash
git clone https://github.com/farajabien/mycontext-cli.git
cd mycontext-cli
pnpm install
pnpm run build
cd apps/cli && pnpm link --global
```

---

## 📄 License

MIT © MyContext - See [LICENSE](https://github.com/farajabien/mycontext-cli/blob/main/LICENSE) for details.

---

## 🔗 Links

- [Documentation](https://github.com/farajabien/mycontext-cli#readme)
- [Report Issues](https://github.com/farajabien/mycontext-cli/issues)
- [npm Package](https://www.npmjs.com/package/mycontext-cli)
- [Core Package (@myycontext/core)](https://www.npmjs.com/package/@myycontext/core)
