# MyContext Compiler Specification

## Overview

This document defines the **input/output contract** for the MyContext compiler, specifying how natural language is transformed into a complete Next.js application through deterministic script generation.

---

## Input: Natural Language Specification

### Example 1: Simple Todo App
```
"Build a todo app where users can create, edit, and delete tasks."
```

### Example 2: Blog with Auth
```
"Build a blog with user authentication. Authors can create and edit posts.
Readers can view posts and leave comments. Admins can moderate everything."
```

### Example 3: E-commerce Store
```
"Build an e-commerce store with products, shopping cart, and checkout.
Customers can browse products, add to cart, and pay with Stripe.
Admins can manage inventory and view orders."
```

---

## Output: Complete Next.js Project Structure

### Example Output (Blog with Auth)

```
my-blog/
├── .mycontext/
│   ├── context.json              # Master brain (canonical state / SSOT)
│   ├── 01-prd.md                 # Read-only export: PRD
│   ├── 01a-features.md           # Read-only export: Features
│   ├── 02-types-guide.md         # Read-only export: Types
│   └── 03-brand-guide.md         # Read-only export: Brand
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx      # Generated: Login page
│   │   │   ├── register/
│   │   │   │   └── page.tsx      # Generated: Register page
│   │   │   └── layout.tsx        # Generated: Auth layout
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── posts/
│   │   │   │   ├── page.tsx      # Generated: Posts list (with auth guard)
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx  # Generated: Post detail
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx  # Generated: Edit post (permission check)
│   │   │   │   └── new/
│   │   │   │       └── page.tsx  # Generated: Create post (permission check)
│   │   │   │
│   │   │   └── layout.tsx        # Generated: Dashboard layout (auth guard)
│   │   │
│   │   └── layout.tsx            # Generated: Root layout
│   │   └── page.tsx              # Generated: Home page
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx     # Generated: Login form component
│   │   │   └── RegisterForm.tsx  # Generated: Register form component
│   │   │
│   │   ├── posts/
│   │   │   ├── PostCard.tsx      # Generated: Post card component
│   │   │   ├── PostList.tsx      # Generated: Post list component
│   │   │   └── PostForm.tsx      # Generated: Post form component
│   │   │
│   │   ├── comments/
│   │   │   ├── CommentList.tsx   # Generated: Comment list
│   │   │   └── CommentForm.tsx   # Generated: Comment form
│   │   │
│   │   └── ui/                   # shadCN components (pre-installed)
│   │       ├── card.tsx
│   │       ├── button.tsx
│   │       ├── form.tsx
│   │       └── input.tsx
│   │
│   ├── actions/
│   │   ├── auth.ts               # Generated: Auth actions (login, register, logout)
│   │   ├── posts.ts              # Generated: Post actions (CRUD)
│   │   └── comments.ts           # Generated: Comment actions (create, delete)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts            # Generated: Auth hook
│   │   ├── usePosts.ts           # Generated: Posts data hook
│   │   └── useComments.ts        # Generated: Comments data hook
│   │
│   ├── lib/
│   │   ├── guards.ts             # Generated: Auth guards (withAuthGuard, withRoleGuard)
│   │   ├── permissions.ts        # Generated: Permission checks (hasPermission, canEdit)
│   │   └── instant.ts            # Generated: InstantDB client
│   │
│   └── types/
│       └── schema.ts             # Generated: TypeScript types from schema
│
├── instant.schema.ts             # Generated: InstantDB schema (entities, links)
├── middleware.ts                 # Generated: Route protection middleware
├── package.json                  # Updated: Dependencies added
├── tsconfig.json                 # Pre-configured
└── tailwind.config.ts            # Pre-configured
```

---

## Compilation Pipeline

### Step 1: Tokenization & ASL Generation (Agent Layer)

**Input:** Natural language
```
"Build a blog with user authentication. Authors can create posts."
```

**Agent Questions:**
1. Which auth provider?
   - [ ] Email/password
   - [ ] OAuth GitHub
   - [ ] OAuth Google

2. What fields should a Post have?
   - Suggested: title, content, author_id, published_at
   - User can add: tags, featured_image, slug, etc.

3. Should posts have draft/published states?
   - [ ] Yes
   - [ ] No

4. Who can create posts?
   - [ ] Only admins
   - [ ] Authors and admins
   - [ ] All authenticated users

