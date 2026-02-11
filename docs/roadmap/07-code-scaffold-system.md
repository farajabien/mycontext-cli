# Code Scaffold System

**Status**: 📋 Planned | **Priority**: P1 (High Impact) | **Effort**: 6 weeks

## Executive Summary

The **Code Scaffold System** transforms MyContext CLI from a documentation generator into a **full-stack code generator**. Instead of just creating specs and context, it generates production-ready code for common features that every project needs.

**The Problem**: Developers spend 5-7 days on repetitive setup for every new project:
- Authentication + role-based access
- Admin dashboards
- Payment integrations
- Auth guards and paywalls
- PWA configuration
- Loading/error pages
- Empty states
- Responsive layouts

**The Solution**: `mycontext scaffold` reads your `.mycontext/` files and generates working code for these "non-negotiables" in minutes.

## Problem Statement

### The Week-Long Setup Tax

Every new project requires the same repetitive work:

```bash
# Day 1-2: Auth System
- Set up authentication provider
- Implement login/signup flows
- Create role-based access control
- Build permission middleware
- Test auth flows

# Day 2-3: Admin Dashboard
- Create CRUD interfaces for each table
- Build data grids/tables
- Add filters, search, pagination
- Implement edit/delete actions
- Add form validation

# Day 3-4: Payment System
- Integrate Stripe/PayPal
- Build checkout flows
- Create subscription management
- Handle webhooks
- Test payment flows

# Day 4-5: Guards & Paywalls
- Create auth guards for routes
- Build paywall components
- Add soft/hard paywalls
- Implement feature flags
- Test access control

# Day 5-7: PWA, Pages, States
- Configure PWA (manifest, service worker)
- Create loading/error pages
- Build empty state components
- Set up responsive layouts
- Test across devices
```

**Total Time**: 5-7 days of repetitive, non-creative work

### Current MyContext Flow

```
mycontext init
  ↓
mycontext generate context
  ↓
[MANUAL CODING FOR 5-7 DAYS]
  ↓
Working application
```

### Proposed Flow with Scaffold

```
mycontext init
  ↓
mycontext generate context
  ↓
mycontext scaffold --features all  [2-5 minutes]
  ↓
Working application with all non-negotiables implemented
  ↓
Focus on unique business logic only
```

**Time Saved**: 5-7 days → 5 minutes
**Impact**: 100x faster project setup

## Solution Overview

### What is `mycontext scaffold`?

A context-aware code generator that:

1. **Reads** your `.mycontext/` files (PRD, schema, flows, branding)
2. **Applies** your scaffold configuration
3. **Generates** production-ready code for common features
4. **Integrates** seamlessly with your existing codebase

### Key Principles

1. **Context-Aware**: Uses YOUR project specs, not generic templates
2. **Configurable**: Pick and choose features via config
3. **Maintainable**: Generated code is clean, documented, and testable
4. **Non-Invasive**: Generates to specific directories, won't override your code
5. **Framework-Agnostic**: Works with Next.js, vanilla React, and more

### Example Usage

```bash
# Full scaffold with all features
mycontext scaffold --features all

# Pick specific features
mycontext scaffold --features auth,admin,payments

# Use custom config
mycontext scaffold --config ./my-scaffold.json

# Dry run (see what would be generated)
mycontext scaffold --dry-run

# Update existing scaffold
mycontext scaffold --update
```

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────┐
│           mycontext scaffold                    │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│         Context Reader                          │
│  Reads:                                         │
│  - .mycontext/01-prd.md                        │
│  - .mycontext/02-user-flows.md                 │
│  - .mycontext/03-branding.md                   │
│  - .mycontext/instant-db-schema.ts             │
│  - .mycontext/04-component-list.json           │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│         Config Processor                        │
│  Reads: scaffold-config.json                    │
│  Merges with defaults                           │
│  Validates config                               │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│         Template Engine                         │
│  Templates:                                     │
│  - auth-system/                                │
│  - admin-dashboard/                            │
│  - payment-integration/                        │
│  - auth-guards/                                │
│  - pwa-config/                                 │
│  - pages/                                      │
│  - components/                                 │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│         Code Generator                          │
│  Processes templates with context               │
│  Applies branding/styles                        │
│  Generates TypeScript/React code                │
│  Creates tests                                  │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────┐
│         File Writer                             │
│  Writes to:                                     │
│  - app/ or pages/                              │
│  - components/                                 │
│  - lib/                                        │
│  - middleware.ts                               │
│  - public/ (PWA assets)                        │
└─────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Context Reader (`src/scaffold/context-reader.ts`)

