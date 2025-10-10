/**
 * Intent Dictionary Test Prompts
 *
 * Comprehensive test suite for validating GPT-2 model against
 * all 30 core Intent Dictionary patterns.
 */

export interface TestPrompt {
  id: string;
  category: string;
  pattern: string;
  prompt: string;
  expectedComponents: string[];
  expectedProps: string[];
  mustInclude: string[];
}

export const intentDictionaryTests: TestPrompt[] = [
  // ============================================================================
  // Core UI Components (10 patterns)
  // ============================================================================
  {
    id: "button-primary",
    category: "Core UI Components",
    pattern: "button-primary",
    prompt: "Create a primary button component with loading state",
    expectedComponents: ["Button"],
    expectedProps: ["variant", "disabled", "onClick"],
    mustInclude: ["@/components/ui/button", 'variant="default"'],
  },
  {
    id: "button-secondary",
    category: "Core UI Components",
    pattern: "button-secondary",
    prompt: "Create a secondary button component with icon",
    expectedComponents: ["Button"],
    expectedProps: ["variant", "disabled"],
    mustInclude: ["@/components/ui/button", 'variant="secondary"'],
  },
  {
    id: "button-destructive",
    category: "Core UI Components",
    pattern: "button-destructive",
    prompt: "Create a destructive button for delete actions",
    expectedComponents: ["Button"],
    expectedProps: ["variant", "onClick"],
    mustInclude: ["@/components/ui/button", 'variant="destructive"'],
  },
  {
    id: "input-text",
    category: "Core UI Components",
    pattern: "input-text",
    prompt: "Create a text input field with label",
    expectedComponents: ["Input", "Label"],
    expectedProps: ["type", "placeholder", "value", "onChange"],
    mustInclude: ["@/components/ui/input", 'type="text"'],
  },
  {
    id: "input-email",
    category: "Core UI Components",
    pattern: "input-email",
    prompt: "Create an email input with validation",
    expectedComponents: ["Input", "Label"],
    expectedProps: ["type", "placeholder", "required"],
    mustInclude: ["@/components/ui/input", 'type="email"'],
  },
  {
    id: "input-password",
    category: "Core UI Components",
    pattern: "input-password",
    prompt: "Create a password input with show/hide toggle",
    expectedComponents: ["Input", "Button"],
    expectedProps: ["type", "placeholder"],
    mustInclude: ["@/components/ui/input", 'type="password"', "useState"],
  },
  {
    id: "form-login",
    category: "Core UI Components",
    pattern: "form-login",
    prompt:
      "Create a login form with email and password fields using shadcn/ui",
    expectedComponents: ["Form", "Input", "Button", "Label"],
    expectedProps: ["onSubmit", "type", "required"],
    mustInclude: [
      "@/components/ui/form",
      "@/components/ui/input",
      "@/components/ui/button",
      "react-hook-form",
    ],
  },
  {
    id: "form-signup",
    category: "Core UI Components",
    pattern: "form-signup",
    prompt: "Create a signup form with name, email, and password",
    expectedComponents: ["Form", "Input", "Button"],
    expectedProps: ["onSubmit", "type"],
    mustInclude: ["@/components/ui/form", "react-hook-form", "zod"],
  },
  {
    id: "form-contact",
    category: "Core UI Components",
    pattern: "form-contact",
    prompt: "Create a contact form with name, email, and message fields",
    expectedComponents: ["Form", "Input", "Textarea", "Button"],
    expectedProps: ["onSubmit"],
    mustInclude: ["@/components/ui/form", "@/components/ui/textarea"],
  },
  {
    id: "card-basic",
    category: "Core UI Components",
    pattern: "card-basic",
    prompt: "Create a basic card component with header, content, and footer",
    expectedComponents: ["Card", "CardHeader", "CardContent", "CardFooter"],
    expectedProps: [],
    mustInclude: ["@/components/ui/card"],
  },

  // ============================================================================
  // Form Components (5 patterns)
  // ============================================================================
  {
    id: "checkbox",
    category: "Form Components",
    pattern: "checkbox",
    prompt: "Create a checkbox with label using shadcn/ui",
    expectedComponents: ["Checkbox", "Label"],
    expectedProps: ["checked", "onCheckedChange"],
    mustInclude: ["@/components/ui/checkbox"],
  },
  {
    id: "radio-group",
    category: "Form Components",
    pattern: "radio-group",
    prompt: "Create a radio button group with multiple options",
    expectedComponents: ["RadioGroup", "RadioGroupItem", "Label"],
    expectedProps: ["value", "onValueChange"],
    mustInclude: ["@/components/ui/radio-group"],
  },
  {
    id: "select-dropdown",
    category: "Form Components",
    pattern: "select-dropdown",
    prompt: "Create a select dropdown with multiple options",
    expectedComponents: [
      "Select",
      "SelectTrigger",
      "SelectContent",
      "SelectItem",
    ],
    expectedProps: ["value", "onValueChange"],
    mustInclude: ["@/components/ui/select"],
  },
  {
    id: "textarea",
    category: "Form Components",
    pattern: "textarea",
    prompt: "Create a textarea component with character count",
    expectedComponents: ["Textarea", "Label"],
    expectedProps: ["value", "onChange", "maxLength"],
    mustInclude: ["@/components/ui/textarea", "useState"],
  },
  {
    id: "switch-toggle",
    category: "Form Components",
    pattern: "switch-toggle",
    prompt: "Create a switch toggle for settings",
    expectedComponents: ["Switch", "Label"],
    expectedProps: ["checked", "onCheckedChange"],
    mustInclude: ["@/components/ui/switch"],
  },

  // ============================================================================
  // Navigation (5 patterns)
  // ============================================================================
  {
    id: "nav-header",
    category: "Navigation",
    pattern: "nav-header",
    prompt: "Create a header navigation with logo and menu items",
    expectedComponents: ["NavigationMenu"],
    expectedProps: [],
    mustInclude: ["@/components/ui/navigation-menu", "Link"],
  },
  {
    id: "nav-sidebar",
    category: "Navigation",
    pattern: "nav-sidebar",
    prompt: "Create a sidebar navigation with collapsible sections",
    expectedComponents: ["Collapsible", "Button"],
    expectedProps: ["open", "onOpenChange"],
    mustInclude: ["@/components/ui/collapsible", "useState"],
  },
  {
    id: "nav-tabs",
    category: "Navigation",
    pattern: "nav-tabs",
    prompt: "Create tabs navigation with multiple panels",
    expectedComponents: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"],
    expectedProps: ["value", "onValueChange"],
    mustInclude: ["@/components/ui/tabs"],
  },
  {
    id: "breadcrumbs",
    category: "Navigation",
    pattern: "breadcrumbs",
    prompt: "Create breadcrumb navigation for hierarchical pages",
    expectedComponents: ["Breadcrumb"],
    expectedProps: [],
    mustInclude: ["@/components/ui/breadcrumb", "Link"],
  },
  {
    id: "pagination",
    category: "Navigation",
    pattern: "pagination",
    prompt: "Create pagination component with page numbers",
    expectedComponents: ["Pagination"],
    expectedProps: ["currentPage", "totalPages", "onPageChange"],
    mustInclude: ["@/components/ui/pagination", "Button"],
  },

  // ============================================================================
  // Feedback (5 patterns)
  // ============================================================================
  {
    id: "alert-success",
    category: "Feedback",
    pattern: "alert-success",
    prompt: "Create a success alert message component",
    expectedComponents: ["Alert", "AlertTitle", "AlertDescription"],
    expectedProps: ["variant"],
    mustInclude: ["@/components/ui/alert", "variant"],
  },
  {
    id: "alert-error",
    category: "Feedback",
    pattern: "alert-error",
    prompt: "Create an error alert message component",
    expectedComponents: ["Alert", "AlertTitle", "AlertDescription"],
    expectedProps: ["variant"],
    mustInclude: ["@/components/ui/alert", 'variant="destructive"'],
  },
  {
    id: "toast-notification",
    category: "Feedback",
    pattern: "toast-notification",
    prompt: "Create a toast notification system using shadcn/ui",
    expectedComponents: ["useToast", "Toaster"],
    expectedProps: [],
    mustInclude: ["@/components/ui/use-toast", "@/components/ui/toaster"],
  },
  {
    id: "progress-bar",
    category: "Feedback",
    pattern: "progress-bar",
    prompt: "Create a progress bar component with percentage",
    expectedComponents: ["Progress"],
    expectedProps: ["value"],
    mustInclude: ["@/components/ui/progress"],
  },
  {
    id: "skeleton-loader",
    category: "Feedback",
    pattern: "skeleton-loader",
    prompt: "Create skeleton loading placeholders",
    expectedComponents: ["Skeleton"],
    expectedProps: [],
    mustInclude: ["@/components/ui/skeleton"],
  },

  // ============================================================================
  // Overlay (3 patterns)
  // ============================================================================
  {
    id: "modal-dialog",
    category: "Overlay",
    pattern: "modal-dialog",
    prompt: "Create a modal dialog with form submission",
    expectedComponents: [
      "Dialog",
      "DialogTrigger",
      "DialogContent",
      "DialogHeader",
    ],
    expectedProps: ["open", "onOpenChange"],
    mustInclude: ["@/components/ui/dialog", "useState"],
  },
  {
    id: "dropdown-menu",
    category: "Overlay",
    pattern: "dropdown-menu",
    prompt: "Create a dropdown menu with multiple actions",
    expectedComponents: [
      "DropdownMenu",
      "DropdownMenuTrigger",
      "DropdownMenuContent",
      "DropdownMenuItem",
    ],
    expectedProps: [],
    mustInclude: ["@/components/ui/dropdown-menu"],
  },
  {
    id: "popover",
    category: "Overlay",
    pattern: "popover",
    prompt: "Create a popover component with custom content",
    expectedComponents: ["Popover", "PopoverTrigger", "PopoverContent"],
    expectedProps: ["open", "onOpenChange"],
    mustInclude: ["@/components/ui/popover"],
  },

  // ============================================================================
  // Data Display (2 patterns)
  // ============================================================================
  {
    id: "table-data",
    category: "Data Display",
    pattern: "table-data",
    prompt: "Create a data table with sorting using shadcn/ui Table component",
    expectedComponents: [
      "Table",
      "TableHeader",
      "TableBody",
      "TableRow",
      "TableCell",
    ],
    expectedProps: [],
    mustInclude: ["@/components/ui/table", "useState"],
  },
  {
    id: "badge-status",
    category: "Data Display",
    pattern: "badge-status",
    prompt: "Create status badges with different variants",
    expectedComponents: ["Badge"],
    expectedProps: ["variant"],
    mustInclude: ["@/components/ui/badge"],
  },
];

/**
 * Get tests by category
 */
export function getTestsByCategory(category: string): TestPrompt[] {
  return intentDictionaryTests.filter((test) => test.category === category);
}

/**
 * Get test by pattern ID
 */
export function getTestByPattern(patternId: string): TestPrompt | undefined {
  return intentDictionaryTests.find((test) => test.id === patternId);
}

/**
 * Get all test categories
 */
export function getTestCategories(): string[] {
  return Array.from(
    new Set(intentDictionaryTests.map((test) => test.category))
  );
}

/**
 * Export as JSONL for model testing
 */
export function exportAsJSONL(): string {
  return intentDictionaryTests
    .map((test) =>
      JSON.stringify({ prompt: test.prompt, pattern: test.pattern })
    )
    .join("\n");
}
