# Reference

<p align="center">
  <img src="https://raw.githubusercontent.com/farajabien/mycontext-cli/main/public/mycontext-logo.png" alt="MyContext Logo" width="200" />
</p>

Complete reference documentation for MyContext CLI commands, configuration, and APIs.

## Contents

- [Commands](commands.md) - Complete command reference
- [Configuration](configuration.md) - Settings and customization

## Quick Reference

### Essential Commands

```bash
# Initialize project
mycontext init <project-name>

# Generate context pack (A/B/C/D)
mycontext generate-context-files --description "Describe your app..."

# Compile into a single PRD (optional)
mycontext compile-prd

# Generate Stitch-ready mega prompt
mycontext generate:design-prompt --format stitch
```

### Configuration Files

- **`.mycontext/.env`**: Your AI provider key(s)
- **`.mycontext/*.md`**: Context pack files (features, flows, edge cases, specs, PRD, branding)
- **`.mycontext/design-prompt.txt`**: Mega prompt output for AI design tools

### Environment Variables

```bash
# Recommended
MYCONTEXT_OPENROUTER_API_KEY=your-openrouter-key

# Optional
MYCONTEXT_TEMPERATURE=0.1
MYCONTEXT_MAX_TOKENS=4000
MYCONTEXT_TIMEOUT=30000
```

## Command Options

### Global Options

- `--verbose, -v`: Enable verbose logging
- `--dry-run`: Show what would be done without executing
- `--config <path>`: Specify custom config file
- `--help, -h`: Show help information

### Context + Prompt Generation

- `generate-context-files --description <text>`: Create the A/B/C/D context pack
- `compile-prd`: Compile/merge context into a single PRD file
- `generate:design-prompt --format <stitch|general|api>`: Produce a mega prompt for AI design tools

---

**Next:** [Commands →](commands.md)
