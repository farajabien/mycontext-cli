# MyContext CLI Command Reference

## 📋 **Command Overview**

MyContext CLI provides a comprehensive set of commands for AI-powered development. All commands support `--help` for detailed usage information.

## 🏗️ **Project Management**

### **`mycontext init`**

Initialize a new MyContext project or configure an existing one.

```bash
# Create new project
mycontext init my-awesome-app

# Initialize in current directory
mycontext init . --yes

# With specific framework
mycontext init my-app --framework instantdb

# With description
mycontext init my-app --description "E-commerce platform"
```

**Options:**

- `--framework <instantdb|nextjs|other>` - Choose framework
- `--description <text>` - Project description
- `--force` - Overwrite existing files
- `--yes` - Skip interactive prompts

### **`mycontext analyze`**

Analyze existing project structure and generate insights.

```bash
# Analyze current project
mycontext analyze

# Analyze specific directory
mycontext analyze ./src

# Generate context files
mycontext analyze --generate-context

# Verbose output
mycontext analyze --verbose
```

**Options:**

- `--output <file>` - Save analysis to file
- `--generate-context` - Generate context files
- `--include-brand` - Include branding analysis
- `--include-types` - Include type analysis
- `--include-components` - Include component analysis
- `--verbose` - Detailed output

### **`mycontext status`**

Check project status and configuration.

```bash
# Check project status
mycontext status

# Detailed status
mycontext status --detailed

# Check health
mycontext status --check-health
```

**Options:**

- `--detailed` - Show detailed information
- `--check-health` - Run health checks

## 🎯 **Component Generation**

### **`mycontext generate`**

Generate various project artifacts using AI.

```bash
# Generate all context files
mycontext generate all

# Generate specific type
mycontext generate context
mycontext generate types
mycontext generate brand
mycontext generate components-list

# Generate with options
mycontext generate components --with-tests
mycontext generate components --complete-architecture
```

**Options:**

- `--type <context|types|brand|components-list|all>` - Generation type
- `--output <dir>` - Output directory
- `--force` - Overwrite existing files
- `--model <name>` - AI model to use
- `--verbose` - Detailed output

### **`mycontext generate components`**

Generate React components with AI.

```bash
# Generate all components
mycontext generate components

# Generate specific component
mycontext generate components Button

# Generate component group
mycontext generate components --group forms

# Generate with tests
mycontext generate components --with-tests

# Generate complete architecture
mycontext generate components --complete-architecture
```

**Options:**

- `--group <name>` - Generate specific group
- `--all` - Generate all components
- `--output <dir>` - Output directory
- `--template <name>` - Use template
- `--local` - Use local AI (no API key required)
- `--with-tests` - Generate unit tests
- `--update-preview` - Update preview
- `--final-canvas` - Run normalization
- `--open-preview` - Open preview in browser
- `--check` - Run lint/tsc/tests
- `--complete-architecture` - Generate full architecture
- `--server-actions` - Generate server actions
- `--routes` - Generate Next.js routes
- `--self-documenting` - Add comprehensive docs
- `--architecture-type <type>` - Architecture type

### **`mycontext generate context-files`**

Generate additional context files for better AI understanding.

```bash
# Generate all context files
mycontext generate context-files

# Generate specific file
mycontext generate context-files features
mycontext generate context-files user-flows
mycontext generate context-files edge-cases
mycontext generate context-files technical-specs
```

**Options:**

- `--description <text>` - Project description
- `--project-path <path>` - Project path
- `--verbose` - Detailed output
- `--force` - Overwrite existing files

## 🔧 **Enhancement & Refinement**

### **`mycontext enhance`**

Enhance existing components with AI.

```bash
# Enhance component
mycontext enhance Button --prompt "Add loading state"

# Enhance with options
mycontext enhance Button --prompt "Dark mode support" --verbose

# Interactive enhancement
mycontext enhance Button --interactive
```

**Options:**

- `--prompt <text>` - Enhancement description
- `--temperature <number>` - AI creativity (0-1)
- `--max-tokens <number>` - Maximum tokens
- `--verbose` - Detailed output
- `--debug` - Debug mode
- `--output <file>` - Output file
- `--interactive` - Interactive mode
- `--output-format <format>` - Output format
- `--show-changes` - Show detailed changes
- `--preserve-history` - Keep enhancement history

