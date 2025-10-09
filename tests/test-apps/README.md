# MyContext CLI Test Apps

Manual testing infrastructure for validating MyContext CLI workflows before publishing to npm.

## Test Scenarios

1. **basic-button/** - Simple component generation
2. **auth-form/** - Complex form with validation
3. **dashboard-layout/** - Multi-component feature

## Running Tests

```bash
# From project root
cd tests/test-apps/basic-button
mycontext init
# Follow test steps in each folder's README.md
```

## Test Workflow

Each test app follows this validation process:

1. **Initialize Project**

   ```bash
   mycontext init
   ```

2. **Verify .mycontext/ folder creation**

   - Check all required files are created
   - Verify .env.example is generated

3. **Test Design Analysis**

   ```bash
   mycontext design:analyze
   ```

4. **Test Component Generation**

   ```bash
   mycontext generate:component "Create a [component description]"
   ```

5. **Verify Generated Code Quality**

   - Check TypeScript compilation
   - Verify shadcn/ui component usage
   - Validate accessibility attributes
   - Test responsive design

6. **Document Results**
   - Record any issues found
   - Note performance metrics
   - Verify expected outputs

## Expected Outcomes

- ✅ All commands execute without errors
- ✅ Generated components compile successfully
- ✅ Code follows shadcn/ui patterns
- ✅ Accessibility attributes are present
- ✅ TypeScript types are correct
- ✅ Responsive design is implemented

## Issues Found

Document any issues discovered during testing:

- [ ] Issue 1: Description
- [ ] Issue 2: Description

## Test Results Summary

| Test App         | Status     | Issues | Notes |
| ---------------- | ---------- | ------ | ----- |
| basic-button     | ⏳ Pending | -      | -     |
| auth-form        | ⏳ Pending | -      | -     |
| dashboard-layout | ⏳ Pending | -      | -     |

---

**Last Updated**: $(date)
**CLI Version**: v2.0.28
**Test Environment**: Node.js $(node --version)
