# Vision Testing Quick Start 🚀

**GET STARTED IN 5 MINUTES** - Test your production app with AI-powered vision testing!

## Prerequisites

1. **Gemini API Key** (for vision AI)
   ```bash
   export GEMINI_API_KEY="your-key-here"
   # Or add to .env file
   ```

2. **Your app running locally** (e.g., `http://localhost:3000`)

## Quick Start: Run Your First Vision Test

### Option 1: Create & Run a Vision Test (Recommended for First Time)

```bash
# 1. Create a vision test mission interactively
mycontext test:vision:init

# Answer the prompts:
# - Mission name: "Login Test"
# - What should the AI test?: "User should be able to login with email and password"
# - Expected outcome: "User is logged in and sees dashboard"
# - Starting URL: "http://localhost:3000/login"
# - Record demo?: Yes/No

# 2. Run the vision test (browser will open in headed mode for first run)
mycontext test:vision "Login Test" --no-headless
```

### Option 2: Quick Ad-Hoc Test (Fastest Way)

```bash
# Run a test directly without saving a mission
mycontext test:vision "Test login flow" \
  --url http://localhost:3000/login \
  --no-headless
```

## What Happens During a Vision Test?

1. **🌐 Browser Launches** - Navigates to your start URL
2. **👁️  AI Observes** - Takes screenshots and analyzes the UI
3. **🤔 AI Thinks** - Decides what to click/fill based on the mission
4. **⚡ AI Acts** - Executes actions (clicks buttons, fills forms, etc.)
5. **✅ AI Validates** - Checks if the expected outcome was achieved
6. **📊 Report Generated** - Shows you what happened with screenshots

## Common Use Cases

### Test User Login

```bash
mycontext test:vision:init

# Fill in:
# Mission: "User logs in with valid credentials"
# Expected: "Dashboard is visible"
# URL: "http://localhost:3000/login"

mycontext test:vision "login-mission" --no-headless
```

### Test Form Submission

```bash
# Create mission
mycontext test:vision:init

# Fill in:
# Mission: "User fills out contact form and submits successfully"
# Expected: "Success message is displayed"
# URL: "http://localhost:3000/contact"
```

### Generate a Professional Demo

```bash
# Record a demo with video + HTML replay + screenshots
mycontext demo:record \
  "Show the complete user onboarding flow from signup to first dashboard view" \
  "http://localhost:3000" \
  --formats video,screenshots,html-replay \
  --quality 1080p \
  --voiceover \
  --style marketing \
  --no-headless
```

## Understanding Test Output

### Test Results

```
═══════════════════════════════════════════
✅ TEST PASSED
═══════════════════════════════════════════

Duration: 15.3s
Steps: 8/8 successful
Validations: 3/3 passed
Screenshots: 8
Final URL: http://localhost:3000/dashboard
```

### When Tests Fail

The AI will:
- Show you which step failed
- Include screenshots of the failure
- Explain what it was trying to do
- Provide the error message

### Gravity System (Built-in Safety)

The AI checks **every action** against your project's Prime Objective (from context.json).

If an action would deviate from your app's purpose, it **stops automatically** and alerts you:

```
🛑 GRAVITY ALERT: Intent deviates from Prime Objective!
Gravity Score: 45%
```

This prevents the AI from doing random things that don't align with your app!

## Tips for Great Tests

### ✅ DO:
- **Be specific** in mission descriptions: "User logs in with email/password" vs "Test login"
- **Use headed mode first** (`--no-headless`) to see what the AI is doing
- **Start with simple flows** then build up to complex ones
- **Let the AI explore** - it can find buttons even if their CSS classes change!

### ❌ DON'T:
- Don't use CSS selectors (the AI finds elements visually!)
- Don't worry about brittle selectors breaking (vision is resilient!)
- Don't write step-by-step instructions (just describe the goal!)

## Demo Generation Features

### Available Formats

1. **Video** (MP4/WebM) - Full video recording
2. **Screenshots** - PNG sequence of each step
3. **HTML Replay** - Interactive step-by-step viewer (⭐ RECOMMENDED)
4. **Markdown Script** - Narration script with descriptions

### Generate with Voice-Over

```bash
mycontext demo:record \
  "User creates a new project and invites team members" \
  "http://localhost:3000" \
  --formats video,html-replay,markdown-script \
  --voiceover \
  --style educational \
  --no-headless
```

This creates:
- 📹 Video recording
- 🌐 Interactive HTML replay (open in browser!)
- 📝 Markdown narration script
- 🎙️  Voice-over script with timestamps

## Troubleshooting

### "Element not found"

**Solution**: The AI uses vision to find elements, but if it's struggling:
1. Make sure your app is fully loaded (AI waits 1s by default)
2. Use `--slow-mo 500` to slow down actions
3. Check screenshots to see what the AI is seeing

### "Mission drift prevented"

**Solution**: Your action doesn't align with the project's Prime Objective.
1. Check `.mycontext/context.json` for your Prime Objective
2. Revise your mission description to align
3. This is a FEATURE - prevents AI from going off-rails!

### "Gemini API error"

**Solution**:
```bash
# Make sure API key is set
echo $GEMINI_API_KEY

# Or add to .env
echo "GEMINI_API_KEY=your-key" >> .env
```

## Advanced: Custom Validation Rules

When creating a mission, you can add custom validations:

```javascript
// In code or via MCP server
{
  "name": "Login Test",
  "mission": "User logs in",
  "expectedOutcome": "Dashboard visible",
  "validationRules": [
    {
      "type": "url-match",
      "expectedValue": "/dashboard",
      "description": "URL should contain /dashboard"
    },
    {
      "type": "element-visible",
      "selector": "[data-testid='user-menu']",
      "description": "User menu should be visible"
    }
  ]
}
```

## Next Steps

1. ✅ **Run your first test** on your production app
2. ✅ **Generate a demo** to share with your team
3. ✅ **Create a test suite** for your critical flows
4. ✅ **Give feedback** on what works and what doesn't!

---

## Need Help?

- **Documentation**: `docs/VISION_TESTING.md` (comprehensive guide)
- **Examples**: `experiments/` (sample tests)
- **Issues**: GitHub issues for bug reports

## What's Coming Next

- 🎯 Visual regression testing (compare screenshots)
- 🔊 TTS audio generation for demos
- 🤖 Self-healing tests that adapt to UI changes
- 📊 Visual diff reports with highlighted changes
- 🎬 Demo editor UI

---

**Ready to test? Start with:**

```bash
mycontext test:vision:init
```

**Then run:**

```bash
mycontext test:vision "your-mission-name" --no-headless
```

🚀 **HAPPY TESTING!**
