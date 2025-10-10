# MyContext AI GPT-2 Testing Guide

Complete guide for testing the fine-tuned GPT-2 model against Intent Dictionary and expanded UI patterns.

## 🎯 Quick Start (Colab)

The easiest way to test your model is in the Colab notebook:

1. **Open** `notebooks/mycontext-gpt2-finetuning.ipynb` in Google Colab
2. **Find** the "Model Validation" section (Cell 12-13)
3. **Run** the validation cell
4. **Review** results in `gpt2_validation_results.json`

**Expected output:**

```
🧪 Testing MyContext AI (GPT-2 Medium) against Intent Dictionary patterns...

[1/11] Testing: Create a login form with email and password using shadcn/ui...
    ✅ Valid: True | Import: True | Export: True | JSX: True

...

🎯 Testing Complete!
   Total Tests: 11
   Passed: 9
   Success Rate: 81.8%
```

## 📊 Test Coverage

### Intent Dictionary Patterns (30 tests)

**Core UI Components** (10 patterns)

- ✅ button-primary, button-secondary, button-destructive
- ✅ input-text, input-email, input-password
- ✅ form-login, form-signup, form-contact
- ✅ card-basic

**Form Components** (5 patterns)

- ✅ checkbox, radio-group, select-dropdown
- ✅ textarea, switch-toggle

**Navigation** (5 patterns)

- ✅ nav-header, nav-sidebar, nav-tabs
- ✅ breadcrumbs, pagination

**Feedback** (5 patterns)

- ✅ alert-success, alert-error, toast-notification
- ✅ progress-bar, skeleton-loader

**Overlay** (3 patterns)

- ✅ modal-dialog, dropdown-menu, popover

**Data Display** (2 patterns)

- ✅ table-data, badge-status

### Expanded Patterns (40+ tests)

**Next.js App Router** (7 tests)

- Server components with async data fetching
- Client components with hooks
- Server actions for form submission
- Dynamic routes with params
- Layouts with nested children
- Error boundary components
- Loading skeleton components

**InstantDB** (7 tests)

- InstaQL queries (`db.useQuery`)
- InstaML mutations (`db.transact`)
- Magic code authentication
- Real-time presence
- File upload
- Relationship queries
- Optimistic updates

**Shadcn/UI** (7 tests)

- Advanced tables with sorting
- Forms with react-hook-form
- Controlled dialogs
- Command palette
- Data tables with filters
- Async combobox
- Multi-select components

**Radix UI** (7 tests)

- Dialog composition
- Dropdown with submenu
- Popover positioning
- Accordion panels
- Tabs with lazy loading
- Toast system
- Context menu

**Tailwind CSS** (6 tests)

- Responsive grids
- Dark mode support
- Animations
- Custom utilities
- Container queries
- Aspect ratio

## 🔍 Validation Checks

Each generated component is validated against 7 criteria:

### 1. **TypeScript Syntax** (25 points)

- Has import statements
- Has export declaration
- Has variable declarations
- Contains JSX/TSX elements

### 2. **Component Imports** (15 points)

- Correct shadcn/ui imports (`@/components/ui/*`)
- Matches expected components for pattern

### 3. **Component Props** (15 points)

- Type-safe prop definitions
- Includes expected props for pattern

### 4. **Accessibility** (15 points)

- ARIA attributes present
- Semantic HTML usage
- Label associations

### 5. **Pattern Adherence** (15 points)

- Contains required code patterns
- Matches Intent Dictionary spec

### 6. **Next.js Compliance** (10 points)

- Correct `'use client'` usage
- Server component patterns
- No forbidden patterns

### 7. **InstantDB Patterns** (5 points)

- Valid InstaQL/InstaML syntax
- Correct API usage

**Scoring:**

- **90-100%**: Excellent ✅
- **70-89%**: Good ✅
- **60-69%**: Acceptable ⚠️
- **<60%**: Needs Work ❌

## 🚀 Advanced Testing (CLI)

For comprehensive testing with detailed reports:

### Prerequisites

```bash
# Install dependencies
npm install

# Install Hugging Face Inference package
npm install @huggingface/inference

# Set API key
export HUGGINGFACE_API_KEY=your_key_here
```

### Run Full Test Suite

```bash
# Run all 70+ tests
npx tsx tests/model-validation/test-runner.ts
```

This will:

1. Test all 30 Intent Dictionary patterns
2. Test all 40+ expanded patterns
3. Generate comprehensive validation reports
4. Save results to `tests/model-validation/results/`

### Expected Output

