# Flow Testing MCP Server

**AI-Powered UI Flow Testing for Web Applications**

The Flow Testing MCP Server provides autonomous browser-based testing using AI to navigate and validate UI flows. It can be used as a standalone MCP server or through the MyContext CLI.

## 🎯 What is it?

A Model Context Protocol (MCP) server that:
- ✅ Creates test missions from natural language descriptions
- ✅ Autonomously navigates web UIs using AI + Playwright
- ✅ Validates flows and generates detailed reports
- ✅ Integrates with MyContext user flows
- ✅ Works with any AI coding assistant (Claude Code, Cursor, etc.)

## 📦 Installation

### As part of MyContext CLI

```bash
# Already included if you have MyContext CLI installed
npm install -g mycontext-cli

# Or in your project
pnpm add mycontext-cli
```

### Standalone (Coming Soon)

```bash
npm install -g @mycontext/mcp-testing
```

## 🚀 Quick Start

### 1. Using MyContext CLI

#### Create a Test Mission

```bash
# Interactive creation
mycontext test:init

# From natural language
mycontext test "User should be able to login with valid credentials"

# Import from user flows
mycontext test:init --from-user-flows
```

#### Run Tests

```bash
# Run a specific test
mycontext test:run login-flow

# Run with options
mycontext test:run login-flow --url http://localhost:3000 --headless=false

# Run all tests
mycontext test:all

# List available tests
mycontext test:list
```

#### View Reports

```bash
# Show last report
mycontext test:report <execution-id>

# Verbose report with screenshots
mycontext test:report <execution-id> --verbose
```

### 2. Using as MCP Server

#### Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flow-testing": {
      "command": "node",
      "args": [
        "/path/to/mycontext-cli/dist/mcp/testing-server.js"
      ],
      "cwd": "/path/to/your/project"
    }
  }
}
```

#### Use from Claude Code

```typescript
// Create a test mission
await mcp.create_test_mission({
  name: "login-flow",
  mission: "User should be able to login with email and password",
  expectedOutcome: "User is redirected to dashboard after successful login",
  startUrl: "http://localhost:3000/login",
  validationRules: [
    {
      type: "url-match",
      description: "User is on dashboard",
      expectedValue: "/dashboard"
    },
    {
      type: "element-visible",
      description: "User profile is visible",
      selector: "[data-testid='user-profile']"
    }
  ]
});

// Run the test
await mcp.run_test({
  missionId: "login-flow",
  headless: false,
  baseUrl: "http://localhost:3000"
});

// Get the report
await mcp.get_test_report({
  executionId: "<execution-id>"
});
```

## 🎨 Features

### Natural Language Test Creation

Describe what you want to test in plain English:

```bash
mycontext test "User should be able to:
1. Navigate to the products page
2. Search for 'laptop'
3. Add the first result to cart
4. Proceed to checkout"
```

The AI will:
- Navigate the UI autonomously
- Make intelligent decisions about what to click/fill
- Validate the flow completed successfully
- Generate a detailed report

### Smart Element Detection

The AI uses multiple strategies to find elements:
- Text content
- ARIA labels
- Role attributes
- CSS selectors
- Partial text matching

### Validation Rules

Specify exactly what to check:

```typescript
validationRules: [
  {
    type: "url-match",
    description: "User is on checkout page",
    expectedValue: "/checkout"
  },
  {
    type: "element-exists",
    description: "Cart contains item",
    selector: ".cart-item"
  },
  {
    type: "text-contains",
    description: "Page shows total price",
    expectedValue: "Total: $"
  }
]
```

### Integration with MyContext

Automatically generate tests from your existing user flows:

```bash
# Reads .mycontext/02-user-flows.md
mycontext test:init --from-user-flows
```

This creates a test mission for each flow in your documentation.

## 📋 MCP Protocol Tools

### `create_test_mission`

Create a new test mission.

**Input**:
```json
{
  "name": "string",
  "mission": "string",
  "expectedOutcome": "string",
  "validationRules": [optional array],
  "startUrl": "string [optional]"
}
```

**Output**: Mission ID and details

### `run_test`

Execute a test mission.

**Input**:
```json
{
  "missionId": "string",
  "headless": "boolean [default: true]",
  "baseUrl": "string [optional]",
  "slowMo": "number [optional]"
}
```

**Output**: Execution result with status, steps, and validations

### `list_test_missions`

List all saved missions.

**Input**:
```json
{
  "status": "all|passing|failing [optional]",
  "tag": "string [optional]"
}
```

**Output**: Array of missions

### `get_test_report`

Retrieve detailed test report.

**Input**:
```json
{
  "executionId": "string",
  "includeScreenshots": "boolean [default: true]"
}
```

**Output**: Detailed report with steps, validations, insights, and recommendations

### `record_flow` (Coming Soon)

Interactive recording mode.

**Input**:
```json
{
  "name": "string",
  "startUrl": "string"
}
```

### `watch_tests` (Coming Soon)

Auto-run tests on file changes.

**Input**:
```json
{
  "missions": ["array of mission IDs"],
  "watchPaths": ["array of paths to watch"]
}
```

## 🗂️ File Structure

```
.mycontext/
├── test-missions.json          # Saved test missions
├── test-reports/               # Execution reports
│   └── <execution-id>.json
└── test-screenshots/           # Screenshots from tests
    ├── <execution-id>-initial.png
    ├── <execution-id>-step-1.png
    └── <execution-id>-final.png
