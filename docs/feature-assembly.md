# Feature Assembly Documentation

## Overview

Feature Assembly is MyContext's revolutionary approach to building production-ready applications by combining generated components into complete, working features with authentication, actions, and role-based access control.

## Table of Contents

- [What is Feature Assembly?](#what-is-feature-assembly)
- [The MyContext Promise](#the-mycontext-promise)
- [Admin-First Development](#admin-first-development)
- [Feature Bundle Structure](#feature-bundle-structure)
- [Commands](#commands)
- [Workflows](#workflows)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## What is Feature Assembly?

Feature Assembly transforms individual components into complete, working features by bundling:

- **Components**: UI elements (buttons, forms, cards, tables)
- **Types**: TypeScript interfaces and types
- **Actions**: Server actions for data mutations
- **Hooks**: Custom React hooks for state management
- **Routes**: API routes and page routes
- **Database**: InstantDB schema and queries
- **Permissions**: Role-based access control

### From Components to Features

```
Components → Features → Role-Based Access → Production App
```

## The MyContext Promise

**Before** (Component Library Only):

- Generate 50 components ✅
- Developer manually assembles features ⏱️ 2-3 days
- Wire up actions, hooks, routes ⏱️ 1-2 days
- Add auth and permissions ⏱️ 1 day

**After** (Feature Assembly):

- Generate 50 components ✅
- MyContext assembles into 10 features ⚡ 10 minutes
- Generate for admin role ⚡ 5 minutes
- Adapt for user role ⚡ 3 minutes

**Total**: Production-ready app with auth, features, and role-based access in **under 30 minutes**.

## Admin-First Development

### Why Admin First?

1. **Full CRUD Permissions** - Admin has complete access to all features
2. **Cascade to User Role** - User features are subsets of admin (read-only, limited actions)
3. **Easier Testing** - If admin CRUD works, user READ-ONLY is trivial to generate

### Development Flow

1. **Build Admin Features First** - Full CRUD permissions
2. **Cascade to User Role** - Subset of admin (read-only, limited actions)
3. **Add Guest Features** - Public-only features

## Feature Bundle Structure

### FeatureBundle Interface

```typescript
interface FeatureBundle {
  metadata: FeatureMetadata;
  components: Component[];
  types: TypeDefinition[];
  actions: ServerAction[];
  hooks: CustomHook[];
  routes: APIRoute[];
  database: DatabaseSchema;
  permissions: Permission[];
}
```

### Component Structure

```typescript
interface Component {
  name: string;
  type: "ui" | "form" | "table" | "modal" | "layout";
  filePath: string;
  dependencies: string[];
  props: PropDefinition[];
  roleAccess: string[];
}
```

### Server Action Structure

```typescript
interface ServerAction {
  name: string;
  type: "create" | "read" | "update" | "delete" | "custom";
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  parameters: Parameter[];
  returnType: string;
  roleAccess: string[];
}
```

## Commands

### Assemble Features

```bash
# Assemble from generated components
mycontext assemble-features --from-components

# Use admin starter template
mycontext assemble-features --use-starter --role admin

# Generate specific feature
mycontext assemble-features --feature user-management --role admin

# Generate for specific role
mycontext assemble-features --role user --from-components

# Custom output directory
mycontext assemble-features --output ./features --role admin

# Include tests and documentation
mycontext assemble-features --include-tests --include-docs --role admin
```

### Clone Starter

```bash
# Clone admin starter repository
mycontext clone-starter --url https://github.com/your-username/admin-starter

# Clone and install dependencies
mycontext clone-starter --url <repo-url> --install

# Clone, install, and setup
mycontext clone-starter --url <repo-url> --install --setup

# Clone specific branch
mycontext clone-starter --url <repo-url> --branch main

# Custom output directory
mycontext clone-starter --url <repo-url> --output ./my-admin-app
```

## Workflows

### Complete Setup with Admin Starter

```bash
# Option 1: Complete setup with admin starter
mycontext setup-complete --with-admin-starter

# Option 2: Add to existing project
mycontext clone-starter --url <your-admin-repo>
mycontext assemble-features --role admin
```

### Step-by-Step Feature Development

```bash
# 1. Initialize project
mycontext init

# 2. Generate context files
mycontext generate-context-files

# 3. Generate architecture and design manifest
mycontext generate architecture

# 4. Generate components
mycontext generate-components

# 5. Assemble features for admin
mycontext assemble-features --role admin

# 6. Adapt for user role
mycontext assemble-features --role user --from-components

# 7. Preview features
mycontext preview features
```

### Workflow Command Integration

```bash
# Complete workflow with feature assembly
mycontext workflow generate --type ecommerce --include-features --role admin

# Skip components, focus on features
mycontext workflow generate --skip-components --include-features --role admin
```

## Examples

### User Management Feature

```bash
mycontext assemble-features --feature user-management --role admin
```

**Generated**:

- **5 Components**: UserList, UserCard, UserForm, InviteDialog, UserSettings
- **12 Server Actions**: createUser, updateUser, deleteUser, inviteUser, etc.
- **3 Custom Hooks**: useUsers, useInvites, useUserPermissions
- **2 API Routes**: /api/users, /api/invites
- **InstantDB Schema**: users, invites, permissions tables
- **Role Permissions**: admin: full access, user: read own profile

### E-commerce Feature

```bash
mycontext assemble-features --feature ecommerce --role admin
```

**Generated**:

- **8 Components**: ProductList, ProductCard, ProductForm, OrderTable, etc.
- **15 Server Actions**: createProduct, updateInventory, processOrder, etc.
- **5 Custom Hooks**: useProducts, useOrders, useCart, usePayments, useAnalytics
- **4 API Routes**: /api/products, /api/orders, /api/payments, /api/analytics
- **InstantDB Schema**: products, orders, payments, customers tables
- **Role Permissions**: admin: full access, user: browse/order, guest: browse only

### Dashboard Feature

```bash
mycontext assemble-features --feature dashboard --role admin
```

**Generated**:

- **6 Components**: DashboardLayout, StatsCard, ChartWidget, DataTable, etc.
- **8 Server Actions**: fetchStats, updateSettings, exportData, etc.
- **4 Custom Hooks**: useDashboard, useStats, useSettings, useNotifications
- **3 API Routes**: /api/dashboard, /api/stats, /api/settings
- **InstantDB Schema**: dashboard_config, stats, notifications tables
- **Role Permissions**: admin: full access, user: read-only dashboard

## Best Practices

### 1. Start with Admin Role

Always begin with admin features to establish the full CRUD foundation:

```bash
# Generate admin features first
mycontext assemble-features --role admin --feature user-management
mycontext assemble-features --role admin --feature product-catalog
mycontext assemble-features --role admin --feature order-management
```

### 2. Use Admin Starter Templates

Leverage pre-built admin starters for common patterns:

```bash
# Clone admin starter with auth and user management
mycontext clone-starter --url https://github.com/mycontext/admin-starter
mycontext assemble-features --use-starter --role admin
```

### 3. Cascade to User Roles

Generate user features by adapting admin features:

```bash
# Generate user features (subset of admin)
mycontext assemble-features --role user --from-components

# Generate guest features (public only)
mycontext assemble-features --role guest --from-components
```

### 4. Feature Naming Conventions

Use descriptive, consistent naming:

- **Features**: `user-management`, `product-catalog`, `order-management`
- **Components**: `UserList`, `ProductCard`, `OrderForm`
- **Actions**: `createUser`, `updateProduct`, `processOrder`
- **Hooks**: `useUsers`, `useProducts`, `useOrders`

### 5. Role-Based Permissions

Define clear permission boundaries:

```typescript
// Admin: Full access
const adminPermissions = {
  users: ["create", "read", "update", "delete"],
  products: ["create", "read", "update", "delete"],
  orders: ["create", "read", "update", "delete"],
};

// User: Limited access
const userPermissions = {
  users: ["read"], // Own profile only
  products: ["read"],
  orders: ["create", "read"], // Own orders only
};

// Guest: Read-only
const guestPermissions = {
  products: ["read"],
  // No user or order access
};
```

## Troubleshooting

### Common Issues

#### 1. Missing Components

**Error**: `No components found for feature assembly`

**Solution**:

```bash
# Generate components first
mycontext generate-components

# Then assemble features
mycontext assemble-features --from-components --role admin
```

#### 2. Admin Starter Not Found

**Error**: `Admin starter repository not found`

**Solution**:

```bash
# Use a valid GitHub URL
mycontext clone-starter --url https://github.com/valid-username/valid-repo

# Or use local template
mycontext assemble-features --use-starter --template ./local-template
```

#### 3. Permission Errors

**Error**: `Insufficient permissions for feature access`

**Solution**:

```bash
# Check role permissions
mycontext assemble-features --role admin --verbose

# Regenerate with correct permissions
mycontext assemble-features --role admin --regenerate-permissions
```

#### 4. Type Conflicts

**Error**: `Type definition conflicts detected`

**Solution**:

```bash
# Regenerate types
mycontext generate types

# Or regenerate entire feature
mycontext assemble-features --role admin --regenerate-types
```

### Debug Mode

Use verbose mode for detailed debugging:

```bash
# Verbose feature assembly
mycontext assemble-features --role admin --verbose

# Verbose starter cloning
mycontext clone-starter --url <repo-url> --verbose
```

### State Management

Feature assembly creates state files for tracking:

- `.mycontext/feature-assembly-state.json` - Current assembly state
- `.mycontext/feature-bundles/` - Generated feature bundles
- `.mycontext/role-permissions/` - Role-based permission mappings

## Integration with Design Pipeline

Feature Assembly integrates seamlessly with the Design Pipeline:

1. **Design Manifest** - Provides design system and visual tokens
2. **Component Generation** - Creates components with design system integration
3. **Feature Assembly** - Combines components into features with consistent design
4. **Role-Based Access** - Applies design system across different user roles

### Design-Driven Feature Assembly

```bash
# Complete design-driven workflow
mycontext setup-complete --with-admin-starter
mycontext design analyze
mycontext generate-components
mycontext assemble-features --role admin
```

## Future Enhancements

- **Feature Templates** - Pre-built templates for common patterns
- **Custom Role Definitions** - Define custom roles beyond admin/user/guest
- **Feature Dependencies** - Automatic dependency resolution between features
- **Feature Testing** - Automated testing for assembled features
- **Feature Deployment** - One-command deployment of assembled features

---

**Next Steps**: Start with `mycontext setup-complete --with-admin-starter` to experience the complete Feature Assembly workflow!
