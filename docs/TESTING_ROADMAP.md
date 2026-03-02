# Progressive Testing Roadmap

## Overview

MyContext is built iteratively through progressive complexity testing. We start with the simplest possible app (Todo) and gradually increase complexity (Blog → E-commerce → SaaS), refining our script templates after each phase.

**Goal:** By Project 20, the compiler generates 99% correct code with minimal manual intervention.

---

## Testing Philosophy

### Metrics to Track

For each phase, we measure:

1. **Time to 100% Manifest** — How long the recursive clarification takes
2. **Questions Asked** — Number of questions agent needs to ask
3. **Files Generated** — Total file count
4. **Build Success** — Does `pnpm build` pass on first try?
5. **Type Errors** — Count from `tsc --noEmit`
6. **Schema Drift Issues** — Count from `mycontext doctor`
7. **Manual Edits Required** — Number of files needing manual fixes
8. **Template Refinements** — Changes made to generators after this project

### Success Criteria

A phase is considered successful when:
- ✅ Manifest is 100% complete
- ✅ Build passes on first generation
- ✅ No type errors
- ✅ No schema drift
- ✅ Manual edits < 5% of generated files

---

## Phase 1: Todo App (Baseline)

### Complexity Level
**★☆☆☆☆** (Minimal)

### Goal
Prove that deterministic scaffolding works end-to-end.

### Specification

**User Story:**
```
"Build a todo app where users can create, edit, delete, and complete tasks."
```

**Entities:**
- Task
  - id (auto)
  - title (string, required)
  - completed (boolean, default: false)
  - created_at (date, auto)

**Features:**
- Create task
- Mark task as complete/incomplete
- Edit task title
- Delete task
- View all tasks

**Pages:**
- `/` — Task list + create form (public)

**Auth:**
- None (publicly accessible)

**Permissions:**
- None (no RBAC)

### Expected Output

**Generated Files (15 total):**
```
src/
├── app/
│   ├── page.tsx                  # Home page with task list
│   └── layout.tsx                # Root layout
├── components/
│   ├── tasks/
│   │   ├── TaskCard.tsx          # Single task display
│   │   ├── TaskList.tsx          # List of tasks
│   │   └── TaskForm.tsx          # Create/edit task form
│   └── ui/                       # shadCN components
│       ├── card.tsx
│       ├── button.tsx
│       ├── checkbox.tsx
│       └── input.tsx
├── actions/
│   └── tasks.ts                  # createTask, updateTask, deleteTask
├── types/
│   └── schema.ts                 # Task, TaskInsert types
└── lib/
    └── instant.ts                # InstantDB client

instant.schema.ts                 # Task entity definition
```

### Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Time to 100% Manifest | < 5 min | ___ |
| Questions Asked | < 5 | ___ |
| Files Generated | 15 | ___ |
| Build Success | YES | ___ |
| Type Errors | 0 | ___ |
| Schema Drift Issues | 0 | ___ |
| Manual Edits | 0 | ___ |
| Template Refinements | ___ | ___ |

### Testing Checklist

- [ ] Run `mycontext init --interactive`
- [ ] Answer clarifying questions
- [ ] Approve diff
- [ ] Run `mycontext scaffold --from-manifest`
- [ ] Verify all 15 files generated
- [ ] Run `pnpm build` → should pass
- [ ] Run `mycontext doctor` → should pass
- [ ] Run `tsc --noEmit` → should pass
- [ ] Test in browser:
  - [ ] Create task
  - [ ] Complete task
  - [ ] Edit task
  - [ ] Delete task
- [ ] Count manual edits needed
- [ ] Document template improvements

### Known Challenges

1. **First-time setup** — InstantDB client config
2. **Component styling** — May need minor shadCN tweaks
3. **Form validation** — May need Zod schema

### Post-Phase Actions

1. Update script templates based on findings
2. Add missing validations to planner
3. Refine ASL schema for next phase

---

## Phase 2: Blog (Auth + Relations)

### Complexity Level
**★★★☆☆** (Medium)

### Goal
Prove auth guards, RBAC, and entity relationships work.

### Specification

**User Story:**
```
"Build a blog with user authentication.
Authors can create and edit their own posts.
Readers can view posts and leave comments.
Admins can moderate everything."
```

**Entities:**
- User (id, email, password_hash, role)
- Post (id, title, content, published, author_id, created_at, updated_at)
- Comment (id, content, post_id, author_id, created_at)

**Relationships:**
- User → Posts (one-to-many)
- Post → Comments (one-to-many)
- User → Comments (one-to-many)

**Auth:**
- Provider: Email/password
- Roles: admin, author, reader
- Default role: reader

