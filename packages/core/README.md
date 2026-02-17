# @myycontext/core

**The Manifest Engine and Architectural Heart of the MyContext Ecosystem.**

`@myycontext/core` provides the shared types, manifest management, and **Living Brain** primitives that power the entire [MyContext](https://github.com/farajabien/mycontext-cli) ecosystem.

[![npm version](https://img.shields.io/npm/v/@myycontext/core.svg)](https://www.npmjs.com/package/@myycontext/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏗️ Role in the Ecosystem

This package is the foundational layer used by `mycontext-cli` and other tools:

| Capability | Description |
|------------|-------------|
| **Brain Types** | `Brain`, `BrainTask`, `BrainUpdate`, `BrainArtifacts` — shared state for agent coordination |
| **Component Types** | `Component`, atomic/molecule/organism classification for Lego Assembly |
| **Design Pipeline** | Full design-to-code pipeline types: manifests, tokens, screens, feature bundles |
| **Manifest Manager** | `DesignManifestManager` — atomic read/write/validate for `design-manifest.json` |

---

## 🚀 Installation

```bash
npm install @myycontext/core
# or
pnpm add @myycontext/core
```

---

## 📖 Exports

### Brain Types

```typescript
import type { Brain, BrainTask, BrainUpdate, BrainArtifacts, BrainRole } from '@myycontext/core';
import { INITIAL_BRAIN_STATE } from '@myycontext/core';

// Brain is the shared "blackboard" for agent teams
const brain: Brain = {
  version: "2.1.0",
  narrative: "Building user authentication",
  status: "implementing",
  checkpoints: ["phase-1-complete"],
  updates: [],
  tasks: [],
  artifacts: {},
  memory: {},
  registry: { components: [] }
};
```

### Component Types

```typescript
import type { Component } from '@myycontext/core';

const button: Component = {
  id: 'primary-button',
  name: 'PrimaryButton',
  type: 'atomic',
  status: 'implemented',
  description: 'Main CTA button',
  dependencies: [],
  designTokens: []
};
```

### Design Manifest Manager

```typescript
import { DesignManifestManager } from '@myycontext/core';

const manager = new DesignManifestManager('/path/to/project');

// Load manifest
const manifest = await manager.load();

// Save with atomic writes
await manager.save(manifest);

// Validate
const isValid = manager.validate(manifest);
```

### Design Pipeline Types

```typescript
import type {
  DesignManifest,
  DesignToken,
  Screen,
  FeatureBundle,
  AnalysisResult,
  RolePermissions,
  FlowTestingConfig
} from '@myycontext/core';
```

---

## 🏛️ Architecture

```
@myycontext/core/src/
├── index.ts                    # Package entry — re-exports all
├── manifest-manager.ts         # DesignManifestManager class
└── types/
    ├── brain.ts                # Brain, BrainTask, BrainUpdate
    ├── components.ts           # Component (atomic → organism)
    ├── design-pipeline.ts      # DesignManifest, DesignToken, Screen
    ├── analysis.ts             # AnalysisResult
    ├── enhancement.ts          # Enhancement types
    ├── feature-bundle.ts       # FeatureBundle
    ├── flow-testing.ts         # FlowTestingConfig
    ├── index.ts                # Type barrel
    ├── intent-dictionary.ts    # Intent classification
    ├── pm-integration.ts       # PM tool integration
    ├── progress.ts             # Progress tracking
    └── role-permissions.ts     # RolePermissions
```

---

## 🔗 Relationship to `mycontext-cli`

The CLI (`mycontext-cli`) extends these core types:

| Core provides | CLI extends with |
|--------------|------------------|
| `Brain` | `UnifiedContext` (merges Brain + MegaContext) |
| `Component` | Component registry in `context.json` |
| `DesignManifest` | `MegaContext` for deterministic scaffolding |

---

## 🤝 Contributing

Part of the [MyContext Monorepo](https://github.com/farajabien/mycontext-cli).

```bash
git clone https://github.com/farajabien/mycontext-cli.git
cd mycontext-cli
pnpm install
pnpm --filter @myycontext/core build
```

## 📄 License

MIT © MyContext — See [LICENSE](https://github.com/farajabien/mycontext-cli/blob/main/LICENSE)

## 🔗 Links

- [Monorepo](https://github.com/farajabien/mycontext-cli#readme)
- [CLI Package](https://www.npmjs.com/package/mycontext-cli)
- [npm Package](https://www.npmjs.com/package/@myycontext/core)
- [Report Issues](https://github.com/farajabien/mycontext-cli/issues)