Extracts information from MyContext files:

```typescript
export class ContextReader {
  async readContext(projectPath: string): Promise<ProjectContext> {
    return {
      prd: await this.readPRD(),
      schema: await this.readInstantDBSchema(),
      flows: await this.readUserFlows(),
      branding: await this.readBranding(),
      components: await this.readComponentList()
    };
  }

  private async readInstantDBSchema(): Promise<InstantDBSchema> {
    // Parse instant-db-schema.ts
    // Extract tables, relationships, permissions
  }

  private async extractRoles(): Promise<string[]> {
    // Extract user roles from schema or flows
    // e.g., ["user", "creator", "admin", "premium"]
  }

  private async extractPaymentPlans(): Promise<PaymentPlan[]> {
    // Extract pricing plans from PRD
  }
}
```

#### 2. Config Processor (`src/scaffold/config-processor.ts`)

Handles scaffold configuration:

```typescript
export interface ScaffoldConfig {
  framework: 'nextjs' | 'react';
  ui: 'shadcn' | 'custom';
  database: 'instantdb' | 'supabase' | 'firebase';

  features: {
    authentication: AuthConfig;
    admin: AdminConfig;
    payments: PaymentConfig;
    guards: GuardConfig;
    pwa: PWAConfig;
    pages: PageConfig;
  };
}

export class ConfigProcessor {
  async loadConfig(configPath?: string): Promise<ScaffoldConfig> {
    const userConfig = configPath
      ? await this.readUserConfig(configPath)
      : await this.findConfigInProject();

    return this.mergeWithDefaults(userConfig);
  }

  private getDefaultConfig(): ScaffoldConfig {
    return {
      framework: 'nextjs',
      ui: 'shadcn',
      database: 'instantdb',
      features: {
        authentication: { enabled: true, provider: 'instantdb' },
        admin: { enabled: true, tables: 'all' },
        payments: { enabled: false },
        guards: { enabled: true },
        pwa: { enabled: true },
        pages: { enabled: true }
      }
    };
  }
}
```

#### 3. Template Engine (`src/scaffold/template-engine.ts`)

Manages and processes templates:

```typescript
export class TemplateEngine {
  private templates: Map<string, Template>;

  async generateFeature(
    feature: FeatureName,
    context: ProjectContext,
    config: ScaffoldConfig
  ): Promise<GeneratedFile[]> {
    const template = this.templates.get(feature);
    return await template.generate(context, config);
  }

  async loadTemplates(templateDir: string): Promise<void> {
    // Load all templates from src/scaffold/templates/
  }
}
```

#### 4. Code Generator (`src/scaffold/code-generator.ts`)

Generates actual code:

```typescript
export class CodeGenerator {
  async generate(
    context: ProjectContext,
    config: ScaffoldConfig
  ): Promise<GeneratedProject> {
    const files: GeneratedFile[] = [];

    if (config.features.authentication.enabled) {
      files.push(...await this.generateAuth(context, config));
    }

    if (config.features.admin.enabled) {
      files.push(...await this.generateAdmin(context, config));
    }

    if (config.features.payments.enabled) {
      files.push(...await this.generatePayments(context, config));
    }

    if (config.features.guards.enabled) {
      files.push(...await this.generateGuards(context, config));
    }

    if (config.features.pwa.enabled) {
      files.push(...await this.generatePWA(context, config));
    }

    if (config.features.pages.enabled) {
      files.push(...await this.generatePages(context, config));
    }

    return { files };
  }
}
```

## Feature Templates

### 1. Authentication System

**Template**: `templates/auth-system/`