**Output:** The Living Brain (`context.json`)
```json
{
  "project": {
    "name": "my-blog",
    "framework": "nextjs",
    "backend": "instantdb",
    "version": "1.0.0"
  },
  "entities": {
    "User": {
      "fields": [
        { "name": "id", "type": "id", "auto": true },
        { "name": "email", "type": "string", "required": true, "unique": true },
        { "name": "password_hash", "type": "string", "required": true },
        { "name": "role", "type": "string", "required": true, "default": "reader" },
        { "name": "created_at", "type": "date", "auto": true }
      ]
    },
    "Post": {
      "fields": [
        { "name": "id", "type": "id", "auto": true },
        { "name": "title", "type": "string", "required": true },
        { "name": "content", "type": "string", "required": true },
        { "name": "published", "type": "boolean", "default": false },
        { "name": "author_id", "type": "string", "required": true },
        { "name": "created_at", "type": "date", "auto": true },
        { "name": "updated_at", "type": "date", "auto": true }
      ],
      "indexes": ["author_id", "published"]
    },
    "Comment": {
      "fields": [
        { "name": "id", "type": "id", "auto": true },
        { "name": "content", "type": "string", "required": true },
        { "name": "post_id", "type": "string", "required": true },
        { "name": "author_id", "type": "string", "required": true },
        { "name": "created_at", "type": "date", "auto": true }
      ],
      "indexes": ["post_id"]
    }
  },
  "relationships": [
    {
      "name": "post_author",
      "from": "Post",
      "to": "User",
      "type": "many-to-one",
      "field": "author_id"
    },
    {
      "name": "post_comments",
      "from": "Comment",
      "to": "Post",
      "type": "many-to-one",
      "field": "post_id"
    }
  ],
  "auth": {
    "provider": "email",
    "roles": ["admin", "author", "reader"],
    "default_role": "reader"
  },
  "permissions": [
    {
      "role": "admin",
      "resource": "*",
      "actions": ["create", "read", "update", "delete"]
    },
    {
      "role": "author",
      "resource": "Post",
      "actions": ["create", "read", "update", "delete"],
      "condition": "own"
    },
    {
      "role": "reader",
      "resource": "Post",
      "actions": ["read"]
    }
  ],
  "pages": [
    { "path": "/", "component": "HomePage", "public": true },
    { "path": "/login", "component": "LoginPage", "public": true },
    { "path": "/register", "component": "RegisterPage", "public": true },
    { "path": "/posts", "component": "PostsPage", "guards": ["authenticated"] },
    { "path": "/posts/[id]", "component": "PostDetailPage", "guards": ["authenticated"] },
    { "path": "/posts/new", "component": "NewPostPage", "guards": ["authenticated"], "permissions": ["create:Post"] },
    { "path": "/posts/[id]/edit", "component": "EditPostPage", "guards": ["authenticated"], "permissions": ["update:Post"] }
  ],
  "brand": {
    "colors": { "primary": "#3b82f6", "secondary": "#6366f1" },
    "typography": { "sans": "Inter" }
  }
}
```

---

### Step 2: Validation (Planner Layer)

**Validation Checklist:**
- [x] All entities have complete field definitions
- [x] All required fields marked
- [x] All relationships defined
- [x] Auth provider specified
- [x] Roles defined
- [x] Permissions mapped
- [x] Pages mapped to components
- [x] Guards and permissions assigned

**Diff Preview:**
```
The following will be generated:

Schema:
  + instant.schema.ts (3 entities: User, Post, Comment)

Types:
  + types/schema.ts (User, Post, Comment, UserInsert, PostInsert, PostWithRelations, etc.)

Pages (7 files):
  + app/page.tsx
  + app/(auth)/login/page.tsx
  + app/(auth)/register/page.tsx
  + app/(dashboard)/posts/page.tsx
  + app/(dashboard)/posts/[id]/page.tsx
  + app/(dashboard)/posts/new/page.tsx
  + app/(dashboard)/posts/[id]/edit/page.tsx

Components (7 files):
  + components/auth/LoginForm.tsx
  + components/auth/RegisterForm.tsx
  + components/posts/PostCard.tsx
  + components/posts/PostList.tsx
  + components/posts/PostForm.tsx
  + components/comments/CommentList.tsx
  + components/comments/CommentForm.tsx

Actions (3 files):
  + actions/auth.ts (login, register, logout)
  + actions/posts.ts (createPost, updatePost, deletePost, getPost, getPosts)
  + actions/comments.ts (createComment, deleteComment, getComments)

Auth (3 files):
  + lib/guards.ts (withAuthGuard, withRoleGuard, withPermissionGuard)
  + lib/permissions.ts (hasPermission, canEditPost, canDeletePost)
  + middleware.ts (route protection)

Total: 28 files

Approve? [Y/n]
```

