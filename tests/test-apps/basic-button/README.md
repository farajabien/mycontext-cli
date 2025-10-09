# Basic Button Test App

Test case for simple component generation using MyContext CLI.

## Test Description

Validates the core workflow for generating a simple button component with proper TypeScript types, accessibility attributes, and shadcn/ui integration.

## Expected Component

A reusable button component with:

- TypeScript interface for props
- Multiple variants (default, destructive, outline, secondary, ghost, link)
- Size variants (default, sm, lg, icon)
- Accessibility attributes (aria-\*)
- Proper className handling
- Forward ref support

## Test Steps

### 1. Initialize Project

```bash
# From tests/test-apps/basic-button/
mycontext init
```

**Expected**:

- `.mycontext/` folder created
- `.env.example` generated
- All required context files present

### 2. Configure Environment

```bash
# Copy and configure environment
cp .env.example .mycontext/.env
# Add your ANTHROPIC_API_KEY
```

### 3. Test Design Analysis

```bash
mycontext design:analyze
```

**Expected**:

- Design manifest generated
- No errors in analysis
- Component requirements identified

### 4. Generate Button Component

```bash
mycontext generate:component "Create a reusable button component with multiple variants and sizes"
```

**Expected Output**:

```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

### 5. Verify Generated Code

**Checklist**:

- [ ] TypeScript compiles without errors
- [ ] Uses shadcn/ui Button component pattern
- [ ] Includes proper variant props
- [ ] Has accessibility attributes
- [ ] Uses forwardRef correctly
- [ ] Includes proper className handling
- [ ] Exports both component and variants

### 6. Test Component Usage

Create a test file to verify the component works:

```typescript
// test-usage.tsx
import { Button } from "./Button";

export function TestUsage() {
  return (
    <div className="space-y-4">
      <Button>Default Button</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">🚀</Button>
    </div>
  );
}
```

## Test Results

### ✅ Pass Criteria

- [ ] Component generates without errors
- [ ] TypeScript compilation succeeds
- [ ] Follows shadcn/ui patterns exactly
- [ ] Includes all required variants
- [ ] Accessibility attributes present
- [ ] Proper prop types defined
- [ ] Forward ref implemented correctly

### ❌ Issues Found

- [ ] Issue 1: Description
- [ ] Issue 2: Description

### 📊 Performance Metrics

- **Generation Time**: \_\_\_ seconds
- **Code Quality**: \_\_\_/10
- **Pattern Adherence**: \_\_\_/10
- **Accessibility Score**: \_\_\_/10

## Notes

Additional observations or recommendations:

---

**Test Date**: $(date)
**CLI Version**: v2.0.28
**Test Status**: ⏳ Pending