```

## 🔧 Configuration

### Browser Config

Control browser behavior:

```typescript
{
  headless: boolean,           // Run in headless mode
  viewport: {                  // Browser viewport
    width: number,
    height: number
  },
  slowMo: number,              // Slow down by N ms
  baseUrl: string,             // Base URL
  timeout: number,             // Default timeout
  screenshotOnFailure: boolean,
  recordVideo: boolean
}
```

### AI Provider

The testing server uses the same AI provider configured for MyContext:

```bash
# .mycontext/.env
GITHUB_TOKEN=your-token         # GitHub Models (recommended)
# or
GEMINI_API_KEY=your-key         # Google Gemini
# or
ANTHROPIC_API_KEY=your-key      # Claude
```

## 📊 Reports

### Report Contents

Each test execution generates a detailed report:

- **Summary**: Steps executed, validations passed/failed, duration
- **Steps**: Each action taken by the AI with screenshots
- **Validations**: Results of all validation rules
- **Final State**: Final URL, screenshot, DOM snapshot
- **AI Notes**: Agent's summary of execution
- **Insights**: Analysis of the test results
- **Recommendations**: Suggestions for improvement

### Example Report

```markdown
# Test Report: Login Flow

**Execution ID**: abc-123-def
**Status**: PASSED
**Date**: 2026-02-07 10:30:00
**Duration**: 4532ms

## Summary
- Total Steps: 5
- Successful Steps: 5
- Failed Steps: 0
- Total Validations: 2
- Passed Validations: 2

## Execution Steps
### ✅ Step 1: fill: email input
**Intent**: Enter user email
**Screenshot**: /path/to/screenshot-1.png

### ✅ Step 2: fill: password input
**Intent**: Enter user password

### ✅ Step 3: click: Login button
**Intent**: Submit login form

## Insights
- All steps executed successfully
- Fast execution time - excellent!

## Recommendations
- None - test performed optimally
```

## 🤝 Integration with AI Coding Tools

### Claude Code

The testing MCP integrates seamlessly with Claude Code:

1. Claude reads your user flows from `.mycontext/02-user-flows.md`
2. Generates test missions automatically
3. Runs tests when you make changes
4. Reports back if anything broke

**Example Workflow**:

```
You: "I updated the login form. Make sure it still works."

Claude Code:
1. Uses MyContext MCP to get the login flow spec
2. Uses Testing MCP to run the login test
3. Reports: "✅ Login flow still works! All 3 validations passed."
```

### Cursor

Same integration as Claude Code. Add the MCP server to Cursor's config.

## 🛠️ Development

### Running Tests Locally

```bash
# Start your dev server
npm run dev

# Run tests against local server
mycontext test:run --url http://localhost:3000
```

### Debug Mode

Run with visible browser and slow motion:

```bash
mycontext test:run login-flow --headless=false --slow-mo=500
```

### Watch Mode (Coming Soon)

```bash
mycontext test:watch
```

Automatically re-runs tests when code changes.

## 🚦 CI/CD Integration

### GitHub Actions

```yaml
name: UI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: pnpm install

      - name: Start dev server
        run: pnpm dev &

      - name: Run UI tests
        run: pnpm mycontext test:all --url http://localhost:3000

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: .mycontext/test-screenshots/
```

## 📚 Examples

### Example 1: E-commerce Checkout Flow

```bash
mycontext test "User completes purchase:
1. Browse products
2. Add 3 items to cart
3. Apply discount code 'SAVE20'
4. Complete checkout with test card
5. Verify order confirmation"
```

### Example 2: Authentication Flow

```bash
mycontext test:init

# Prompts:
Name: auth-flow
Mission: User signs up, verifies email, and logs in
Expected: User is logged in and sees dashboard
Start URL: http://localhost:3000
```

### Example 3: Form Validation

```typescript
await mcp.create_test_mission({
  name: "contact-form-validation",
  mission: "Submit contact form with invalid data and verify error messages",
  expectedOutcome: "Form shows validation errors",
  validationRules: [
    {
      type: "text-contains",
      description: "Email error shown",
      expectedValue: "valid email"
    },
    {
      type: "element-visible",
      description: "Error message visible",
      selector: ".error-message"
    }
  ]
});
```

## 🐛 Troubleshooting

### Test Fails to Find Element

**Solution**: Run with `--headless=false --slow-mo=1000` to see what's happening.

### AI Makes Wrong Decision

**Solution**: Add more specific validation rules or adjust the mission description.

### Timeout Issues

**Solution**: Increase timeout or add explicit waits in validation rules.

## 🔮 Roadmap

- [x] Core MCP server
- [x] CLI commands
- [x] Natural language missions
- [x] AI-powered navigation
- [x] Validation rules
- [x] Detailed reports
- [x] MyContext integration
- [ ] Interactive recording mode
- [ ] Watch mode
- [ ] Visual regression testing
- [ ] Parallel test execution
- [ ] Custom AI prompts
- [ ] Test fixtures/data
- [ ] Network mocking
- [ ] Standalone npm package

## 📄 License

MIT © MyContext

---

**Need Help?**
- [GitHub Issues](https://github.com/farajabien/mycontext-cli/issues)
- [Documentation](https://docs.mycontext.app)
- [Discord Community](https://discord.gg/mycontext)