**Generates**:
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx              [Login page]
│   ├── signup/
│   │   └── page.tsx              [Signup page]
│   └── layout.tsx                [Auth layout]
├── api/
│   └── auth/
│       ├── login/route.ts        [Login endpoint]
│       ├── signup/route.ts       [Signup endpoint]
│       └── logout/route.ts       [Logout endpoint]
lib/
├── auth.ts                        [Auth utilities]
├── hooks/
│   └── use-auth.ts               [useAuth hook]
middleware.ts                      [Auth middleware]
components/
└── auth/
    ├── login-form.tsx            [Login form component]
    ├── signup-form.tsx           [Signup form component]
    └── auth-provider.tsx         [Auth context provider]
```

**Features**:
- InstantDB integration
- Email/password authentication
- Role-based access control (RBAC)
- Protected routes
- Session management
- Auth hooks and utilities

**Configuration**:
```json
{
  "features": {
    "authentication": {
      "enabled": true,
      "provider": "instantdb",
      "methods": ["email", "google", "github"],
      "roles": ["user", "creator", "admin"],
      "features": {
        "emailVerification": true,
        "passwordReset": true,
        "rememberMe": true,
        "twoFactor": false
      }
    }
  }
}
```

### 2. Admin Dashboard

**Template**: `templates/admin-dashboard/`

**Generates**:
```
app/
├── admin/
│   ├── layout.tsx                [Admin layout with nav]
│   ├── page.tsx                  [Dashboard home]
│   ├── users/
│   │   ├── page.tsx              [Users list]
│   │   └── [id]/
│   │       └── page.tsx          [User detail/edit]
│   ├── [table]/                  [Dynamic table routes]
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── settings/
│       └── page.tsx              [Admin settings]
components/
└── admin/
    ├── data-table.tsx            [Reusable data table]
    ├── data-filters.tsx          [Search/filter UI]
    ├── data-pagination.tsx       [Pagination component]
    ├── edit-dialog.tsx           [Edit modal]
    ├── delete-dialog.tsx         [Delete confirmation]
    └── stats-card.tsx            [Dashboard stats]
lib/
└── admin/
    ├── queries.ts                [InstantDB queries]
    └── actions.ts                [CRUD actions]
