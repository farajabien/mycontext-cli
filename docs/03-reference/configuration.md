# Configuration Guide

## ⚙️ **Overview**

MyContext CLI provides extensive configuration options to customize your development experience. This guide covers all configuration aspects from basic setup to advanced customization.

## 🔑 **AI Provider Configuration**

### **Claude (Recommended)**

Claude provides the best balance of quality, speed, and cost for MyContext CLI.

#### **Setup**

```bash
# Get API key from: https://console.anthropic.com/
export CLAUDE_API_KEY="sk-ant-..."

# Verify connection
mycontext status
```

#### **Configuration Options**

```bash
# Set model preference
export CLAUDE_MODEL="claude-3-sonnet-20240229"

# Set temperature (creativity level)
export CLAUDE_TEMPERATURE="0.7"

# Set max tokens
export CLAUDE_MAX_TOKENS="4000"
```

#### **Model Options**

- `claude-3-opus-20240229` - Most capable, slower, higher cost
- `claude-3-sonnet-20240229` - Balanced performance (recommended)
- `claude-3-haiku-20240307` - Fastest, lower cost, good for simple tasks

### **OpenAI**

OpenAI provides excellent performance with GPT-4 and GPT-3.5 models.

#### **Setup**

```bash
# Get API key from: https://platform.openai.com/
export OPENAI_API_KEY="sk-..."

# Verify connection
mycontext status
```

#### **Configuration Options**

```bash
# Set model preference
export OPENAI_MODEL="gpt-4"

# Set temperature
export OPENAI_TEMPERATURE="0.7"

# Set max tokens
export OPENAI_MAX_TOKENS="4000"
```

#### **Model Options**

- `gpt-4` - Most capable, higher cost
- `gpt-4-turbo` - Faster GPT-4 variant
- `gpt-3.5-turbo` - Good performance, lower cost

### **Local Development (Ollama)**

Ollama allows offline development with local AI models.

#### **Setup**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull Claude model
ollama pull claude-3-sonnet

# Configure MyContext
mycontext setup --local
```

#### **Configuration Options**

```bash
# Set Ollama URL
export OLLAMA_URL="http://localhost:11434"

# Set model
export OLLAMA_MODEL="claude-3-sonnet"

# Set temperature
export OLLAMA_TEMPERATURE="0.7"
```

### **Other Providers**

MyContext CLI supports additional AI providers:

#### **Qwen (Alibaba Cloud)**

```bash
export QWEN_API_KEY="your-qwen-key"
export QWEN_MODEL="qwen-turbo"
```

#### **Gemini (Google)**

```bash
export GEMINI_API_KEY="your-gemini-key"
export GEMINI_MODEL="gemini-pro"
```

#### **X.AI (Grok)**

```bash
export XAI_API_KEY="your-xai-key"
export XAI_MODEL="grok-beta"
```

## 🏗️ **Project Configuration**

### **Framework Selection**

Choose your preferred frontend framework:

#### **InstantDB (Recommended)**

```bash
# Initialize with InstantDB
mycontext init my-app --framework instantdb

# Features:
# - Real-time database
# - MCP integration
# - Built-in authentication
# - File storage
# - Schema management
```

#### **Next.js**

```bash
# Initialize with Next.js
mycontext init my-app --framework nextjs

# Features:
# - App Router
# - Server Components
# - API Routes
# - Static generation
```

#### **Other**

```bash
# Initialize with other framework
mycontext init my-app --framework other

# Manual setup required
```

### **UI Library Configuration**

#### **shadcn/ui (Recommended)**

```bash
# Set up shadcn/ui
mycontext setup --with-shadcn

# Or configure manually
pnpm dlx shadcn@latest init
```

#### **Configuration Options**

```bash
# Set component path
export SHADCN_COMPONENTS_PATH="components/ui"

# Set utils path
export SHADCN_UTILS_PATH="lib/utils"

# Set CSS variables
export SHADCN_CSS_VARIABLES="true"
```

### **Styling Configuration**

#### **Tailwind CSS**

```bash
# Configure Tailwind
export TAILWIND_CONFIG_PATH="tailwind.config.js"

# Set design tokens
export TAILWIND_DESIGN_TOKENS="true"
```

#### **CSS Modules**

```bash
# Enable CSS modules
export CSS_MODULES="true"

# Set module path
export CSS_MODULES_PATH="styles"
```

## 🗄️ **Database Configuration**

### **InstantDB Setup**

```bash
# Set up InstantDB
mycontext setup-instantdb

# Configuration options
mycontext setup-instantdb --mcp --auth --schema
```

#### **Environment Variables**

```bash
# InstantDB App ID
export INSTANTDB_APP_ID="your-app-id"

# Admin token (for MCP)
export INSTANTDB_ADMIN_TOKEN="your-admin-token"

# Database URL
export INSTANTDB_URL="https://your-app.instantdb.com"
```

### **Other Database Providers**

#### **Supabase**

```bash
# Set up Supabase
mycontext setup-database --provider supabase

# Environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-supabase-key"
```

#### **Firebase**

```bash
# Set up Firebase
mycontext setup-database --provider firebase

# Environment variables
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_API_KEY="your-api-key"
```

## 🔧 **Development Tools Configuration**

### **Testing Configuration**

#### **Jest Setup**

```bash
# Configure Jest
export JEST_CONFIG_PATH="jest.config.js"

# Set test environment
export JEST_ENVIRONMENT="jsdom"
```

#### **Testing Library**

```bash
# Configure Testing Library
export TESTING_LIBRARY_SETUP="true"

# Set test utilities path
export TESTING_LIBRARY_UTILS_PATH="test-utils"
```

### **Linting Configuration**

#### **ESLint**

```bash
# Configure ESLint
export ESLINT_CONFIG_PATH=".eslintrc.js"

# Set rules
export ESLINT_RULES="strict"
```

#### **Prettier**

```bash
# Configure Prettier
export PRETTIER_CONFIG_PATH=".prettierrc"

# Set format on save
export PRETTIER_FORMAT_ON_SAVE="true"
```

### **TypeScript Configuration**

#### **TypeScript Setup**

```bash
# Configure TypeScript
export TYPESCRIPT_CONFIG_PATH="tsconfig.json"

# Set strict mode
export TYPESCRIPT_STRICT="true"
```

## 🎯 **Agent Configuration**

### **Agent Selection**

Configure which agents to use for different tasks:

```bash
# Set default agents
export MYCONTEXT_DEFAULT_AGENTS="CodeGenSubAgent,EnhancementAgent,QASubAgent"

# Set agent preferences
export MYCONTEXT_AGENT_PREFERENCES='{
  "component-generation": "CodeGenSubAgent",
  "enhancement": "EnhancementAgent",
  "validation": "QASubAgent"
}'
```

### **Agent Behavior**

Customize agent behavior:

```bash
# Set agent temperature
export MYCONTEXT_AGENT_TEMPERATURE="0.7"

# Set max tokens
export MYCONTEXT_AGENT_MAX_TOKENS="4000"

# Set retry attempts
export MYCONTEXT_AGENT_RETRIES="3"
```

### **Agent Communication**

Configure agent communication patterns:

```bash
# Set communication pattern
export MYCONTEXT_COMMUNICATION_PATTERN="sequential"

# Set quality threshold
export MYCONTEXT_QUALITY_THRESHOLD="85"

# Set timeout
export MYCONTEXT_AGENT_TIMEOUT="30000"
```

## 🔒 **Security Configuration**

### **API Key Management**

Secure your API keys:

```bash
# Use environment variables
export CLAUDE_API_KEY="sk-ant-..."

# Or use keychain (macOS)
security add-generic-password -a "mycontext" -s "claude-api-key" -w "your-key"

# Or use credential manager (Windows)
cmdkey /add:mycontext-claude /user:mycontext /pass:your-key
```

### **Permission Management**

Configure tool permissions:

```bash
# Set permission mode
export MYCONTEXT_PERMISSION_MODE="strict"

# Allow specific tools
export MYCONTEXT_ALLOWED_TOOLS="file-read,file-write,component-generate"

# Block specific tools
export MYCONTEXT_BLOCKED_TOOLS="system-exec,network-request"
```

### **Audit Logging**

Enable audit logging:

```bash
# Enable audit logs
export MYCONTEXT_AUDIT_LOGS="true"

# Set log level
export MYCONTEXT_LOG_LEVEL="info"

# Set log path
export MYCONTEXT_LOG_PATH="./logs"
```

## 🌐 **Network Configuration**

### **Proxy Settings**

Configure proxy for API requests:

```bash
# Set HTTP proxy
export HTTP_PROXY="http://proxy.company.com:8080"

# Set HTTPS proxy
export HTTPS_PROXY="https://proxy.company.com:8080"

# Set no proxy
export NO_PROXY="localhost,127.0.0.1"
```

### **Rate Limiting**

Configure rate limiting:

```bash
# Set rate limit
export MYCONTEXT_RATE_LIMIT="100"

# Set rate limit window
export MYCONTEXT_RATE_LIMIT_WINDOW="3600"

# Set burst limit
export MYCONTEXT_BURST_LIMIT="10"
```

## 📁 **File System Configuration**

### **Project Structure**

Customize project structure:

```bash
# Set components path
export MYCONTEXT_COMPONENTS_PATH="src/components"

# Set pages path
export MYCONTEXT_PAGES_PATH="src/pages"

# Set utils path
export MYCONTEXT_UTILS_PATH="src/utils"
```

### **File Naming**

Configure file naming conventions:

```bash
# Set naming convention
export MYCONTEXT_NAMING_CONVENTION="kebab-case"

# Set file extensions
export MYCONTEXT_FILE_EXTENSIONS="tsx,ts,jsx,js"

# Set index files
export MYCONTEXT_INDEX_FILES="true"
```

## 🎯 **Performance Configuration**

### **Caching**

Configure caching behavior:

```bash
# Enable caching
export MYCONTEXT_CACHE_ENABLED="true"

