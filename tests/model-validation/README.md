# Model Validation Tests

Comprehensive test suite for validating the fine-tuned CodeGen2-1B model against Intent Dictionary patterns and expanded UI patterns.

## Overview

This test suite validates `faraja/mycontext-codegen2-merged` against:

- **30 Intent Dictionary patterns** (core UI components, forms, navigation, feedback, overlays, data display)
- **40+ Expanded patterns** (Next.js App Router, InstantDB, Shadcn/UI, Radix UI, Tailwind CSS)

## Test Files

### `intent-dictionary-tests.ts`

30 core Intent Dictionary patterns organized by category:

- **Core UI Components** (10): buttons, inputs, forms, cards
- **Form Components** (5): checkbox, radio, select, textarea, switch
- **Navigation** (5): header, sidebar, tabs, breadcrumbs, pagination
- **Feedback** (5): alerts, toasts, progress, skeleton
- **Overlay** (3): dialog, dropdown, popover
- **Data Display** (2): table, badge

Each test includes:

- Prompt text
- Expected shadcn/ui components
- Expected props
- Must-include patterns

### `expanded-patterns-tests.ts`

40+ expanded patterns from research:

- **Next.js App Router** (7): server components, client components, server actions, dynamic routes, layouts, error boundaries, loading states
- **InstantDB** (7): queries (InstaQL), mutations (InstaML), auth, presence, file upload, relationships, optimistic updates
- **Shadcn/UI** (7): advanced tables, forms with react-hook-form, dialogs, command palette, data tables, combobox, multi-select
- **Radix UI** (7): dialog composition, dropdown with submenu, popover positioning, accordion, tabs, toast, context menu
- **Tailwind CSS** (6): responsive grids, dark mode, animations, custom utilities, container queries, aspect ratio

Each test includes:

- Prompt text
- Expected patterns
- Must-include items
- Must-not-include items (e.g., `'use client'` in server components)

### `test-runner.ts`

Automated test runner with comprehensive validation:

**Validation Checks:**

1. **Syntax**: Valid TypeScript/TSX code
2. **Imports**: Correct shadcn/ui imports (`@/components/ui/*`)
3. **Props**: Type-safe component props
4. **Accessibility**: ARIA attributes and semantic HTML
5. **Patterns**: Matches Intent Dictionary specifications
6. **Next.js**: Correct `'use client'` directive usage
7. **InstantDB**: Valid InstaQL/InstaML syntax

**Scoring:**

- **Intent Dictionary tests**: 70% threshold (strict)
- **Expanded Pattern tests**: 60% threshold (lenient)

## Running Tests

### Option 1: In Google Colab (Recommended)

The Colab notebook includes a test cell that validates the model:

```python
# Run the test cell in notebooks/mycontext-gpt2-finetuning.ipynb
```

This will:

1. Load 11 test prompts covering all categories
2. Generate code for each prompt
3. Validate syntax, imports, and JSX
4. Calculate success rate
5. Save results to `gpt2_validation_results.json`

### Option 2: Using Test Runner (Local)

```bash
# Install dependencies
npm install

# Set Hugging Face API key
export HUGGINGFACE_API_KEY=your_key_here

# Run all tests
npx tsx tests/model-validation/test-runner.ts
```

This will:

1. Run all 70+ tests
2. Generate comprehensive validation reports
3. Save results to `tests/model-validation/results/`

## Test Results

Results are saved in two formats:

### `results/test-report.json`

JSON format with detailed results for each test:

```json
{
  "modelId": "faraja/mycontext-gpt2-medium-merged",
  "testDate": "2025-10-09T...",
  "totalTests": 70,
  "passedTests": 52,
  "failedTests": 18,
  "averageScore": 74.5,
  "categoryScores": {
    "Intent Dictionary": 78.2,
    "Expanded Patterns": 68.9
  },
  "results": [...]
}
```

### `results/RESULTS.md`

Markdown report with:

- Overall metrics (accuracy, pass rate, average score)
- Category-specific scores
- Detailed test results with validation checks
- Known issues and recommendations

## Interpreting Results

### Success Criteria

- ✅ **Excellent**: 80%+ score
- ✅ **Good**: 70-79% score
- ⚠️ **Acceptable**: 60-69% score
- ❌ **Needs Work**: <60% score

### Common Issues

1. **Missing 'use client' directive**

   - Fix: Add more client component examples to training data

2. **InstantDB syntax errors**

   - Fix: Increase InstantDB pattern coverage in training

3. **Incomplete component structures**
   - Fix: Fine-tune with larger model (GPT-2 XL) or more epochs

## Next Steps

After validation:

1. **Review Results** - Check `results/RESULTS.md`
2. **Document Findings** - Update model performance docs
3. **Iterate** - Retrain with improved data if needed
4. **Integrate** - Add GPT-2 client to MyContext CLI (Phase A)

## Validation Checklist

- [ ] 80+ test prompts created
- [ ] Test runner executes successfully
- [ ] Results documented in RESULTS.md
- [ ] Quality >= 70% for core patterns
- [ ] Quality >= 60% for expanded patterns
- [ ] Comparison with Claude/XAI complete

## Model Comparison

| Metric        | GPT-2 (Free) | Claude    | XAI       |
| ------------- | ------------ | --------- | --------- |
| Accuracy      | TBD%         | 90%       | 85%       |
| Speed         | Fast         | Medium    | Fast      |
| Cost          | $0           | $$        | $         |
| Token Limit   | 1024         | 200k      | 128k      |
| Pattern Match | TBD          | Excellent | Very Good |

---

**🎯 Goal**: Validate that the free GPT-2 model learned Intent Dictionary patterns and can generate production-quality components!
