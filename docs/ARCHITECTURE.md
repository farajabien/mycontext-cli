# MyContext Architecture: Natural Language Compiler

## Overview

MyContext is a **deterministic compiler** that transforms natural language specifications into complete, production-ready Next.js applications. Unlike traditional AI code generators that use LLMs to write code directly, MyContext uses LLMs only for intent parsing and validation, while all code generation is performed by deterministic script templates.

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    User (Natural Language)                   │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Agent (Question Asker & Intent Parser)            │
│  - Uses LLM to parse user intent                             │
│  - Generates clarifying questions                            │
│  - Builds ASL (Abstract Specification Language)              │
│  - **Does NOT write code**                                   │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Planner (Validator & Orchestrator)                │
│  - Validates ASL against context.json                        │
│  - Detects incomplete specifications                         │
│  - Generates diff proposals                                  │
│  - Requires user approval for all changes                    │
│  - Ensures 100% completeness before generation               │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Script Engine (Deterministic Generator)           │
│  - Reads complete manifest JSON                              │
│  - Executes templated file generators                        │
│  - Scaffolds pages, components, hooks, layouts               │
│  - Wires auth, permissions, routes                           │
│  - **Fully deterministic (no LLM involved)**                 │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Verifier (Quality Gate)                           │
│  - TypeScript type checking                                  │
│  - Schema drift detection                                    │
│  - Build verification                                        │
│  - Lint checks                                               │
│  - Doctor diagnostics                                        │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: Brain (Canonical State / Single Source of Truth)  │
│  - context.json: Master state                                │
│  - components_registry.json: Component catalog               │
│  - types_registry.json: Type definitions                     │
│  - permissions_manifest.json: RBAC rules                     │
│  - design_manifest.json: Design tokens & styles              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Agent Layer (Intent Parser)

**Purpose:** Convert natural language to structured intent (ASL)

**Responsibilities:**
- Parse user input: "Build a blog with authentication"
- Extract entities, features, relationships
- Generate clarifying questions:
  - "Which authentication provider? Email/password or OAuth?"
  - "What roles do you need? (admin, author, reader?)"
  - "What fields should a blog post have?"
- Build Abstract Specification Language (ASL) JSON

**Key Insight:** LLM only interprets intent, it does NOT write code.

**Example ASL Output:**
```json
{
  "project": {
    "name": "my-blog",
    "framework": "nextjs",
    "backend": "instantdb"
  },
  "entities": {
    "User": {
      "fields": [
        { "name": "email", "type": "string", "required": true },
        { "name": "password_hash", "type": "string", "required": true },
        { "name": "role", "type": "string", "required": true }
      ]
    },
    "Post": {
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "content", "type": "string", "required": true },
        { "name": "author_id", "type": "string", "required": true },
        { "name": "published", "type": "boolean", "required": false }
      ]
    }
  },
  "auth": {
    "provider": "email",
    "roles": ["admin", "author", "reader"]
  },
  "pages": [
    { "path": "/", "component": "HomePage", "public": true },
    { "path": "/posts", "component": "PostsPage", "guards": ["authenticated"] },
    { "path": "/posts/new", "component": "NewPostPage", "guards": ["authenticated"], "permissions": ["create:posts"] }
  ]
}
```

---

### 2. Planner Layer (Validator)

**Purpose:** Ensure ASL is 100% complete and valid

**Responsibilities:**
- Validate ASL against existing context.json
- Detect missing information:
  - Incomplete entity schemas
  - Missing page layouts
  - Undefined auth flows
- Generate diff proposals showing what will change
- Query user for approval
- **STOP compilation if specification is incomplete**

**Validation Checks:**
- ✅ All entities have complete field definitions
- ✅ All pages have layouts and guards defined
- ✅ All auth flows are specified (login, register, logout)
- ✅ All permissions are mapped to roles
- ✅ All relationships are bidirectional