---

### Step 3: Deterministic Generation (Script Engine)

#### Script 1: `generate-schema.ts`

**Input:** ASL entities + relationships

**Output:** `instant.schema.ts`
```typescript
import { i } from "@instantdb/core";

const schema = i.schema({
  entities: {
    User: i.entity({
      email: i.string().unique(),
      password_hash: i.string(),
      role: i.string(),
    }),
    Post: i.entity({
      title: i.string(),
      content: i.string(),
      published: i.boolean(),
      author_id: i.string(),
    }),
    Comment: i.entity({
      content: i.string(),
      post_id: i.string(),
      author_id: i.string(),
    }),
  },
  links: {
    postAuthor: {
      forward: { on: "Post", has: "one", label: "author" },
      reverse: { on: "User", has: "many", label: "posts" },
    },
    postComments: {
      forward: { on: "Comment", has: "one", label: "post" },
      reverse: { on: "Post", has: "many", label: "comments" },
    },
  },
});

export default schema;
```

#### Script 2: `generate-types.ts`

**Input:** instant.schema.ts

**Output:** `types/schema.ts`
```typescript
// Entity types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
}

// Insert types (for creating records)
export type UserInsert = Omit<User, "id" | "created_at">;
export type PostInsert = Omit<Post, "id" | "created_at" | "updated_at">;

// WithRelations types (for queries with nested data)
export type PostWithRelations = Post & {
  author?: User;
  comments?: Comment[];
};
```

#### Script 3: `generate-page.ts`

**Template:**
```typescript
function generatePage(spec: PageSpec): string {
  const guards = spec.guards.map(g => `with${capitalize(g)}Guard`).join('');
  const permissionChecks = spec.permissions.length > 0
    ? `  if (!hasPermissions([${spec.permissions.map(p => `"${p}"`).join(', ')}])) {
    return <Forbidden />;
  }`
    : '';

  return `
import { ${guards} } from '@/lib/guards';
${spec.permissions.length > 0 ? "import { hasPermissions } from '@/lib/permissions';" : ''}
import { ${spec.component} } from '@/components/${spec.componentPath}';

export default ${guards}(async function ${spec.name}Page() {
${permissionChecks}

  return <${spec.component} />;
});
  `.trim();
}
```

**Example Output:** `app/(dashboard)/posts/new/page.tsx`
```typescript
import { withAuthGuard, withRoleGuard } from '@/lib/guards';
import { hasPermissions } from '@/lib/permissions';
import { PostForm } from '@/components/posts/PostForm';

export default withAuthGuard(async function NewPostPage() {
  if (!hasPermissions(["create:Post"])) {
    return <Forbidden />;
  }

  return <PostForm />;
});
```

#### Script 4: `generate-component.ts`

**Template:**
```typescript
function generateComponent(spec: ComponentSpec): string {
  const props = spec.props.map(p => `${p.name}: ${p.type}`).join(';\n  ');

  return `
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ${spec.name}Props {
  ${props};
}

export function ${spec.name}({ ${spec.props.map(p => p.name).join(', ')} }: ${spec.name}Props) {
  return (
    <Card>
      <CardHeader>${spec.title}</CardHeader>
      <CardContent>
        {/* Generated from component registry */}
      </CardContent>
    </Card>
  );
}
  `.trim();
}
```

**Example Output:** `components/posts/PostCard.tsx`
```typescript
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PostCardProps {
  post: Post;
  variant?: 'mobile' | 'desktop';
  onEdit?: (post: Post) => void;
  onDelete?: (post: Post) => void;
}

export function PostCard({ post, variant = 'desktop', onEdit, onDelete }: PostCardProps) {
  return (
    <Card>
      <CardHeader>{post.title}</CardHeader>
      <CardContent>
        <p>{post.content}</p>
        {onEdit && <Button onClick={() => onEdit(post)}>Edit</Button>}
        {onDelete && <Button onClick={() => onDelete(post)}>Delete</Button>}
      </CardContent>
    </Card>
  );
}
```

#### Script 5: `generate-action.ts`

**Template:**
```typescript
function generateAction(spec: ActionSpec): string {
  return `
'use server';

import { db } from '@/lib/instant';
import { revalidatePath } from 'next/cache';

