# @myycontext/core

**The Feature Schema (AST) Engine and Architectural Heart of the MyContext DS-NLC Compiler.**

`@myycontext/core` provides the shared compiler types, structured manifest schemas, and strictly typed **FSR (Feature Structured Representation)** that powers the [MyContext Compiler Ecosystem](https://github.com/farajabien/mycontext-cli).

[![npm version](https://img.shields.io/npm/v/@myycontext/core.svg)](https://www.npmjs.com/package/@myycontext/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏗️ Role in the Compiler

This package is the absolute source of truth describing **what** gets built, utilized predominantly by the Next.js `mycontext-cli` generation engine.

| Capability | Description |
|------------|-------------|
| **FSR Types** | `FSR`, `FSRComponent`, `FSRModel`, `FSRServerAction` — strict JSON generation blueprint. |
| **Component Types** | Next.js classification metrics and React rendering AST boundaries. |
| **Compiler Models** | InstantDB model specifications deterministically generating TypeScript validation schemas and relational mappings. |
| **System Validation** | Universal payload and type bounds for the CLI planner module. |

---

## 🚀 Installation

```bash
npm install @myycontext/core
# or
pnpm add @myycontext/core
```

---

## 📖 Key Exports

### FSR AST Schema

```typescript
import { FSR } from '@myycontext/core';

// Represents an immutable structured AST output by the AI Planner.
const todoFeature: FSR = {
  featureId: 'add_todo',
  description: 'todo app with local storage',
  entryPoint: {
    type: 'page',
    path: '/todos',
    component: 'TodosPage'
  },
  components: [
    {
      name: 'TodosPage',
      type: 'server',
      children: ['TodoList']
    },
    {
      name: 'TodoList',
      type: 'client',
      children: ['AddTodoButton']
    }
  ],
  serverActions: [],
  models: [
    {
      name: 'Todo',
      fields: {
        id: 'string',
        title: 'string',
        completed: 'boolean'
      }
    }
  ],
  uiRules: {
    prefer_dialog_over_page: true
  }
};
```

---

## 🏛️ Architecture

```
@myycontext/core/src/
├── index.ts                    # Package entry
├── manifest-manager.ts         # JSON Manifest readers/writers
└── types/
    ├── fsr.ts                  # FSR definitions (Feature Structured Representation)
    ├── components.ts           # Component classifications
    ├── design-pipeline.ts      # LLM Prompt intent mapping tokens
```

---

## 🔗 Relationship to `mycontext-cli`

The `mycontext-cli` parses natural language to form `FSR` data, and executes script-based templates over that `FSR` model. This library, `@myycontext/core`, provides the static TS types validating those operations internally.

---

## 🤝 Contributing & License

Contributions are welcome via the [MyContext Monorepo](https://github.com/farajabien/mycontext-cli).
MIT © MyContext — See [LICENSE](https://github.com/farajabien/mycontext-cli/blob/main/LICENSE).