**Diff Approval Workflow:**
```
Planner: "I will generate the following:"
  - Create instant.schema.ts with User, Post entities
  - Create app/(auth)/login/page.tsx
  - Create app/(auth)/register/page.tsx
  - Create app/(dashboard)/posts/page.tsx
  - Create components/auth/LoginForm.tsx
  - Create components/posts/PostCard.tsx
  - Create actions/auth.ts with login, register, logout
  - Create middleware.ts with auth guard

User: [Approve / Modify / Cancel]
```

---

### 3. Script Engine (Deterministic Generator)

**Purpose:** Generate code from complete manifest

**Responsibilities:**
- Read finalized ASL + manifest
- Execute script generators in sequence:
  1. `generate-schema.ts` → instant.schema.ts
  2. `generate-types.ts` → types/schema.ts (Insert, WithRelations)
  3. `generate-pages.ts` → app/**/*.tsx
  4. `generate-components.ts` → components/**/*.tsx
  5. `generate-actions.ts` → actions/*.ts
  6. `generate-auth.ts` → middleware.ts, auth guards
  7. `generate-registry.ts` → components_registry.json

**Key Insight:** Scripts are templated, deterministic, and LLM-free.

**Example Generator (generate-page.ts):**
```typescript
interface PageSpec {
  path: string;
  component: string;
  guards: string[];
  permissions: string[];
  layout?: string;
}

function generatePage(spec: PageSpec): string {
  const guards = spec.guards.map(g => `with${capitalize(g)}Guard`).join('');
  const permissionChecks = spec.permissions.length > 0
    ? `if (!hasPermissions(${JSON.stringify(spec.permissions)})) return <Forbidden />;`
    : '';

  return `
import { ${guards} } from '@/lib/guards';
import { hasPermissions } from '@/lib/permissions';

export default ${guards}(async function ${spec.component}() {
  ${permissionChecks}

  return (
    <div>
      <h1>${spec.component}</h1>
      {/* Component from registry */}
    </div>
  );
});
  `.trim();
}
```

---

### 4. Verifier Layer (Quality Gate)

**Purpose:** Ensure generated code is production-ready

**Checks:**
1. **TypeScript Compilation**
   ```bash
   tsc --noEmit
   ```
   Catches: Type errors, missing imports, invalid props

2. **Schema Drift Detection** (NEW!)
   ```bash
   mycontext doctor
   ```
   Catches:
   - Field accesses that don't match schema (e.g., `payment.payment_method` when schema has `payment.method`)
   - `as any` casts
   - Unknown[] transaction arrays
   - Duplicate type declarations

3. **Build Verification**
   ```bash
   pnpm build
   ```
   Catches: Build failures, missing dependencies

4. **Lint Checks**
   ```bash
   pnpm lint
   ```
   Catches: Code style issues, unused variables

**Failure Handling:**
- If verification fails → Report to user
- Update script templates for future projects (iterative refinement)
- User can fix manually or regenerate after fixing manifest

---

### 5. Brain Layer (Canonical State)

**Purpose:** Single source of truth for project state

**Files:**

#### **context.json** (Master Brain)
```json
{
  "name": "my-blog",
  "framework": "nextjs",
  "backend": "instantdb",
  "entities": { ... },
  "pages": [ ... ],
  "components": [ ... ],
  "auth": { ... },
  "brain": {
    "memory": {
      "lastSync": "2026-02-22T10:30:00Z",
      "lastScaffold": "2026-02-22T09:00:00Z"
    }
  }
}
```

#### **components_registry.json** (Component Catalog)
```json
{
  "BlogPostCard": {
    "path": "src/components/blog/PostCard.tsx",
    "props": [
      { "name": "post", "type": "Post" },
      { "name": "variant", "type": "'mobile' | 'desktop'" }
    ],
    "dependencies": ["Card", "Avatar", "Button"],
    "generated_from": "manifest.pages.posts"
  },
  "LoginForm": {
    "path": "src/components/auth/LoginForm.tsx",
    "props": [
      { "name": "onSuccess", "type": "() => void" }
    ],
    "dependencies": ["Form", "Input", "Button"],
    "generated_from": "manifest.auth.login"
  }
}
```