# Set cache directory
export MYCONTEXT_CACHE_DIR="./.mycontext/cache"

# Set cache TTL
export MYCONTEXT_CACHE_TTL="3600"
```

### **Parallel Processing**

Configure parallel processing:

```bash
# Set max parallel tasks
export MYCONTEXT_MAX_PARALLEL="4"

# Set task timeout
export MYCONTEXT_TASK_TIMEOUT="30000"

# Set retry attempts
export MYCONTEXT_TASK_RETRIES="3"
```

## 🔧 **Advanced Configuration**

### **Custom Prompts**

Customize AI prompts:

```bash
# Set custom system prompt
export MYCONTEXT_CUSTOM_SYSTEM_PROMPT="You are an expert React developer..."

# Set custom user prompt template
export MYCONTEXT_CUSTOM_USER_PROMPT="Generate a {component} component with {features}"

# Set prompt variables
export MYCONTEXT_PROMPT_VARIABLES='{
  "company": "MyCompany",
  "style": "modern",
  "framework": "nextjs"
}'
```

### **Custom Templates**

Configure custom templates:

```bash
# Set template directory
export MYCONTEXT_TEMPLATE_DIR="./templates"

# Set template variables
export MYCONTEXT_TEMPLATE_VARIABLES='{
  "author": "Your Name",
  "license": "MIT",
  "version": "1.0.0"
}'
```

### **Custom Validators**

Configure custom validation rules:

```bash
# Set custom validators
export MYCONTEXT_CUSTOM_VALIDATORS='[
  "custom-accessibility-validator",
  "custom-performance-validator",
  "custom-security-validator"
]'

# Set validation rules
export MYCONTEXT_VALIDATION_RULES='{
  "accessibility": "strict",
  "performance": "moderate",
  "security": "strict"
}'
```

## 📋 **Configuration Files**

### **Environment File (.env)**

Create a `.env` file in your project root:

```bash
# AI Provider Configuration
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Model Configuration
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_TEMPERATURE=0.7
CLAUDE_MAX_TOKENS=4000

# Project Configuration
MYCONTEXT_FRAMEWORK=instantdb
MYCONTEXT_COMPONENTS_PATH=src/components
MYCONTEXT_UI_LIBRARY=shadcn

# Database Configuration
INSTANTDB_APP_ID=your-app-id
INSTANTDB_ADMIN_TOKEN=your-admin-token

# Development Configuration
MYCONTEXT_AGENT_TEMPERATURE=0.7
MYCONTEXT_QUALITY_THRESHOLD=85
MYCONTEXT_CACHE_ENABLED=true
```

### **MyContext Config (.mycontext/config.json)**

```json
{
  "version": "2.0.10",
  "framework": "instantdb",
  "uiLibrary": "shadcn",
  "componentsPath": "src/components",
  "agents": {
    "default": ["CodeGenSubAgent", "EnhancementAgent", "QASubAgent"],
    "temperature": 0.7,
    "maxTokens": 4000,
    "retries": 3
  },
  "validation": {
    "accessibility": "strict",
    "performance": "moderate",
    "security": "strict"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "directory": "./.mycontext/cache"
  }
}
```

## 🎯 **Configuration Validation**

### **Check Configuration**

```bash
# Validate configuration
mycontext config validate

# Check specific settings
mycontext config check --ai-provider
mycontext config check --database
mycontext config check --agents
```

### **Configuration Issues**

```bash
# Fix configuration issues
mycontext config fix

# Reset to defaults
mycontext config reset

# Export configuration
mycontext config export
```

## 🎯 **Best Practices**

### **1. Use Environment Variables**

- Store sensitive data in environment variables
- Use `.env` files for local development
- Never commit API keys to version control

### **2. Version Control Configuration**

- Commit `.mycontext/config.json` to version control
- Use `.env.example` for environment variable templates
- Document configuration changes in commit messages

### **3. Test Configuration**

- Test configuration changes in development first
- Use `mycontext config validate` to check settings
- Monitor performance after configuration changes

### **4. Security First**

- Use least privilege principle for permissions
- Enable audit logging for production environments
- Regularly rotate API keys

## 🎯 **Troubleshooting**

### **Configuration Issues**

```bash
# Check configuration status
mycontext status

# Validate configuration
mycontext config validate

# Reset configuration
mycontext config reset
```

### **API Key Issues**

```bash
# Check API key
echo $CLAUDE_API_KEY

# Test API connection
mycontext status --check-health

# Reconfigure API key
mycontext setup
```

### **Agent Issues**

```bash
# Check agent status
mycontext agent-flow status

# Reset agent configuration
mycontext agent-flow reset

# Configure agent preferences
mycontext agent-flow configure
```

## 🎯 **Next Steps**

- **[Command Reference](commands.md)** - Learn how to use configuration in commands
- **[Examples](examples.md)** - See configuration in action
- **[Troubleshooting](troubleshooting.md)** - Resolve configuration issues
- **[Advanced Usage](advanced.md)** - Master advanced configuration techniques





