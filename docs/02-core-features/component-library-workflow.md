# Component Library Workflow

## Overview

MyContext CLI generates a complete component library for your Next.js app, built on top of shadcn/ui. The workflow focuses on creating project-specific components from your requirements, validating them, and providing a preview system for refinement.

## Core Promise

> "Generate your context files and component library. That's it. Use it inside Cursor or any IDE."

## Workflow Steps

### 1. Initialize Project

```bash
mycontext init my-app --framework instantdb
```

Creates the project structure with `.mycontext/` folder for all generated files.

### 2. Generate Context Files

```bash
mycontext generate:context
```

Generates:

- **PRD** (Product Requirements Document) from project analysis
- **Brand guidelines** with colors, typography, spacing
- **Tech stack** configuration
- **Component list** - project-specific components from PRD analysis

### 3. Generate InstantDB Schema

```bash
mycontext generate:schema
```

Creates `.mycontext/schema.ts` with InstantDB entities based on your requirements.

### 4. Generate Types from Schema

```bash
mycontext generate:types --from-schema
```

Generates `.mycontext/types.ts` with:

- Entity types from InstantDB schema
- Component prop types based on schema fields
- Dummy data generators from schema structure

### 5. Generate Core 10 Components

```bash
mycontext generate:components --core-only
```

Generates the first 10 components from your component-list.json:

- **Mobile variants** in `.mycontext/components/mobile/`
- **Desktop variants** in `.mycontext/components/desktop/`
- Built on top of shadcn/ui components
- Uses schema-based types for props

### 6. Preview and Validate

```bash
mycontext preview:components
```

Opens preview at `http://localhost:3000/mycontext-preview` with:

- Component gallery showing all generated components
- Mobile/desktop toggle
- Validation checklist for each component
- Interactive approve/reject workflow

### 7. Generate All Remaining Components

```bash
mycontext generate:components --all
```

Generates all remaining components from component-list.json using the validated core 10 as style reference.

## Component Structure

### Mobile/Desktop Variants

Each component is generated in two variants:

```
.mycontext/components/
├── mobile/
│   ├── UserCard.tsx
│   ├── ProductList.tsx
│   └── ...
└── desktop/
    ├── UserCard.tsx
    ├── ProductList.tsx
    └── ...
```

**Mobile Variants**:

- Touch-friendly sizing (min 44px touch targets)
- Compact spacing
- Mobile-first responsive design
- Optimized for small screens

**Desktop Variants**:

- Standard sizing (min 32px)
- Comfortable spacing
- Desktop-optimized layouts
- Optimized for large screens

### Built on shadcn/ui

All components are built ON TOP of shadcn/ui:

```tsx
// Example: UserCard component
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserCardProps {
  user: User; // Generated from schema
  variant?: "mobile" | "desktop";
}

export function UserCard({ user, variant = "mobile" }: UserCardProps) {
  return (
    <Card className={variant === "mobile" ? "p-2" : "p-4"}>
      <CardHeader>
        <Avatar src={user.avatar} />
        <h3>{user.name}</h3>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">{user.role}</Badge>
      </CardContent>
    </Card>
  );
}
```

## Component List Generation

The component-list.json is generated from your PRD analysis:

```json
{
  "groups": {
    "authentication": [
      {
        "name": "LoginForm",
        "description": "User login form with email and password",
        "type": "form",
        "priority": "high",
        "dependencies": ["Button", "Input", "Form"]
      }
    ],
    "user-management": [
      {
        "name": "UserCard",
        "description": "Display user information in card format",
        "type": "display",
        "priority": "medium",
        "dependencies": ["Card", "Avatar", "Badge"]
      }
    ]
  }
}
```

## Preview System

### Preview Route

The preview system runs at `/mycontext-preview` in your Next.js app:

```tsx
// app/mycontext-preview/page.tsx
export default function ComponentLibraryPreview() {
  const components = loadGeneratedComponents();
  const [variant, setVariant] = useState<"mobile" | "desktop">("mobile");
  const [validated, setValidated] = useState<Set<string>>(new Set());

  return (
    <div className="p-6">
      <h1>Component Library Preview</h1>

      <VariantToggle value={variant} onChange={setVariant} />

      <ComponentGrid
        components={components}
        variant={variant}
        onValidate={handleValidate}
        validated={validated}
      />
    </div>
  );
}
```

### Validation Checklist

Each component is validated against:

- ✅ **TypeScript compiles** - No type errors
- ✅ **Accessibility (ARIA)** - Proper ARIA attributes
- ✅ **Mobile responsive** - Works on mobile screens
- ✅ **Design tokens applied** - Uses CSS variables
- ✅ **Imports correct** - Proper shadcn/ui imports
- ✅ **Props match schema** - Props align with database schema

### Interactive Refinement

```bash
# Refine a specific component
mycontext refine:component UserCard --variant mobile

# Flow:
# 1. Show current component code
# 2. AI suggests improvements
# 3. User approves/rejects
# 4. Regenerate with changes
# 5. Update in preview
```

## Schema-Driven Types

Types are generated from your InstantDB schema:

```typescript
// .mycontext/schema.ts
export const schema = {
  entities: {
    users: {
      id: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      avatar: { type: "string", optional: true },
      role: { type: "string" },
    },
  },
};

// .mycontext/types.ts (generated)
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface UserCardProps {
  user: User;
  variant?: "mobile" | "desktop";
  onEdit?: (user: User) => void;
}
```

## Integration with Existing Apps

### Export Strategy

After validation, components can be exported to your main app:

```bash
# Export validated components to src/components/
mycontext export:components --validated-only

# Or manually copy from .mycontext/components/ to components/
```

### Keep shadcn/ui Separate

The shadcn/ui foundation stays in `components/ui/` and is never modified:

```
my-app/
├── .mycontext/
│   └── components/          # Generated components
│       ├── mobile/
│       └── desktop/
├── components/
│   └── ui/                 # shadcn/ui (foundation)
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
└── src/
    └── components/         # Your app components
        ├── UserCard.tsx    # Exported from .mycontext
        └── ...
```

## Best Practices

### 1. Start with Core 10

Always validate the first 10 components before generating the rest. This establishes your design patterns and ensures quality.

### 2. Mobile-First Design

Generate mobile variants first, then desktop. Mobile constraints lead to better desktop designs.

### 3. Schema-Driven Development

Let your database schema drive your component props. This ensures consistency between data and UI.

### 4. Validate Before Export

Use the preview system to validate all components before copying them to your main app.

### 5. Iterative Refinement

Use the refinement workflow to improve components based on your specific needs.

## Troubleshooting

### Components Not Generating

```bash
# Check if component-list.json exists
ls .mycontext/04-component-list.json

# Regenerate if missing
mycontext generate:context
```

### Preview Not Loading

```bash
# Ensure Next.js app is running
npm run dev

# Check if route exists
ls app/mycontext-preview/page.tsx
```

### Type Errors

```bash
# Regenerate types from schema
mycontext generate:types --from-schema

# Check schema file
cat .mycontext/schema.ts
```

## Next Steps

After completing the component library workflow:

1. **Export validated components** to your main app
2. **Use in your pages** with proper imports
3. **Customize as needed** for your specific requirements
4. **Add to your design system** documentation

The component library provides a solid foundation for your Next.js app, built on proven shadcn/ui patterns and tailored to your specific requirements.