```
🚀 Starting model validation...

📊 Running Intent Dictionary tests (30 patterns)...
  Testing: button-primary...
    ✅ Score: 85.7%
  Testing: input-text...
    ✅ Score: 92.3%
  ...

📊 Running Expanded Pattern tests (40+ patterns)...
  Testing: nextjs-server-component...
    ✅ Score: 78.5%
  Testing: instantdb-query...
    ⚠️ Score: 65.2%
  ...

✅ Reports saved:
   JSON: tests/model-validation/results/test-report.json
   Markdown: tests/model-validation/results/RESULTS.md

🎉 Testing complete!
   Average Score: 76.8%
   Passed: 54/70
```

## 📝 Test Results

### JSON Report (`results/test-report.json`)

```json
{
  "modelId": "faraja/mycontext-gpt2-medium-merged",
  "testDate": "2025-10-09T...",
  "totalTests": 70,
  "passedTests": 54,
  "failedTests": 16,
  "averageScore": 76.8,
  "categoryScores": {
    "Intent Dictionary": 82.5,
    "Expanded Patterns": 68.3
  },
  "results": [
    {
      "testId": "button-primary",
      "prompt": "Create a primary button...",
      "generated": "import { Button } from ...",
      "passed": true,
      "score": 85.7,
      "checks": [...]
    }
  ]
}
```

### Markdown Report (`results/RESULTS.md`)

Comprehensive report with:

- Overall metrics
- Category-specific scores
- Detailed test results
- Validation check breakdowns
- Known issues
- Recommendations

## 🎯 Success Criteria

Your GPT-2 model is ready for integration if:

- ✅ **70%+ average score** across all tests
- ✅ **80%+ score** on Intent Dictionary patterns
- ✅ **60%+ score** on expanded patterns
- ✅ **90%+ TypeScript syntax** validity
- ✅ **80%+ shadcn/ui import** accuracy

## 🔧 Troubleshooting

### Common Issues

**1. Missing 'use client' directive**

```typescript
// Wrong (hooks without 'use client')
import { useState } from 'react';
export default function Component() {...}

// Correct
'use client';
import { useState } from 'react';
export default function Component() {...}
```

**Fix**: Add more client component examples to training data

**2. InstantDB syntax errors**

```typescript
// Wrong
db.query({ users: {} });

// Correct
db.useQuery({ users: {} });
```

**Fix**: Increase InstantDB pattern coverage

**3. Incomplete component structures**

```typescript
// Wrong (incomplete)
import { Button } from "@/components/ui/button";

// Correct
import { Button } from "@/components/ui/button";
export default function MyButton() {
  return <Button>Click me</Button>;
}
```

**Fix**: Fine-tune with more epochs or larger model

## 📈 Performance Benchmarks

### Expected Performance (GPT-2 Medium)

| Metric             | Target | Actual |
| ------------------ | ------ | ------ |
| Intent Dictionary  | 80%    | TBD%   |
| Expanded Patterns  | 60%    | TBD%   |
| TypeScript Syntax  | 90%    | TBD%   |
| Shadcn Imports     | 80%    | TBD%   |
| Pattern Adherence  | 75%    | TBD%   |
| Next.js Compliance | 70%    | TBD%   |
| InstantDB Patterns | 65%    | TBD%   |

### Model Comparison

| Model            | Size | Accuracy | Speed  | Cost | Token Limit |
| ---------------- | ---- | -------- | ------ | ---- | ----------- |
| **GPT-2 Medium** | 355M | TBD%     | Fast   | $0   | 1024        |
| GPT-2 Large      | 1.5B | +10%     | Medium | $0   | 1024        |
| Claude 3.5       | -    | 90%      | Medium | $$   | 200k        |
| XAI Grok         | -    | 85%      | Fast   | $    | 128k        |

## 🎓 Next Steps

After testing:

### If Score >= 70%

1. ✅ **Document Results** - Save to `RESULTS.md`
2. ✅ **Integrate CLI** - Create `MyContextGPT2Client.ts`
3. ✅ **Update Docs** - Add free tier guide
4. ✅ **Deploy** - Add to provider chain

### If Score < 70%

1. ⚠️ **Analyze Failures** - Review failed test patterns
2. ⚠️ **Improve Training Data** - Add more examples for weak areas
3. ⚠️ **Retrain** - Run fine-tuning with improvements
4. ⚠️ **Re-test** - Validate improvements

## 📚 Additional Resources

- [Intent Dictionary System](../../docs/intent-dictionary-system.md)
- [Fine-tuning Strategy](../../docs/fine-tuning-strategy.md)
- [Colab Notebook](../../notebooks/mycontext-gpt2-finetuning.ipynb)
- [Test Runner Source](./test-runner.ts)

---

**🎉 Happy Testing!** Your free MyContext AI model is ready to be validated! 🚀