**Permissions:**
| Role | Entity | Actions | Condition |
|------|--------|---------|-----------|
| admin | * | CRUD | all |
| author | Post | CRUD | own |
| author | Comment | CRUD | own |
| reader | Post | Read | published only |
| reader | Comment | Create, Read | all |

**Pages:**
- `/` — Home (public)
- `/login` — Login (public)
- `/register` — Register (public)
- `/posts` — Post list (authenticated)
- `/posts/[id]` — Post detail (authenticated)
- `/posts/new` — Create post (author or admin)
- `/posts/[id]/edit` — Edit post (author owns or admin)
- `/profile` — User profile (authenticated)

### Expected Output

**Generated Files (35+ total):**
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── posts/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   ├── [id]/edit/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── profile/page.tsx
│   │   └── layout.tsx (with auth guard)
│   └── page.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── posts/
│   │   ├── PostCard.tsx
│   │   ├── PostList.tsx
│   │   └── PostForm.tsx
│   └── comments/
│       ├── CommentList.tsx
│       └── CommentForm.tsx
├── actions/
│   ├── auth.ts (login, register, logout)
│   ├── posts.ts (CRUD)
│   └── comments.ts (CRUD)
├── lib/
│   ├── guards.ts (withAuthGuard, withRoleGuard)
│   ├── permissions.ts (hasPermission, canEdit)
│   └── instant.ts
└── types/
    └── schema.ts (User, Post, Comment, PostWithRelations, etc.)

