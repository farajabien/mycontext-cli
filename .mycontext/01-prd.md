# Product Requirements Document: MyContext CLI

## Project Overview
**Project Name:** MyContext CLI (Standalone)
**Description:** A professional CLI tool designed to facilitate spec-driven development for AI agents. It acts as a "Living DB" that anchors project context, providing a deterministic source of truth for AI-powered coding tools like Claude and Cursor.

## Core Purpose
To bridge the gap between abstract project ideas (or visual screenshots) and production-ready code by generating, maintaining, and validating a "Hard Gravity" design manifest and comprehensive context files.

## High-Level Requirements & Features

### 1. Project Initialization & Anchoring
- **`mycontext init`**: Scaffolds a new project with framework support (InstantDB, Next.js, Basic).
- **Living DB Bootstrap**: Initializes the `.mycontext` directory and a foundational `design-manifest.json`.

### 2. Context Generation (Spec-Driven)
- **`mycontext generate context --full`**: Orchestrates the generation of PRD, User Flows, Edge Cases, and Technical Specs.
- **`mycontext compile-prd`**: Synthesizes a unified PRD from atomic context files.
- **`mycontext generate:screens`**: Generates visual/functional screens in HTML or JSX from the manifest.

### 3. Hard Gravity Engine (Design Pipeline)
- **Design Manifest**: A structured JSON definition (8 phases) that captures everything from visual system tokens to component hierarchies.
- **State Attestation**: Mechanisms to detect drift between the manifest (Physics) and the actual implementation (Narrative).

### 4. AI Multimodal Integration
- **`mycontext analyze`**: Uses Gemini 2.0 Flash to reverse-engineer screenshots into structured specs and design tokens.
- **Hybrid AI Client**: Flexible support for multiple providers (Claude, GitHub Models, Gemini, OpenRouter, xAI).

### 5. Developer Experience & Integration
- **Claude/Cursor Ready**: Generates files optimized for modern AI coding tools.
- **MCP Server**: Integrated Model Context Protocol support for seamless agent interaction.
- **Dynamic README**: (NEW) Automatically updates project root documentation from the internal specs.

## Technical Stack
- **Languages**: TypeScript, JavaScript
- **Frameworks**: Commander.js (CLI), React (via templates)
- **AI Integrations**: Google Gemini, Anthropic Claude, OpenAI, OpenRouter
- **Utilities**: chalk, prompts, fs-extra, figlet, uuid

## Success Metrics
- **Zero-Drift**: High correlation between generated specs and final implementation.
- **Spec Speed**: Reduce the time from "mockup" to "full spec set" to under 2 minutes.
- **Dogfooding Success**: The CLI project itself is successfully anchored and evolved using its own manifests.
