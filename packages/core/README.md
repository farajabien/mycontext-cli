# @myycontext/core

**The Manifest Engine and Architectural Heart of the MyContext Ecosystem.**

`@myycontext/core` provides the shared logic, types, and manifest management required for Spec-Driven Development. It is the deterministic source of truth for the **Living DB**.

---

## 🏗️ Role in the Ecosystem

This package is the foundational layer that powers:
- **Design Manifest Management** - Loading, saving, and validating `design-manifest.json`
- **Architectural Types** - TypeScript interfaces for AI agents, components, and design pipelines
- **Context Enrichment** - Bridging raw specifications with agentic execution context
- **Hard Gravity Engine** - Ensuring zero-drift between design intent and implementation

---

## 🚀 Installation

```bash
npm install @myycontext/core
# or
pnpm add @myycontext/core
```

---

## 📖 API Reference

### `DesignManifestManager`

The central manager for the `design-manifest.json` file.

```typescript
import { DesignManifestManager } from '@myycontext/core';

// Initialize with project root
const manager = new DesignManifestManager('/path/to/project');

// Load manifest
const manifest = await manager.load();

// Save manifest with atomic writes
await manager.save(manifest);

// Validate manifest
const isValid = manager.validate(manifest);
```

**Features:**
- ✅ **Atomic Saves** - Ensures data integrity during manifest updates
- ✅ **Schema Validation** - Strict checking to maintain "Hard Gravity" anchors
- ✅ **Default Scaffolding** - Generates initial manifests for new projects
- ✅ **Type Safety** - Full TypeScript support with exported types

---

### Core Types

The package exports comprehensive TypeScript types for the MyContext ecosystem:

```typescript
import type {
  DesignManifest,
  Component,
  Screen,
  DesignToken,
  FeatureBundle,
  PMIntegration,
  AnalysisResult,
  RolePermissions,
  FlowTestingConfig
} from '@myycontext/core';
```

#### `DesignManifest`
The main manifest structure representing the Living DB:

```typescript
interface DesignManifest {
  projectName: string;
  version: string;
  description?: string;
  designTokens: DesignTokens;
  components: Component[];
  screens: Screen[];
  featureBundles?: FeatureBundle[];
  pmIntegration?: PMIntegration;
  metadata?: {
    createdAt: string;
    updatedAt: string;
    lastSyncedAt?: string;
  };
}
```

#### `Component`
Represents a UI component in the design system:

```typescript
interface Component {
  id: string;
  name: string;
  type: 'atomic' | 'molecule' | 'organism' | 'template';
  description?: string;
  props?: Record<string, any>;
  dependencies?: string[];
  designTokens?: string[];
  status: 'planned' | 'in-progress' | 'implemented' | 'tested';
}
```

#### `FeatureBundle`
Groups related features for implementation:

```typescript
interface FeatureBundle {
  id: string;
  name: string;
  description: string;
  features: Feature[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in-progress' | 'completed';
  dependencies?: string[];
}
```

---

## 🔧 Usage Examples

### Basic Manifest Management

```typescript
import { DesignManifestManager } from '@myycontext/core';

const manager = new DesignManifestManager(process.cwd());

// Load existing manifest
const manifest = await manager.load();

// Add a new component
manifest.components.push({
  id: 'button-primary',
  name: 'PrimaryButton',
  type: 'atomic',
  description: 'Primary action button',
  status: 'planned',
  props: {
    variant: 'primary',
    size: 'medium'
  }
});

// Save changes
await manager.save(manifest);
```

### Type-Safe Component Creation

```typescript
import type { Component } from '@myycontext/core';

const createComponent = (name: string): Component => ({
  id: name.toLowerCase(),
  name,
  type: 'atomic',
  status: 'planned',
  dependencies: [],
  designTokens: []
});

const button = createComponent('Button');
```

### Feature Bundle Management

```typescript
import type { FeatureBundle } from '@myycontext/core';

const authBundle: FeatureBundle = {
  id: 'auth-bundle',
  name: 'Authentication System',
  description: 'Complete user authentication flow',
  priority: 'high',
  status: 'in-progress',
  features: [
    {
      id: 'login',
      name: 'User Login',
      description: 'Email/password authentication',
      status: 'completed'
    },
    {
      id: 'signup',
      name: 'User Registration',
      description: 'New user signup flow',
      status: 'in-progress'
    }
  ]
};
```

---

## 🏛️ Architecture

The core package follows a modular architecture:

```
@myycontext/core/
├── manifest/               # Manifest management
│   └── DesignManifestManager.ts
├── types/                  # TypeScript definitions
│   ├── manifest.ts
│   ├── components.ts
│   ├── features.ts
│   └── ...
└── utils/                  # Shared utilities
    └── ...
```

---

## 🤝 Contributing

This package is part of the [MyContext Monorepo](https://github.com/farajabien/mycontext-cli).

For local development:
```bash
git clone https://github.com/farajabien/mycontext-cli.git
cd mycontext-cli
pnpm install
pnpm --filter @myycontext/core build
```

---

## 📄 License

MIT © MyContext - See [LICENSE](https://github.com/farajabien/mycontext-cli/blob/main/LICENSE) for details.

---

## 🔗 Links

- [Monorepo Documentation](https://github.com/farajabien/mycontext-cli#readme)
- [CLI Package (mycontext-cli)](https://www.npmjs.com/package/mycontext-cli)
- [Report Issues](https://github.com/farajabien/mycontext-cli/issues)
- [npm Package](https://www.npmjs.com/package/@myycontext/core)