### **`mycontext refine`**

Refine components with advanced AI capabilities.

```bash
# Refine component
mycontext refine Button --prompt "Improve accessibility"

# Generate UI specification
mycontext refine spec Button --desc "Accessible button component"

# Refine with JSON input
mycontext refine spec Button --json-input '{"type":"button","props":{"variant":"primary"}}'
```

**Options:**

- `--prompt <text>` - Refinement description
- `--temperature <number>` - AI creativity
- `--max-tokens <number>` - Maximum tokens
- `--verbose` - Detailed output
- `--debug` - Debug mode
- `--output <file>` - Output file
- `--interactive` - Interactive mode
- `--output-format <format>` - Output format
- `--show-changes` - Show detailed changes
- `--preserve-history` - Keep refinement history
- `--rollback` - Rollback to previous version

### **`mycontext refine spec`**

Generate UI specifications for components.

```bash
# Generate spec from description
mycontext refine spec Button --desc "Primary action button"

# Generate spec from JSON
mycontext refine spec Button --json-input '{"type":"button","variant":"primary"}'

# Generate spec from file
mycontext refine spec Button --json-file ./button-spec.json

# Generate both compact and detailed
mycontext refine spec Button --output-format both
```

**Options:**

- `--desc <text>` - Component description
- `--json-input <json>` - JSON component description
- `--json-file <path>` - Path to JSON file
- `--output-format <compact|detailed|both>` - Output format
- `--template <name>` - Use template
- `--verbose` - Detailed output

## 🏗️ **Application Building**

### **`mycontext build-app`**

Build complete applications with AI.

```bash
# Build app with description
mycontext build-app "E-commerce platform with user authentication"

# Build with options
mycontext build-app "Dashboard app" --framework nextjs --with-tests

# Build existing project
mycontext build-app --existing
```

**Options:**

- `--output <dir>` - Output directory
- `--framework <name>` - Framework
- `--with-tests` - Include tests
- `--verbose` - Detailed output
- `--existing` - Work with existing project
- `--migrate` - Migrate existing project
- `--interactive` - Interactive mode
- `--skip-validation` - Skip validation
- `--max-retries <number>` - Maximum retries
- `--complete-architecture` - Generate complete architecture
- `--architecture-type <type>` - Architecture type
- `--server-actions` - Generate server actions
- `--routes` - Generate routes

### **`mycontext build-strategy`**

Generate build strategies and project plans.

```bash
# Get strategy recommendations
mycontext build-strategy recommend

# Generate build plan
mycontext build-strategy plan

# Generate task list
mycontext build-strategy tasks

# Compare strategies
mycontext build-strategy compare
```

**Options:**

- `--strategy-type <recommend|plan|tasks|compare>` - Strategy type
- `--specific-strategy <name>` - Specific strategy
- `--phase-number <number>` - Phase number
- `--user-preferences <json>` - User preferences

## 🗄️ **Database & Backend**

### **`mycontext setup-instantdb`**

Set up InstantDB integration.

```bash
# Set up InstantDB
mycontext setup-instantdb

# Set up with MCP
mycontext setup-instantdb --mcp

# Set up with auth
mycontext setup-instantdb --auth

# Set up with schema
mycontext setup-instantdb --schema
```

**Options:**

- `--mcp` - Enable MCP integration
- `--auth` - Set up authentication
- `--schema` - Generate schema
- `--components` - Generate components
- `--skip-auth` - Skip auth setup
- `--skip-schema` - Skip schema setup
- `--skip-components` - Skip components
- `--app-id <id>` - InstantDB app ID
- `--token <token>` - Admin token

### **`mycontext setup-database`**

Set up database integration.

```bash
# Set up database
mycontext setup-database

# Set up specific provider
mycontext setup-database --provider instantdb

# Set up with auth
mycontext setup-database --auth
```

**Options:**

- `--provider <instantdb|supabase|firebase>` - Database provider
- `--auth` - Set up authentication
- `--schema` - Generate schema
- `--components` - Generate components
- `--skip-auth` - Skip auth setup
- `--skip-schema` - Skip schema setup
- `--skip-components` - Skip components

### **`mycontext setup-mcp`**

Set up Model Context Protocol integration.