instant.schema.ts (3 entities, 2 links)
middleware.ts (route protection)
```

### Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Time to 100% Manifest | < 10 min | ___ |
| Questions Asked | < 15 | ___ |
| Files Generated | 35+ | ___ |
| Build Success | YES | ___ |
| Type Errors | 0 | ___ |
| Schema Drift Issues | 0 | ___ |
| Manual Edits | < 3 | ___ |
| Auth Guards Accuracy | 100% | ___ |
| Permission Checks Accuracy | 100% | ___ |

### Testing Checklist

**Scaffolding:**
- [ ] Run `mycontext init --interactive`
- [ ] Complete recursive clarification
- [ ] Approve diff
- [ ] Run `mycontext scaffold --from-manifest`
- [ ] Verify 35+ files generated
- [ ] Run `pnpm build` → should pass
- [ ] Run `mycontext doctor` → should pass

**Auth Flow:**
- [ ] Register new user
- [ ] Login with user
- [ ] Access protected route `/posts`
- [ ] Try accessing `/posts/new` without author role → blocked
- [ ] Promote user to author role
- [ ] Access `/posts/new` → allowed

**RBAC:**
- [ ] Author creates post
- [ ] Author edits own post → allowed
- [ ] Author tries editing other author's post → blocked
- [ ] Admin edits any post → allowed
- [ ] Reader creates comment → allowed
- [ ] Reader tries creating post → blocked

**Relationships:**
- [ ] Query post with author (PostWithRelations)
- [ ] Query post with comments
- [ ] Verify types are correct

### Known Challenges

1. **Password hashing** — bcrypt setup
2. **Session management** — JWT or cookies
3. **Middleware** — Route protection logic
4. **Permission checks** — Runtime validation

### Post-Phase Actions

1. Refine auth guard templates
2. Add permission validation to planner
3. Improve relationship type generation

---

## Phase 3: E-commerce (Complex State)

### Complexity Level
**★★★★☆** (High)

### Goal
Prove complex state management, payment integration, and async flows work.

### Specification

**User Story:**
```
"Build an e-commerce store with products, shopping cart, and checkout.
Customers can browse products, add to cart, and pay with Stripe.
Admins can manage inventory and view orders."
```

**Entities:**
- User
- Product (id, name, description, price, stock, image_url)
- Order (id, user_id, status, total, created_at)
- OrderItem (id, order_id, product_id, quantity, price)
- Payment (id, order_id, stripe_payment_id, status, amount)
- Cart (id, user_id, items)
- CartItem (id, cart_id, product_id, quantity)

**Features:**
- Product catalog with search/filter
- Shopping cart (add, remove, update quantity)
- Checkout flow (cart → address → payment → confirmation)
- Order tracking
- Admin dashboard (products, orders, users)
- Stripe payment webhook

**Complexity:**
- State management (cart state)
- Optimistic UI updates
- Payment webhooks
- Inventory management (stock decrements)
- Order status transitions

### Expected Output

**Generated Files (50+ total)**

### Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Time to 100% Manifest | < 20 min | ___ |
| Files Generated | 50+ | ___ |
| Build Success | YES | ___ |
| Manual Edits | < 5 | ___ |

### Testing Checklist

- [ ] Browse products
- [ ] Add to cart
- [ ] Update cart quantity
- [ ] Checkout flow (mock Stripe)
- [ ] Webhook handling
- [ ] Order status updates
- [ ] Admin inventory management

---

## Phase 4: SaaS Dashboard (Multi-tenant)

### Complexity Level
**★★★★★** (Enterprise)

### Goal
Prove enterprise-grade scaffolding with multi-tenancy, billing, and real-time features.

### Specification

**User Story:**
```
"Build a SaaS dashboard with multi-tenant isolation, subscription billing, and real-time updates."
```

**Entities:**
- Tenant (id, name, plan, status)
- User (id, tenant_id, email, role)
- Subscription (id, tenant_id, stripe_subscription_id, status)
- Feature (id, name, enabled_for_plans)
- UsageMetric (id, tenant_id, metric_name, value, date)

**Features:**
- Multi-tenant isolation (row-level security)
- Subscription billing (Stripe)
- Feature flags (plan-based)
- Usage tracking
- Real-time updates (InstantDB subscriptions)
- Admin panel (super-admin)

**Complexity:**
- Tenant context in all queries
- Subscription lifecycle management
- Feature flag runtime checks
- Usage-based billing
- Real-time collaboration

### Expected Output

**Generated Files (70+ total)**

### Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Files Generated | 70+ | ___ |
| Build Success | YES | ___ |
| Manual Edits | < 3 | ___ |
| Multi-tenant Isolation | 100% | ___ |

---

## New Milestone: Automated shadcn/ui Install & Feature Planning

- [x] Add script to install all shadcn/ui components (`scripts/install-all-shadcn.sh`)
- [x] Document shadcn/ui install as a required step in project setup
- [x] Validate feature planning workflow (`plan-feature` CLI) in experiments
- [ ] Automate verification of shadcn/ui presence in `components/ui` for all new projects
- [ ] Integrate shadcn/ui install into MyContext CLI init flow (future)

This ensures all projects are ready for modern UI and feature planning out of the box.

---

## New Workflow: Deterministic Planner + LLM Enhancement

- LLMs are only used to enhance/refactor code after initial scaffold (never generate from scratch)
- The CLI/planner enforces alignment, making ALIGN files redundant
- Feature planning is performed via the `plan-feature` CLI command:
  1. User describes feature
  2. LLM clarifies/cleans request
  3. Planner agent proposes todos/context updates
  4. User reviews/approves plan
- shadcn/ui install is now a standard step for all new projects (see `scripts/install-all-shadcn.sh`)
- End-to-end workflow validated in `experiments/flip/my-app`

See also: QUICK_START_INFERENCE.md, TEST_RESULTS.md

---

## Planner/LLM Integration: Next Steps

- [ ] Automate multi-README sync to ensure all project READMEs reflect latest workflow
- [ ] Expand planner agent to support more advanced feature decomposition and context management
- [ ] Integrate LLM enhancement phase into additional CLI commands (e.g., refactor, improve)
- [ ] Add more E2E tests in experiments to cover edge cases and advanced scenarios

These steps will further strengthen the deterministic, planner-driven, LLM-assisted workflow and ensure robust documentation across all projects.

---

## Summary: Iterative Refinement Curve

| Phase | Complexity | Files | Manual Edits | Template Quality |
|-------|------------|-------|--------------|------------------|
| 1. Todo | ★☆☆☆☆ | 15 | 3 expected | 60% (baseline) |
| 2. Blog | ★★★☆☆ | 35 | 2 expected | 80% (auth refined) |
| 3. E-comm | ★★★★☆ | 50 | 1 expected | 90% (state refined) |
| 4. SaaS | ★★★★★ | 70 | 0 expected | 95% (enterprise-ready) |
| **20. Any** | ★★★★★ | N/A | 0 | **99% (stable)** |

---

## Post-Testing: Next Steps

After completing all 4 phases:

1. **Publish Templates** — Share refined generators
2. **Community Contributions** — Accept PRs for new templates
3. **Multi-framework Support** — Extend to React, Vue, Svelte
4. **Visual Builder** — GUI for ASL definition
5. **Testing Generation** — Auto-generate unit/E2E tests
6. **API Docs Generation** — Auto-generate OpenAPI specs
7. **Production Deployment** — One-click deploy to Vercel

---

## Conclusion

This roadmap transforms MyContext from a prototype into a production-ready compiler through systematic testing and iterative refinement. Each phase validates core assumptions and improves templates, ensuring that future projects benefit from accumulated learnings.

**Ultimate Goal:** By Project 20, users run ONE command and get a 99% complete, production-ready application.