```

**Features**:
- CRUD operations for all InstantDB tables
- Search, filter, sort, paginate
- Bulk operations
- Data visualization
- Export to CSV/JSON
- Audit logging

**Configuration**:
```json
{
  "features": {
    "admin": {
      "enabled": true,
      "tables": ["users", "campaigns", "submissions"],
      "permissions": "admin",
      "features": {
        "search": true,
        "filters": true,
        "export": true,
        "bulkActions": true,
        "auditLog": true
      },
      "ui": {
        "theme": "from-branding",
        "layout": "sidebar"
      }
    }
  }
}
```

### 3. Payment Integration

**Template**: `templates/payment-integration/`

**Generates**:
```
app/
├── pricing/
│   └── page.tsx                  [Pricing page]
├── checkout/
│   └── page.tsx                  [Checkout flow]
├── api/
│   └── payments/
│       ├── create-checkout/route.ts
│       ├── webhook/route.ts      [Payment webhooks]
│       └── subscription/route.ts
components/
└── payments/
    ├── pricing-card.tsx          [Plan card]
    ├── checkout-form.tsx         [Checkout UI]
    ├── subscription-status.tsx   [User's subscription]
    └── payment-button.tsx        [Reusable pay button]
lib/
└── payments/
    ├── stripe.ts                 [Stripe client]
    ├── paypal.ts                 [PayPal client]
    └── subscription.ts           [Subscription logic]
```

**Features**:
- Multiple providers (Stripe, PayPal)
- Subscription management
- One-time payments
- Webhook handling
- User payment history
- Integration with InstantDB user model

**Configuration**:
```json
{
  "features": {
    "payments": {
      "enabled": true,
      "providers": ["stripe", "paypal"],
      "plans": [
        {
          "name": "free",
          "price": 0,
          "features": ["basic-access"]
        },
        {
          "name": "pro",
          "price": 29,
          "interval": "month",
          "features": ["unlimited-campaigns", "priority-support"]
        }
      ],
      "currency": "usd",
      "features": {
        "subscriptions": true,
        "oneTime": true,
        "webhooks": true
      }
    }
  }
}
```

### 4. Auth Guards & Paywalls

**Template**: `templates/auth-guards/`

**Generates**:
```
components/
└── guards/
    ├── auth-guard.tsx            [Requires authentication]
    ├── role-guard.tsx            [Requires specific role]
    ├── paywall.tsx               [Requires subscription]
    ├── soft-paywall.tsx          [Shows teaser, prompts upgrade]
    └── feature-flag.tsx          [Toggle features]
lib/
└── guards/
    ├── check-access.ts           [Access checking utilities]
    └── permissions.ts            [Permission definitions]
middleware.ts                      [Route protection]
```

**Features**:
- Route-level protection
- Component-level guards
- Role-based access
- Subscription-based access
- Soft/hard paywalls
- Feature flags

**Configuration**:
```json
{
  "features": {
    "guards": {
      "enabled": true,
      "routes": {
        "/admin": { "role": "admin" },
        "/creator/dashboard": { "role": "creator" },
        "/premium-features": { "subscription": "pro" }
      },
      "features": {
        "advanced-analytics": { "subscription": "pro" },
        "unlimited-campaigns": { "subscription": "pro" }
      },
      "paywalls": {
        "soft": ["advanced-analytics"],
        "hard": ["unlimited-campaigns"]
      }
    }
  }
}
```

### 5. PWA Configuration

**Template**: `templates/pwa-config/`

**Generates**:
```
public/
├── manifest.json                 [PWA manifest]
├── sw.js                         [Service worker]
├── icons/                        [App icons]
│   ├── icon-192x192.png
│   └── icon-512x512.png
app/
└── layout.tsx                    [Updated with PWA meta]
next.config.js                    [Updated for PWA]
```

**Features**:
- Progressive Web App configuration
- Offline support
- App-like experience
- Push notifications (optional)
- Install prompts

**Configuration**:
```json
{
  "features": {
    "pwa": {
      "enabled": true,
      "name": "from-prd",
      "themeColor": "from-branding",
      "features": {
        "offline": true,
        "notifications": false,
        "installPrompt": true
      }
    }
  }
}
```

### 6. Loading, Error & Empty States

**Template**: `templates/pages/`

**Generates**:
```
app/
├── loading.tsx                   [Root loading]
├── error.tsx                     [Root error]
├── not-found.tsx                 [404 page]
components/
└── states/
    ├── loading-spinner.tsx       [Loading component]
    ├── loading-skeleton.tsx      [Skeleton loader]
    ├── error-boundary.tsx        [Error boundary]
    ├── error-message.tsx         [Error display]
    └── empty-state.tsx           [No data state]
```

**Features**:
- Loading states
- Error boundaries
- Empty states
- Branded styling
- Reusable components

**Configuration**:
```json
{
  "features": {
    "pages": {
      "enabled": true,
      "features": {
        "loading": true,
        "error": true,
        "notFound": true,
        "emptyStates": true
      },
      "style": "from-branding"
    }
  }
}
```

## Configuration Schema

### Complete `scaffold-config.json`

```json
{
  "$schema": "https://mycontext.dev/schemas/scaffold-config.json",
  "version": "1.0.0",

  "project": {
    "framework": "nextjs",
    "ui": "shadcn",
    "database": "instantdb",
    "styling": "tailwind"
  },

  "features": {
    "authentication": {
      "enabled": true,
      "provider": "instantdb",
      "methods": ["email", "google"],
      "roles": ["user", "creator", "admin"],
      "features": {
        "emailVerification": true,
        "passwordReset": true,
        "rememberMe": true,
        "twoFactor": false
      }
    },

    "admin": {
      "enabled": true,
      "path": "/admin",
      "permissions": "admin",
      "tables": ["users", "campaigns", "submissions"],
      "features": {
        "search": true,
        "filters": true,
        "export": true,
        "bulkActions": true,
        "auditLog": false
      },
      "ui": {
        "layout": "sidebar",
        "theme": "from-branding"
      }
    },

    "payments": {
      "enabled": true,
      "providers": ["stripe", "paypal"],
      "currency": "usd",
      "plans": [
        {
          "id": "free",
          "name": "Free",
          "price": 0,
          "features": ["basic-access", "1-campaign"]
        },
        {
          "id": "pro",
          "name": "Pro",
          "price": 29,
          "interval": "month",
          "features": ["unlimited-campaigns", "advanced-analytics", "priority-support"]
        }
      ],
      "features": {
        "subscriptions": true,
        "oneTime": true,
        "webhooks": true,
        "trials": false
      }
    },

    "guards": {
      "enabled": true,
      "routes": {
        "/admin": { "role": "admin" },
        "/creator": { "role": "creator" },
        "/premium": { "subscription": "pro" }
      },
      "features": {
        "advanced-analytics": { "subscription": "pro" },
        "unlimited-campaigns": { "subscription": "pro" }
      },
      "paywalls": {
        "soft": ["advanced-analytics"],
        "hard": ["unlimited-campaigns"]
      }
    },

    "pwa": {
      "enabled": true,
      "name": "from-prd",
      "shortName": "from-prd",
      "description": "from-prd",
      "themeColor": "from-branding",
      "backgroundColor": "from-branding",
      "features": {
        "offline": true,
        "notifications": false,
        "installPrompt": true
      }
    },

    "pages": {
      "enabled": true,
      "features": {
        "loading": true,
        "error": true,
        "notFound": true,
        "emptyStates": true
      },
      "style": "from-branding"
    },

    "responsive": {
      "enabled": true,
      "breakpoints": "tailwind-default",
      "features": {
        "mobileNav": true,
        "tabletOptimizations": true
      }
    }
  },

  "customization": {
    "overrides": {
      "colors": "from-branding",
      "fonts": "from-branding",
      "spacing": "default"
    },
    "additionalComponents": []
  }
}
```

## Template System

### Template Structure

```
src/scaffold/templates/
├── auth-system/
│   ├── template.json             [Template metadata]
│   ├── files/                    [Template files]
│   │   ├── pages/
│   │   ├── components/
│   │   ├── lib/
│   │   └── api/
│   └── generator.ts              [Custom generation logic]
├── admin-dashboard/
│   ├── template.json
│   ├── files/
│   └── generator.ts
├── payment-integration/
│   ├── template.json
│   ├── files/
│   └── generator.ts
└── ...
```

### Template Metadata (`template.json`)

```json
{
  "name": "auth-system",
  "version": "1.0.0",
  "description": "Complete authentication system with RBAC",
  "author": "MyContext CLI",

  "requires": {
    "framework": ["nextjs"],
    "database": ["instantdb"],
    "ui": ["shadcn"]
  },

  "dependencies": {
    "packages": [
      "@instantdb/react",
      "bcryptjs",
      "jsonwebtoken"
    ],
    "devPackages": [
      "@types/bcryptjs",
      "@types/jsonwebtoken"
    ]
  },

  "files": [
    {
      "source": "pages/login.tsx.template",
      "destination": "app/(auth)/login/page.tsx",
      "type": "page"
    },
    {
      "source": "components/auth/login-form.tsx.template",
      "destination": "components/auth/login-form.tsx",
      "type": "component"
    }
  ],

  "variables": {
    "roles": {
      "source": "context.schema.roles",
      "default": ["user", "admin"]
    },
    "branding": {
      "source": "context.branding",
      "default": {}
    }
  },

  "postGeneration": {
    "commands": [
      "pnpm install",
      "pnpm format"
    ],
    "instructions": [
      "Set INSTANTDB_APP_ID in .env.local",
      "Update auth configuration in lib/auth.ts",
      "Test login flow at /login"
    ]
  }
}
```

### Template Variables

Templates use variables that are extracted from MyContext files:

```typescript
interface TemplateVariables {
  // From PRD
  projectName: string;
  projectDescription: string;

  // From Schema
  tables: InstantDBTable[];
  roles: string[];
  permissions: Permission[];

  // From Branding
  colors: ColorPalette;
  fonts: FontSystem;
  logo: string;

  // From Config
  features: EnabledFeatures;
  providers: string[];

  // Computed
  timestamp: string;
  author: string;
}
```

### Example Template File

**File**: `templates/auth-system/files/components/auth/login-form.tsx.template`

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        style={{
          backgroundColor: '{{branding.colors.primary}}',
          color: '{{branding.colors.primaryForeground}}'
        }}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

Variables like `{{branding.colors.primary}}` are replaced during generation.

## Implementation Plan

### Reference Project: Skika

**Why Skika?**
- Platform for musicians + UGC creators
- Needs ALL scaffold features:
  - Auth (musicians, creators, admin)
  - Admin dashboard (manage campaigns, submissions)
  - Payments (PayPal for campaign budgets)
  - Guards (creator-only features, premium features)
  - Complex workflows (perfect for extracting patterns)

**Skika Tech Stack**:
- Next.js + shadcn
- InstantDB
- PayPal payments
- TikTok API integration
- ElevenLabs UI patterns

**Learning Process**:
1. Build Skika from scratch with MyContext CLI
2. Document every reusable pattern
3. Extract into templates
4. Create scaffold system
5. Test by scaffolding a new project

### Phase 1: Skika Foundation (Week 1)

**Goal**: Document and build Skika to 50% completion

**Tasks**:
- [ ] Create Skika project documentation
- [ ] Initialize with MyContext CLI
- [ ] Build auth system (document patterns)
- [ ] Build basic admin dashboard (document patterns)
- [ ] Set up InstantDB schema
- [ ] Document all patterns discovered

**Deliverables**:
- Working auth system in Skika
- Initial admin dashboard
- Pattern documentation

### Phase 2: Skika Completion (Week 2)

**Goal**: Complete Skika with all non-negotiables

**Tasks**:
- [ ] Build payment integration (PayPal)
- [ ] Create auth guards and paywalls
- [ ] Add PWA configuration
- [ ] Build loading/error/empty states
- [ ] Test responsive design
- [ ] Document all patterns

**Deliverables**:
- Complete Skika application
- Comprehensive pattern library
- Template structure defined

### Phase 3: Template Extraction (Week 3)

**Goal**: Extract reusable templates from Skika

**Tasks**:
- [ ] Create template structure
- [ ] Extract auth system template
- [ ] Extract admin dashboard template
- [ ] Extract payment integration template
- [ ] Extract guards/paywalls template
- [ ] Extract PWA config template
- [ ] Extract pages template
- [ ] Create template metadata files

**Deliverables**:
- 6+ working templates
- Template metadata
- Template variables defined

### Phase 4: Scaffold Engine (Week 4)

**Goal**: Build the scaffold code generation engine

**Tasks**:
- [ ] Create context reader
- [ ] Create config processor
- [ ] Create template engine
- [ ] Create code generator
- [ ] Create file writer
- [ ] Add validation and safety checks
- [ ] Write unit tests

**Deliverables**:
- Working scaffold engine
- Unit tests passing
- CLI command structure

### Phase 5: CLI Integration (Week 5)

**Goal**: Integrate scaffold into MyContext CLI

**Tasks**:
- [ ] Add `mycontext scaffold` command
- [ ] Add config file support
- [ ] Add feature flags
- [ ] Add dry-run mode
- [ ] Add update mode
- [ ] Create comprehensive error handling
- [ ] Write integration tests

**Deliverables**:
- `mycontext scaffold` command working
- Integration tests passing
- Documentation

### Phase 6: Testing & Documentation (Week 6)

**Goal**: Test thoroughly and document everything

**Tasks**:
- [ ] Test scaffolding multiple projects
- [ ] Test each feature independently
- [ ] Test different configurations
- [ ] Write comprehensive documentation
- [ ] Create video tutorials
- [ ] Create example projects
- [ ] Gather feedback

**Deliverables**:
- Tested scaffold system
- Complete documentation
- Example projects
- Tutorial videos

## CLI Commands

### Main Command

```bash
mycontext scaffold [options]
```

### Options

```
--features <features>     Comma-separated list of features to scaffold
                         Options: auth, admin, payments, guards, pwa, pages, all
                         Default: all

--config <path>          Path to custom scaffold config file
                         Default: .mycontext/scaffold-config.json

--dry-run               Show what would be generated without creating files

--force                 Overwrite existing files (use with caution)

--update                Update existing scaffold (preserves custom code)

--template <name>       Use a specific template version
                         Options: default, minimal, enterprise

--output <dir>          Custom output directory
                         Default: current directory

--skip-install          Don't run npm/pnpm install after generation

--verbose               Show detailed generation logs
```

### Examples

```bash
# Full scaffold with default config
mycontext scaffold

# Scaffold specific features
mycontext scaffold --features auth,admin,payments

# Use custom config
mycontext scaffold --config ./my-config.json

# Dry run to preview
mycontext scaffold --dry-run --features all

# Update existing scaffold
mycontext scaffold --update --features auth

# Minimal template
mycontext scaffold --template minimal

# Verbose output
mycontext scaffold --verbose --features all
```

## Integration with Existing MyContext Flow

### Current Flow

```bash
# Step 1: Initialize
mycontext init my-app
cd my-app

# Step 2: Generate context
mycontext generate context --full

# Step 3: Review context
# - Read .mycontext/01-prd.md
# - Review .mycontext/instant-db-schema.ts

# Step 4: Manual coding (5-7 days)
# - Build auth
# - Build admin
# - Build payments
# - etc...
```

### Enhanced Flow with Scaffold

```bash
# Step 1: Initialize
mycontext init my-app
cd my-app

# Step 2: Generate context
mycontext generate context --full

# Step 3: Review and customize
# - Edit .mycontext/01-prd.md if needed
# - Customize .mycontext/instant-db-schema.ts
# - Create .mycontext/scaffold-config.json

# Step 4: Scaffold (5 minutes)
mycontext scaffold --features all

# Step 5: Install dependencies
pnpm install

# Step 6: Configure environment
# - Set up API keys in .env.local
# - Configure payment providers

# Step 7: Run and test
pnpm dev

# Step 8: Focus on unique features
# - Scaffold handles non-negotiables
# - You build unique business logic only
```

**Time Saved**: 5-7 days → 10-15 minutes

## Success Metrics

### Performance Metrics

- **Generation Speed**: < 2 minutes for full scaffold
- **Code Quality**: ESLint/Prettier passing, no TypeScript errors
- **Test Coverage**: Generated code has 80%+ test coverage
- **Bundle Size**: Generated code adds < 100KB to bundle

### User Metrics

- **Time Saved**: 5-7 days → 10-15 minutes (40x faster)
- **Adoption Rate**: 60% of MyContext users use scaffold within 3 months
- **Satisfaction**: 4.5+ stars for scaffold feature
- **Repeat Usage**: Users scaffold 3+ projects in first 6 months

### Quality Metrics

- **Code Maintainability**: Generated code is readable, documented, testable
- **Customization**: 90% of users can customize without modifying templates
- **Bug Rate**: < 5 reported bugs per 1000 scaffolds
- **Update Success**: 95% success rate for scaffold updates

## Technical Challenges & Solutions

### Challenge 1: Schema Complexity

**Problem**: InstantDB schemas can be very complex with relationships, permissions, etc.

**Solution**:
- Parse schema AST to understand structure
- Generate type-safe queries
- Create admin UI that respects permissions
- Handle relationships intelligently

### Challenge 2: Customization vs Consistency

**Problem**: Balance between "works out of box" and "flexible for my needs"

**Solution**:
- Layer system: core (can't modify) + extensions (customizable)
- "Safe zones" in generated code for user modifications
- Update strategy that preserves user changes
- Template overrides for advanced users

### Challenge 3: Template Maintenance

**Problem**: Keeping templates updated with latest framework/library versions

**Solution**:
- Version templates separately from CLI
- Test suite that runs against multiple versions
- Community contributions for template updates
- Automated dependency updates with tests

### Challenge 4: Generated Code Quality

**Problem**: Ensuring generated code is production-ready

**Solution**:
- All templates include tests
- Linting and formatting as part of generation
- Type safety enforced
- Security best practices baked in
- Code review process for template changes

### Challenge 5: Updates Without Overwriting

**Problem**: Updating scaffold without overwriting user changes

**Solution**:
- Git-aware: detect user modifications
- Comment markers: `// SCAFFOLD: START` and `// SCAFFOLD: END`
- Merge strategy: preserve user code, update scaffold code
- Interactive update mode: show diffs, let user choose

## Comparison with Alternatives

### vs Manual Coding

| Aspect | Manual | Scaffold |
|--------|--------|----------|
| Time | 5-7 days | 5 minutes |
| Consistency | Varies | Always consistent |
| Best practices | Depends on dev | Built-in |
| Testing | Often skipped | Included |
| Documentation | Rarely complete | Auto-generated |

### vs Generic Starters (T3 Stack, Next.js templates)

| Aspect | Generic Starters | MyContext Scaffold |
|--------|------------------|-------------------|
| Context-aware | ❌ No | ✅ Yes |
| Schema-based | ❌ No | ✅ Yes |
| Branded | ❌ No | ✅ Yes |
| Updated | One-time | Can update |
| Customization | Start from scratch | Config-driven |

### vs Code Generators (Prisma, GraphQL Codegen)

| Aspect | Code Generators | MyContext Scaffold |
|--------|----------------|-------------------|
| Scope | Single layer | Full-stack |
| UI Components | ❌ No | ✅ Yes |
| Business Logic | ❌ No | ✅ Yes |
| Pages/Routing | ❌ No | ✅ Yes |
| Auth | ❌ No | ✅ Yes |

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **AI-Powered Customization**
   - Natural language: "Make the login page modern and minimalist"
   - AI adjusts templates based on description

2. **Visual Scaffold Builder**
   - Web UI to configure scaffold visually
   - Preview generated code
   - Drag-and-drop features

3. **Template Marketplace**
   - Community templates
   - Industry-specific templates
   - Premium templates

4. **Multi-Framework Support**
   - React (Vite)
   - Vue + Nuxt
   - Svelte + SvelteKit
   - Remix

5. **Database Adapters**
   - Supabase
   - Firebase
   - PlanetScale
   - Neon

6. **Advanced Features**
   - Multi-tenancy support
   - Internationalization (i18n)
   - Real-time features
   - WebSocket integration

7. **Testing Scaffold**
   - Generate E2E tests with Playwright
   - Generate unit tests with Vitest
   - Integration tests
   - Visual regression tests

8. **Deployment Scaffold**
   - Vercel configuration
   - Docker setup
   - CI/CD pipelines
   - Monitoring setup

## Related Documentation

- [Skika Reference Project](../reference-projects/skika.md) - The learning project
- [Flow Testing MCP Server](./06-flow-testing-mcp.md) - Test scaffolded apps
- [Context MCP Server](./01-mcp-server.md) - Query context for scaffolding
- [Implementation Priority](./implementation-priority.md) - Development timeline

## Getting Started

### For Users

1. **Try the Scaffold**:
   ```bash
   mycontext scaffold --dry-run
   ```

2. **Customize Config**:
   - Edit `.mycontext/scaffold-config.json`
   - Choose features you need

3. **Generate Code**:
   ```bash
   mycontext scaffold --features all
   ```

4. **Build Your App**:
   - Scaffold handles non-negotiables
   - Focus on unique features

### For Contributors

1. **Study Skika**: Understand the reference project
2. **Review Templates**: Look at template structure
3. **Add Templates**: Create new templates
4. **Test Thoroughly**: Test with real projects
5. **Improve Docs**: Help improve documentation

---

**Status**: 📋 Planned
**Priority**: P1 (High Impact)
**Effort**: 6 weeks
**Dependencies**: Skika Reference Project, InstantDB Integration
**Next Steps**: Build Skika, extract patterns, create templates
**Last Updated**: February 7, 2026
