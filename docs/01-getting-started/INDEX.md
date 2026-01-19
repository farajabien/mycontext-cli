# Getting Started

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

Welcome to MyContext CLI! This section gets you up and running to generate **high-quality context for AI design tools**.

## Contents

- [Getting Started](getting-started.md) - Install, generate `.mycontext/`, and create a Stitch-ready prompt

## What You'll Learn

By the end of this section, you'll be able to:

- Install and configure MyContext CLI
- Generate a `.mycontext/` context pack for your app
- Generate a **single mega prompt** to paste into AI design tools (Stitch, etc.)
- Use the same context pack to help AI coding tools build the UI

## Prerequisites

- Node.js 18+
- npm or yarn
- Basic knowledge of React and TypeScript

## Quick Overview

MyContext CLI generates a high-signal context pack for your app, then compiles it into a design prompt you can paste into AI design tools.

**Example:**

```bash
mycontext generate-context-files --description "A modern fintech wallet app..."
mycontext generate:design-prompt --format stitch
```

**Output:** `.mycontext/design-prompt.txt` (ready to paste into Stitch) + structured context files for reuse.

---

**Ready to start?** [Open Getting Started →](getting-started.md)