export async function ${spec.name}(data: ${spec.inputType}) {
  try {
    await db.transact([
      db.${spec.entity}.${spec.operation}(data),
    ]);

    revalidatePath('${spec.revalidatePath}');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
  `.trim();
}
```

**Example Output:** `actions/posts.ts`
```typescript
'use server';

import { db } from '@/lib/instant';
import { revalidatePath } from 'next/cache';
import { PostInsert } from '@/types/schema';

export async function createPost(data: PostInsert) {
  try {
    await db.transact([
      db.Post.create(data),
    ]);

    revalidatePath('/posts');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updatePost(id: string, data: Partial<PostInsert>) {
  try {
    await db.transact([
      db.Post.update(id, data),
    ]);

    revalidatePath(`/posts/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

### Step 4: Verification (Verifier Layer)

**Checks Performed:**

1. **TypeScript Compilation**
   ```bash
   $ tsc --noEmit
   ✓ No type errors
   ```

2. **Schema Drift Detection**
   ```bash
   $ mycontext doctor
   ✓ No schema drift detected
   ✓ No 'as any' casts found
   ✓ No duplicate type declarations
   ```

3. **Build Verification**
   ```bash
   $ pnpm build
   ✓ Build successful
   ```

4. **Lint Checks**
   ```bash
   $ pnpm lint
   ✓ No lint errors
   ```

**Success:** All checks passed ✅

---

### Step 5: Brain Update (Canonical State)

**Updates:**

1. **context.json**
   - Add generated pages, components, actions
   - Update brain.memory.lastScaffold timestamp

2. **components_registry.json**
   - Register all generated components with props, dependencies

3. **types_registry.json**
   - Register all entity types, Insert types, WithRelations types

4. **permissions_manifest.json**
   - Store RBAC rules for runtime checks

---

## Error Handling

### Case 1: Incomplete Specification

**Problem:** User didn't specify post fields

**Planner Response:**
```
❌ Specification incomplete:
   - Post entity missing field definitions

Please answer:
1. What fields should a Post have?
   Suggested: title, content, author_id

2. Should posts have published/draft states?
   [ ] Yes  [ ] No
```

### Case 2: Type Error After Generation

**Problem:** Generated code has type mismatch

**Verifier Output:**
```bash
$ tsc --noEmit
src/components/posts/PostForm.tsx(12,5): error TS2322:
  Type 'string' is not assignable to type 'PostInsert'
```

**Resolution:**
- Report error to user
- Update `generate-component.ts` template
- Regenerate PostForm.tsx

### Case 3: Schema Drift

**Problem:** Code accesses `post.author_name` but schema only has `post.author_id`

**Doctor Output:**
```bash
$ mycontext doctor
❌ Schema drift detected:
   - src/components/posts/PostCard.tsx:15
     Field 'author_name' does not exist on Post
     Did you mean 'author' (from relation)?
```

**Auto-fix:**
```bash
$ mycontext doctor --fix
✓ Fixed: Changed 'post.author_name' to 'post.author?.email'
```

---

## Iterative Refinement

### Project 1: Todo App
- Generated: 15 files
- Build: ✅ Success
- Manual fixes: 3 (component styling tweaks)

### Project 5: Blog
- Generated: 28 files
- Build: ✅ Success
- Manual fixes: 1 (custom markdown renderer)

### Project 10: E-commerce
- Generated: 45 files
- Build: ✅ Success
- Manual fixes: 0 🎉

**Conclusion:** Templates improve with each project → Future projects require less manual intervention.

---

## CLI Commands

### 1. Initialize with Recursive Clarification
```bash
mycontext init --interactive
```
- Agent asks questions
- User answers
- ASL is built iteratively
- Stops when 100% complete

### 2. Sync and Export
```bash
mycontext generate context --full
```
- Performs a unified AI sync
- Updates `context.json` SSOT
- Exports Markdown files for review

### 3. Scaffold from Brain
```bash
mycontext generate-components all
```
- Reads finalized `context.json`
- Executes all script generators
- Outputs complete project

### 3. Verify Build
```bash
mycontext doctor
```
- Runs type checks
- Detects schema drift
- Validates permissions
- Reports issues

### 4. Generate Types
```bash
mycontext generate types --from-schema
```
- Reads instant.schema.ts
- Generates Insert, WithRelations types
- Updates types_registry.json

### 5. Sync Context
```bash
mycontext sync
```
- Scans project files
- Updates context.json
- Detects drift
- Suggests fixes

---

## Conclusion

The MyContext compiler transforms natural language into production-ready Next.js applications through a deterministic, multi-stage pipeline. By separating intent parsing (LLM) from code generation (scripts), we achieve reliability, transparency, and iterative improvement that traditional AI code generators cannot match.

**Result:** One "mega script" scaffolds an entire application with minimal manual intervention.
