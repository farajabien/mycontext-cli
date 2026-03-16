# @myycontext/recorder

Premium Demo Recording & Autonomous Navigation Engine for MyContext.

## Overview

The Recorder is a standalone application in the MyContext monorepo designed to autonomously navigate web applications using vision-based AI and generate high-fidelity demo recordings with synchronized voice-overs.

## Key Features

-   **Autonomous Vision Navigation**: Uses Gemini-Vision to understand UIs and make intelligent navigation decisions.
-   **High-Fidelity Demo Recording**: Captures 1080p video, screenshots, and HTML replay artifacts.
-   **AI Voice-Over (TTS)**: Automatically generates narration scripts and high-quality audio voice-overs via OpenAI Audio API.
-   **Interactive TUI Mode**: Collaborative Human-in-the-Loop (HITL) mode for low-confidence decisions or manual overrides.
-   **Living Brain Integration**: Communicates state and execution history via the centralized `context.json`.
-   **Gravity System**: Validates agent decisions against the project's "Prime Objective" to prevent mission drift.

## Getting Started

### Prerequisites

Ensure you have the following environment variables set:

```bash
GEMINI_API_KEY=...
MYCONTEXT_GITHUB_TOKEN=...
OPENAI_API_KEY=...
```

### Installation

```bash
pnpm install
```

### Running a Demo

To record a demo of a web application:

```bash
pnpm dev demo --url https://example.com --mission "Show the user login and dashboard features"
```

### Options

-   `-u, --url <url>`: The starting URL for the demo.
-   `-m, --mission <mission>`: Description of what the AI should record.
-   `-n, --name <name>`: Custom name for the demo project.
-   `-v, --voiceover`: Enable automated voice-over script and audio generation.
-   `-i, --interactive`: Enable Interactive TUI mode for manual guidance.

## Architecture

-   **`src/agents/`**: Specialized agents for navigation, validation, and script extraction.
-   **`src/core/`**: Orchestration logic and browser lifecycle management.
-   **`src/services/`**: Supporting services for vision, context management, and TTS.
-   **`src/orchestrator/`**: Sub-Agent Orchestration engine.
-   **`src/types/`**: Unified type definitions for vision testing and demo missions.

## Development

To build the project:

```bash
pnpm build
```

To run a dry-run check:

```bash
npx tsc --noEmit
```
