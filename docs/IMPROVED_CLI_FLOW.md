# MyContext CLI: Improved Flow for Gemini 3 Hackathon

## 🎯 Philosophy: "From Idea to Code in Seconds"

The CLI should guide users through a natural workflow:
1. **Capture** the idea (screenshot OR text description)
2. **Generate** comprehensive context + visuals
3. **Code** with AI assistants (Claude/Cursor/Gemini)

---

## 🚀 Proposed Command Structure

### Quick Start (New!)
```bash
# Interactive project setup
mycontext quick-start

# Guided prompts:
# → Project name?
# → Do you have a screenshot? (y/n)
# → If yes: Upload screenshot
# → If no: Describe your app
# → Generate initial context + screens
```

### Screenshot Analysis (New! 🔥)
```bash
# Analyze existing app screenshot
mycontext analyze <screenshot.png>

# Output:
# ✓ Generated: .mycontext/context.md
# ✓ Detected: 12 components, 3 screens
# ✓ Design system extracted
# ✓ Ready for coding!
```

### Core Workflow (Simplified Names)
```bash
# Step 1: Initialize project
mycontext init

# Step 2: Generate screens from context
mycontext generate

# Step 3: Preview in Studio
mycontext preview
```

### Current Commands (Keep)
```bash
mycontext status      # Check context health
mycontext validate    # Lint context file
mycontext list        # Show generated files
```

---

## 📊 Command Comparison

| Old Command | New Command | Why Better |
|------------|-------------|------------|
| `mycontext-cli init` | `mycontext init` | Shorter, cleaner |
| *(not available)* | `mycontext quick-start` | Guided onboarding |
| *(not available)* | `mycontext analyze <img>` | **Killer feature!** |
| `mycontext-cli generate-components` | `mycontext generate` | Simpler name |
| `mycontext-cli preview --watch` | `mycontext preview` | Default to watch mode |

---

## 🌟 Enhanced Help System

### Main Help
```bash
mycontext --help

MyContext CLI v3.0 - Spec-Driven Development for AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEW! Screenshot-to-Spec (Powered by Gemini Vision)
  analyze <image>       Reverse engineer apps from screenshots

Quick Start
  quick-start           Interactive project setup
  init                  Initialize new project

Generation
  generate              Generate screens from context
  preview               Live preview in MyContext Studio

Validation
  validate              Check context quality
  status                View project status
  list                  Show generated files

Examples:
  mycontext analyze airbnb-homepage.png
  mycontext quick-start
  mycontext generate --screens all
  mycontext preview --port 3000

Powered by Gemini 3 🚀
```

---

## 🎪 Interactive Mode Examples

### Quick Start Flow
```bash
$ mycontext quick-start

╔══════════════════════════════════════╗
║  MyContext Quick Start               ║
╚══════════════════════════════════════╝

? Project name: my-awesome-app

? How do you want to start?
  ❯ 📸 I have a screenshot
    ✍️  I'll describe my app
    📋 Use example template

[User selects: I have a screenshot]

? Screenshot path: ./designs/mockup.png

🔍 Analyzing with Gemini Vision...
✓ Detected: E-commerce checkout flow
✓ Screens: 4 (Cart, Shipping, Payment, Success)
✓ Components: 23
✓ Tech stack: React, Tailwind CSS

? Generate screens now? (Y/n) y

🎨 Generating screens...
✓ cart-screen.html (1.2s)
✓ shipping-screen.html (1.1s)  
✓ payment-screen.html (1.3s)
✓ success-screen.html (0.9s)

╔══════════════════════════════════════╗
║  🎉 Project Ready!                   ║
╚══════════════════════════════════════╝

Next steps:
  1. mycontext preview     # View screens
  2. Copy context to Claude/Cursor
  3. Start coding!

Want to open Studio? (Y/n)
```

### Screenshot Analysis Flow
```bash
$ mycontext analyze twitter-profile.png

🔍 Analyzing screenshot with Gemini Vision...

╔══════════════════════════════════════╗
║  Analysis Complete                   ║
╚══════════════════════════════════════╝

📦 Detected Components:
  • NavigationBar (top)
  • ProfileHeader (banner, avatar, bio)
  • TabNavigation (Tweets, Replies, Media, Likes)
  • TweetCard (repeating)
  • Sidebar (trends, suggestions)

🎨 Design System:
  • Primary: #1DA1F2 (Blue)
  • Text: #14171A (Dark Gray)
  • Background: #FFFFFF
  • Typography: -apple-system, BlinkMacSystemFont
  • Spacing: 8px base grid

📐 Layout:
  • 3-column grid (sidebar, main, widgets)
  • Main content max-width: 600px
  • Responsive breakpoints detected

💾 Generated Files:
  ✓ .mycontext/context.md
  ✓ .mycontext/design-system.json
  ✓ .mycontext/components.yaml

? Generate screen mockup? (Y/n)
```

---

## 🔥 Why This Flow Rocks for Hackathon

1. **Instant "Wow" Factor**: Screenshot analysis = judges immediately see Gemini Vision in action
2. **Lower Barrier**: Quick-start removes friction for new users
3. **Clear Progression**: Analyze → Generate → Preview → Code
4. **Showcases Gemini 3**: Vision API + multimodal reasoning front and center
5. **Practical Use Case**: Solves real pain (reverse engineering UIs)

---

## 💡 Optional: Pro Mode

For power users who want more control:
```bash
mycontext analyze <image> --output context.md --extract-assets
mycontext generate --screens login,dashboard --style tailwind
mycontext preview --port 3000 --open-browser
```

---

## 🎬 Demo Script (3 minutes)

**Minute 1: The Problem**
- Show messy PRD
- Show vague user requirements
- "Claude asks 20 questions before coding"

**Minute 2: The Solution - Screenshot Analysis**
```bash
mycontext analyze airbnb-homepage.png
```
- Watch Gemini Vision analyze the UI
- See generated comprehensive context
- Showcase design system extraction

**Minute 3: The Magic - Generate & Code**
- `mycontext generate` creates visual mockups
- Open in Studio preview
- Copy context to Claude Code
- Watch Claude build the REAL app (time-lapse)

**Ending**: "From screenshot to shipping code in 3 minutes. Powered by Gemini 3."