#### **types_registry.json** (Type Definitions)
```json
{
  "Post": {
    "source": "instant.schema.ts",
    "fields": [
      { "name": "id", "type": "string" },
      { "name": "title", "type": "string" },
      { "name": "content", "type": "string" },
      { "name": "author_id", "type": "string" }
    ],
    "relations": [
      { "name": "author", "type": "User", "cardinality": "one" },
      { "name": "comments", "type": "Comment", "cardinality": "many" }
    ],
    "generated_types": [
      "PostInsert (Omit<Post, 'id' | 'created_at'>)",
      "PostWithRelations (Post & { author?: User; comments?: Comment[] })"
    ]
  }
}
```

#### **permissions_manifest.json** (RBAC Rules)
```json
{
  "roles": ["admin", "author", "reader"],
  "permissions": [
    {
      "role": "admin",
      "actions": ["create", "read", "update", "delete"],
      "resources": ["Post", "User", "Comment"]
    },
    {
      "role": "author",
      "actions": ["create", "read", "update", "delete"],
      "resources": ["Post"],
      "condition": "own"
    },
    {
      "role": "reader",
      "actions": ["read"],
      "resources": ["Post", "Comment"]
    }
  ],
  "guards": [
    { "page": "/posts/new", "requires": ["authenticated", "role:author|admin"] },
    { "page": "/admin", "requires": ["authenticated", "role:admin"] }
  ]
}
```

#### **design_manifest.json** (Design Tokens)
```json
{
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#8b5cf6"
  },
  "spacing": {
    "unit": 4
  },
  "components": {
    "Card": {
      "variants": ["default", "outlined", "elevated"]
    }
  }
}
```

---

## Data Flow: Complete Example

### User Input
```
"Build a blog with user authentication. Authors can create and edit posts. Readers can view and comment."
```

### Step 1: Agent Parsing
Agent asks clarifying questions:
1. "Which auth provider? (email/password, OAuth GitHub, OAuth Google)"
2. "What fields should a Post have? (title, content, author, published date?)"
3. "Should comments be nested or flat?"
4. "Do you want markdown support for post content?"

User answers → Agent builds ASL

### Step 2: Planner Validation
Planner checks:
- ✅ User entity defined with email, password_hash, role
- ✅ Post entity defined with title, content, author_id, published
- ✅ Comment entity defined with content, post_id, author_id
- ✅ Auth pages defined (login, register)
- ✅ Post CRUD pages defined with guards
- ✅ Permissions mapped (author can edit own posts, admin can edit all)

Planner shows diff → User approves

### Step 3: Script Engine Generation
Scripts execute in order:
1. **generate-schema.ts**
   - Outputs: `instant.schema.ts` with User, Post, Comment entities

2. **generate-types.ts**
   - Outputs: `types/schema.ts` with:
     - `User`, `Post`, `Comment` interfaces
     - `UserInsert`, `PostInsert`, `CommentInsert` types
     - `PostWithRelations` (includes author, comments)

3. **generate-pages.ts**
   - Outputs:
     - `app/(auth)/login/page.tsx`
     - `app/(auth)/register/page.tsx`
     - `app/(dashboard)/posts/page.tsx` (with auth guard)
     - `app/(dashboard)/posts/[id]/page.tsx`
     - `app/(dashboard)/posts/new/page.tsx` (with permission check)

4. **generate-components.ts**
   - Outputs:
     - `components/auth/LoginForm.tsx`
     - `components/auth/RegisterForm.tsx`
     - `components/posts/PostCard.tsx`
     - `components/posts/PostList.tsx`
     - `components/posts/PostForm.tsx`
     - `components/comments/CommentList.tsx`

