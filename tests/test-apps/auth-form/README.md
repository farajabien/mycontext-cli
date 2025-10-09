# Auth Form Test App

Test case for complex form generation with validation, error handling, and accessibility features.

## Test Description

Validates the generation of a complete authentication form with email/password fields, validation, error states, loading states, and proper accessibility attributes.

## Expected Component

An authentication form component with:

- Email and password input fields
- Form validation with error messages
- Loading state during submission
- Accessibility attributes (aria-\*)
- Error handling and display
- Proper form structure and semantics
- Submit button with loading state
- Input validation (email format, password requirements)

## Test Steps

### 1. Initialize Project

```bash
# From tests/test-apps/auth-form/
mycontext init
```

### 2. Configure Environment

```bash
cp .env.example .mycontext/.env
# Add your ANTHROPIC_API_KEY
```

### 3. Test Design Analysis

```bash
mycontext design:analyze
```

### 4. Generate Auth Form Component

```bash
mycontext generate:component "Create a login form with email and password fields, validation, error handling, and loading states"
```

**Expected Output**:

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthFormProps {
  onSubmit: (data: { email: string; password: string }) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export function AuthForm({
  onSubmit,
  isLoading = false,
  error,
}: AuthFormProps) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={isLoading}
            />
            {errors.email && (
              <Alert variant="destructive" className="mt-1">
                <AlertDescription id="email-error">
                  {errors.email}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              disabled={isLoading}
            />
            {errors.password && (
              <Alert variant="destructive" className="mt-1">
                <AlertDescription id="password-error">
                  {errors.password}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### 5. Verify Generated Code

**Checklist**:

- [ ] TypeScript compiles without errors
- [ ] Uses shadcn/ui components (Card, Input, Button, Label, Alert)
- [ ] Includes form validation logic
- [ ] Has proper error handling
- [ ] Includes loading states
- [ ] Accessibility attributes present
- [ ] Proper form semantics
- [ ] Email validation regex
- [ ] Password requirements
- [ ] Disabled state handling

## Test Results

### ✅ Pass Criteria

- [ ] Form generates without errors
- [ ] TypeScript compilation succeeds
- [ ] All shadcn/ui components used correctly
- [ ] Form validation works
- [ ] Error states display properly
- [ ] Loading states work correctly
- [ ] Accessibility attributes present
- [ ] Email validation functional
- [ ] Password validation functional
- [ ] Form submission handling correct

### ❌ Issues Found

- [ ] Issue 1: Description
- [ ] Issue 2: Description

### 📊 Performance Metrics

- **Generation Time**: \_\_\_ seconds
- **Code Quality**: \_\_\_/10
- **Pattern Adherence**: \_\_\_/10
- **Accessibility Score**: \_\_\_/10
- **Validation Coverage**: \_\_\_/10

## Notes

Additional observations or recommendations:

---

**Test Date**: $(date)
**CLI Version**: v2.0.28
**Test Status**: ⏳ Pending