```bash
# Set up MCP
mycontext setup-mcp

# Set up with provider
mycontext setup-mcp --provider instantdb

# Set up with server
mycontext setup-mcp --server custom-server
```

**Options:**

- `--provider <instantdb|github|custom>` - MCP provider
- `--server <name>` - Server name
- `--token <token>` - Authentication token
- `--config <file>` - Config file
- `--install` - Install dependencies

## 🔧 **Development Tools**

### **`mycontext preview`**

Preview components and designs.

```bash
# Preview components
mycontext preview components

# Preview brand
mycontext preview brand

# Preview specific group
mycontext preview group forms

# Open in browser
mycontext preview components --open
```

**Options:**

- `--type <brand|components|group|generated>` - Preview type
- `--open` - Open in browser
- `--port <number>` - Port number

### **`mycontext list`**

List components, projects, and files.

```bash
# List components
mycontext list components

# List projects
mycontext list projects

# List files
mycontext list files

# List with format
mycontext list components --format json
```

**Options:**

- `--type <components|projects|files|all>` - List type
- `--format <table|json|simple>` - Output format
- `--group <name>` - Filter by group
- `--limit <number>` - Limit results
- `--local` - Local only

### **`mycontext validate`**

Validate project structure and components.

```bash
# Validate project
mycontext validate

# Validate specific file
mycontext validate Button.tsx

# Interactive validation
mycontext validate --interactive
```

**Options:**

- `--file <path>` - Validate specific file
- `--interactive` - Interactive mode

### **`mycontext health-check`**

Check project health and fix issues.

```bash
# Health check
mycontext health-check

# Fix issues
mycontext health-check --fix

# Generate report
mycontext health-check --report

# Auto-fix
mycontext health-check --auto-fix
```

**Options:**

- `--fix` - Fix issues
- `--report` - Generate report
- `--strict` - Strict mode
- `--output <file>` - Output file
- `--auto-fix` - Auto-fix issues

## 🔄 **Migration & Maintenance**

### **`mycontext migrate`**

Migrate existing projects to MyContext.

```bash
# Migrate all components
mycontext migrate --all

# Migrate specific component
mycontext migrate Button

# Migrate component group
mycontext migrate --group forms

# Migrate with options
mycontext migrate --all --include-actions --include-hooks
```

**Options:**

- `--component <name>` - Migrate specific component
- `--group <name>` - Migrate component group
- `--all` - Migrate all components
- `--include-actions` - Include server actions
- `--include-hooks` - Include custom hooks
- `--include-context` - Include context
- `--include-docs` - Include documentation
- `--verbose` - Detailed output

### **`mycontext promote`**

Promote components from development to production.

```bash
# Promote component
mycontext promote Button

# Promote group
mycontext promote --group forms

# Promote all
mycontext promote --all

# Promote with options
mycontext promote Button --keep-context --add-to-gitignore
```

**Options:**

- `--component <name>` - Promote specific component
- `--group <name>` - Promote component group
- `--all` - Promote all components
- `--keep-context` - Keep context files
- `--add-to-gitignore` - Add to .gitignore

### **`mycontext sanitize`**

Clean up and optimize project code.

```bash
# Sanitize project
mycontext sanitize

# Fix issues
mycontext sanitize --fix

# Check specific issues
mycontext sanitize --check-duplicates --check-unreachable
```

**Options:**

- `--fix` - Fix issues
- `--verbose` - Detailed output
- `--check-duplicates` - Check duplicates
- `--check-unreachable` - Check unreachable code
- `--check-redundancy` - Check redundancy
- `--check-unused` - Check unused code

## 🎯 **AI & Agent Management**

### **`mycontext agent-flow`**

Manage AI agent workflows.

```bash
# Run context generation flow
mycontext agent-flow context

# Run component generation flow
mycontext agent-flow components

# Run validation workflow
mycontext agent-flow validate
```

**Options:**

- `--mode <auto|sequential|validation>` - Workflow mode
- `--target <name>` - Target agent
- `--retry-limit <number>` - Retry limit
- `--quality-threshold <number>` - Quality threshold

### **`mycontext predict`**

Predict next steps and recommendations.

```bash
# Predict next steps
mycontext predict next

# Predict dependencies
mycontext predict dependencies

# Predict patterns
mycontext predict patterns

# Predict issues
mycontext predict issues
```

**Options:**