5. **generate-actions.ts**
   - Outputs:
     - `actions/auth.ts` (login, register, logout)
     - `actions/posts.ts` (createPost, updatePost, deletePost)
     - `actions/comments.ts` (createComment, deleteComment)

6. **generate-auth.ts**
   - Outputs:
     - `middleware.ts` (route protection)
     - `lib/guards.ts` (withAuthGuard, withRoleGuard)
     - `lib/permissions.ts` (hasPermission, canEdit)

### Step 4: Verifier Checks
```bash
$ mycontext doctor
✓ TypeScript compilation passed
✓ Schema drift check passed
✓ No duplicate type declarations
✓ Build successful
```

### Step 5: Brain Update
- Updates `context.json` with generated files
- Populates `components_registry.json` with all components
- Stores permissions in `permissions_manifest.json`

---

## Progressive Testing & Iterative Refinement

### Testing Phases

#### **Phase 1: Todo App** (Baseline)
- **Complexity:** Minimal
- **Goal:** Prove deterministic scaffolding works
- **Entities:** Task (id, title, completed)
- **Expected:** 100% scaffolded, clean build, 0 manual edits

#### **Phase 2: Blog** (Auth + Relations)
- **Complexity:** Medium
- **Goal:** Prove auth guards and RBAC work
- **Entities:** User, Post, Comment
- **Expected:** Auth flows wired, permissions enforced

#### **Phase 3: E-commerce** (Complex State)
- **Complexity:** High
- **Goal:** Prove complex state management
- **Entities:** User, Product, Order, Payment
- **Expected:** Shopping cart, checkout, webhooks wired

#### **Phase 4: SaaS Dashboard** (Multi-tenant)
- **Complexity:** Enterprise
- **Goal:** Prove enterprise-grade scaffolding
- **Entities:** Tenant, User, Subscription, Feature
- **Expected:** Multi-tenancy, real-time, billing wired

### Refinement Loop

After each project:
1. Identify failed generations
2. Update script templates
3. Add new validation checks
4. Next project benefits automatically

**Goal:** By Project 20, scaffolding is 99% correct with minimal manual intervention.

---

## Key Differentiators

| Traditional AI Generators | MyContext Compiler |
|---------------------------|-------------------|
| LLM writes code directly | LLM only parses intent |
| Trial-and-error generation | Deterministic script execution |
| Unpredictable output | Output matches manifest exactly |
| No validation before generation | 100% spec validation required |
| Hallucinations common | Zero hallucination (no LLM in generation) |
| Hard to debug | Transparent script templates |
| Doesn't improve over time | Templates refine with each project |

---

## Technology Stack

- **TypeScript:** Type-safe script templates
- **Next.js 15+:** App Router, Server Components
- **InstantDB:** Realtime database with schema
- **shadCN:** UI component library
- **Zod:** Runtime validation
- **Commander.js:** CLI framework
- **Chalk:** Terminal styling
- **Ora:** Spinners and progress

---

## Future Enhancements

1. **Visual Schema Builder:** GUI for ASL definition
2. **Template Marketplace:** Community-contributed script templates
3. **Multi-framework Support:** React, Vue, Svelte
4. **Backend Flexibility:** Supabase, Firebase, Prisma
5. **Incremental Updates:** Modify existing projects without breaking context
6. **Version Control:** Manifest versioning and rollback
7. **Testing Generation:** Auto-generate unit and integration tests
8. **API Documentation:** Auto-generate OpenAPI specs from actions

---

## Conclusion

MyContext is not just a tool—it's a paradigm shift. By separating natural language understanding from code generation, we achieve:
- **Determinism:** Same manifest always produces same output
- **Transparency:** Script templates are readable and debuggable
- **Reliability:** No hallucinations, no guessing
- **Scalability:** Templates improve over time
- **Speed:** One "mega script" scaffolds entire projects

This is the future of full-stack development.