- `--type <next|dependencies|patterns|issues|optimization>` - Prediction type
- `--confidence <number>` - Confidence level
- `--context <text>` - Additional context
- `--verbose` - Detailed output

## 🔧 **Configuration & Setup**

### **`mycontext setup`**

Configure MyContext CLI and AI providers.

```bash
# Interactive setup
mycontext setup

# Local setup
mycontext setup --local

# Cloud setup
mycontext setup --cloud

# Force setup
mycontext setup --force
```

**Options:**

- `--local` - Local AI setup
- `--cloud` - Cloud AI setup
- `--force` - Force setup
- `--skip-prompts` - Skip prompts
- `--stack <name>` - Tech stack

### **`mycontext auth`**

Manage authentication and user accounts.

```bash
# Login
mycontext auth --login

# Logout
mycontext auth --logout

# Check status
mycontext auth --status

# Register
mycontext auth --register
```

**Options:**

- `--login` - Login to account
- `--logout` - Logout from account
- `--status` - Check auth status
- `--register` - Register new account

### **`mycontext update`**

Update MyContext CLI to latest version.

```bash
# Update CLI
mycontext update

# Check for updates
mycontext update --check
```

## 📚 **Documentation & Learning**

### **`mycontext playbooks`**

Manage development playbooks and templates.

```bash
# List playbooks
mycontext playbooks --list

# Add playbook
mycontext playbooks --add "E-commerce Setup"

# Search playbooks
mycontext playbooks --search "authentication"

# Use playbook
mycontext playbooks --use "instantdb-integration"
```

**Options:**

- `--add <name>` - Add playbook
- `--list` - List playbooks
- `--search <term>` - Search playbooks
- `--use <id>` - Use playbook
- `--remove <id>` - Remove playbook
- `--template <name>` - Use template
- `--category <name>` - Filter by category

### **`mycontext generate-todos`**

Generate development todos and tasks.

```bash
# Generate todos
mycontext generate-todos

# Generate with options
mycontext generate-todos --count 5 --focus "authentication"

# Generate with energy level
mycontext generate-todos --energy-level high --complexity moderate
```

**Options:**

- `--count <number>` - Number of todos
- `--focus <area>` - Focus area
- `--energy-level <low|medium|high>` - Energy level
- `--complexity <simple|moderate|complex>` - Complexity
- `--project-id <id>` - Project ID

## 🎯 **Utility Commands**

### **`mycontext compile-prd`**

Compile Product Requirements Document.

```bash
# Compile PRD
mycontext compile-prd

# Force compilation
mycontext compile-prd --force

# Verbose output
mycontext compile-prd --verbose
```

**Options:**

- `--project-path <path>` - Project path
- `--verbose` - Detailed output
- `--force` - Force compilation

## 🎯 **Global Options**

All commands support these global options:

- `--help` - Show help information
- `--version` - Show version
- `--verbose` - Detailed output
- `--debug` - Debug mode
- `--quiet` - Quiet mode
- `--no-color` - Disable colors

## 🎯 **Examples**

### **Complete Workflow**

```bash
# 1. Initialize project
mycontext init my-app --framework instantdb

# 2. Set up AI provider
mycontext setup

# 3. Generate context
mycontext generate context

# 4. Generate components
mycontext generate components --with-tests

# 5. Set up database
mycontext setup-instantdb --mcp

# 6. Build application
mycontext build-app --complete-architecture

# 7. Validate everything
mycontext validate

# 8. Health check
mycontext health-check
```

### **Component Enhancement**

```bash
# 1. Enhance component
mycontext enhance Button --prompt "Add loading state"

# 2. Generate UI spec
mycontext refine spec Button --desc "Button with loading state"

# 3. Validate changes
mycontext validate Button

# 4. Update documentation
mycontext docs Button
```

### **Project Migration**

```bash
# 1. Analyze existing project
mycontext analyze existing-project

# 2. Migrate components
mycontext migrate --all --include-actions

# 3. Generate missing components
mycontext generate components --all

# 4. Validate migration
mycontext validate --all
```

## 🎯 **Next Steps**

- **[AI Agent System](ai-agents.md)** - Learn about our specialized agents
- **[Configuration Guide](configuration.md)** - Advanced configuration options
- **[Examples](examples.md)** - Real-world usage patterns
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
