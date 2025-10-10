/**
 * Expanded Pattern Test Prompts
 *
 * Test suite for 500+ expanded UI patterns from research:
 * - Next.js App Router (server/client components)
 * - InstantDB (InstaQL, InstaML, auth, storage)
 * - Shadcn/UI (advanced components)
 * - Radix UI (primitives composition)
 * - Tailwind CSS (responsive, dark mode, animations)
 */

export interface ExpandedTestPrompt {
  id: string;
  category: string;
  subcategory: string;
  prompt: string;
  expectedPatterns: string[];
  mustInclude: string[];
  mustNotInclude: string[];
}

export const expandedPatternTests: ExpandedTestPrompt[] = [
  // ============================================================================
  // Next.js App Router Patterns (7 patterns)
  // ============================================================================
  {
    id: "nextjs-server-component",
    category: "Next.js App Router",
    subcategory: "Server Components",
    prompt:
      "Create a Next.js server component that fetches data with InstantDB",
    expectedPatterns: ["async function", "db.useQuery", "export default"],
    mustInclude: ["async", "await", "export default"],
    mustNotInclude: ["'use client'", "useState", "useEffect"],
  },
  {
    id: "nextjs-client-component",
    category: "Next.js App Router",
    subcategory: "Client Components",
    prompt: "Create a Next.js client component with useState and useEffect",
    expectedPatterns: ["'use client'", "useState", "useEffect"],
    mustInclude: ["'use client'", "import { useState", "import { useEffect"],
    mustNotInclude: ["async function"],
  },
  {
    id: "nextjs-server-action",
    category: "Next.js App Router",
    subcategory: "Server Actions",
    prompt: "Create a server action for form submission in Next.js",
    expectedPatterns: ["'use server'", "async function", "formData"],
    mustInclude: ["'use server'", "async function", "FormData"],
    mustNotInclude: ["'use client'"],
  },
  {
    id: "nextjs-dynamic-route",
    category: "Next.js App Router",
    subcategory: "Dynamic Routes",
    prompt: "Create a Next.js dynamic route component with params",
    expectedPatterns: ["params", "generateStaticParams"],
    mustInclude: ["params", "async"],
    mustNotInclude: ["'use client'"],
  },
  {
    id: "nextjs-layout",
    category: "Next.js App Router",
    subcategory: "Layouts",
    prompt: "Create a Next.js layout component with nested children",
    expectedPatterns: ["children", "RootLayout", "Metadata"],
    mustInclude: ["children: React.ReactNode", "export default"],
    mustNotInclude: ["'use client'"],
  },
  {
    id: "nextjs-error-boundary",
    category: "Next.js App Router",
    subcategory: "Error Handling",
    prompt: "Create a Next.js error boundary component",
    expectedPatterns: ["'use client'", "error", "reset"],
    mustInclude: ["'use client'", "error: Error", "reset: () => void"],
    mustNotInclude: [],
  },
  {
    id: "nextjs-loading",
    category: "Next.js App Router",
    subcategory: "Loading States",
    prompt: "Create a Next.js loading skeleton component",
    expectedPatterns: ["Skeleton", "export default"],
    mustInclude: ["Skeleton", "@/components/ui/skeleton"],
    mustNotInclude: ["'use client'"],
  },

  // ============================================================================
  // InstantDB Patterns (7 patterns)
  // ============================================================================
  {
    id: "instantdb-query",
    category: "InstantDB",
    subcategory: "Queries",
    prompt:
      "Create a component that queries users with InstantDB using db.useQuery",
    expectedPatterns: ["db.useQuery", "const { data, isLoading, error }"],
    mustInclude: ["db.useQuery", "'use client'", "isLoading", "error"],
    mustNotInclude: ["db.transact"],
  },
  {
    id: "instantdb-mutation",
    category: "InstantDB",
    subcategory: "Mutations",
    prompt:
      "Create a component that adds a new post using InstantDB db.transact",
    expectedPatterns: ["db.transact", "db.tx"],
    mustInclude: ["db.transact", "db.tx", "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "instantdb-auth-magic-code",
    category: "InstantDB",
    subcategory: "Authentication",
    prompt: "Create a login component with InstantDB magic code authentication",
    expectedPatterns: ["db.auth.sendMagicCode", "db.auth.signInWithMagicCode"],
    mustInclude: [
      "db.auth.sendMagicCode",
      "db.auth.signInWithMagicCode",
      "'use client'",
    ],
    mustNotInclude: [],
  },
  {
    id: "instantdb-presence",
    category: "InstantDB",
    subcategory: "Real-time",
    prompt: "Create a component showing online users with InstantDB presence",
    expectedPatterns: ["db.room", "db.rooms.usePresence"],
    mustInclude: ["db.room", "usePresence", "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "instantdb-file-upload",
    category: "InstantDB",
    subcategory: "Storage",
    prompt: "Create a file upload component using InstantDB storage",
    expectedPatterns: ["db.storage.uploadFile", "useState"],
    mustInclude: ["db.storage.uploadFile", 'input type="file"', "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "instantdb-relationships",
    category: "InstantDB",
    subcategory: "Relationships",
    prompt:
      "Create a component that queries posts with author relationship using InstantDB",
    expectedPatterns: ["db.useQuery", "author: {}"],
    mustInclude: ["db.useQuery", "posts: {", "author: {", "}"],
    mustNotInclude: [],
  },
  {
    id: "instantdb-optimistic-update",
    category: "InstantDB",
    subcategory: "Optimistic Updates",
    prompt: "Create a todo list with optimistic updates using InstantDB",
    expectedPatterns: ["db.transact", "db.tx", "useState"],
    mustInclude: ["db.transact", "db.tx", "'use client'", "useState"],
    mustNotInclude: [],
  },

  // ============================================================================
  // Shadcn/UI Component Patterns (7 patterns)
  // ============================================================================
  {
    id: "shadcn-table-sorting",
    category: "Shadcn/UI",
    subcategory: "Tables",
    prompt: "Create a data table with sorting and pagination using shadcn/ui",
    expectedPatterns: ["Table", "TableHeader", "useState"],
    mustInclude: ["@/components/ui/table", "useState", "sort", "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "shadcn-form-react-hook-form",
    category: "Shadcn/UI",
    subcategory: "Forms",
    prompt:
      "Create a form with react-hook-form and zod validation using shadcn/ui",
    expectedPatterns: ["useForm", "zodResolver", "Form"],
    mustInclude: [
      "@/components/ui/form",
      "useForm",
      "zodResolver",
      "zod",
      "'use client'",
    ],
    mustNotInclude: [],
  },
  {
    id: "shadcn-dialog-controlled",
    category: "Shadcn/UI",
    subcategory: "Dialogs",
    prompt: "Create a controlled dialog component with form submission",
    expectedPatterns: ["Dialog", "useState", "onOpenChange"],
    mustInclude: [
      "@/components/ui/dialog",
      "useState",
      "open",
      "onOpenChange",
      "'use client'",
    ],
    mustNotInclude: [],
  },
  {
    id: "shadcn-command-palette",
    category: "Shadcn/UI",
    subcategory: "Command",
    prompt: "Create a command palette with search functionality",
    expectedPatterns: ["Command", "CommandInput", "CommandList"],
    mustInclude: ["@/components/ui/command", "CommandInput", "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "shadcn-data-table-filters",
    category: "Shadcn/UI",
    subcategory: "Data Tables",
    prompt: "Create a data table with column filters and search",
    expectedPatterns: ["Table", "Input", "useState"],
    mustInclude: [
      "@/components/ui/table",
      "@/components/ui/input",
      "filter",
      "'use client'",
    ],
    mustNotInclude: [],
  },
  {
    id: "shadcn-combobox-async",
    category: "Shadcn/UI",
    subcategory: "Combobox",
    prompt: "Create a combobox with async search using shadcn/ui",
    expectedPatterns: ["Popover", "Command", "useState", "useEffect"],
    mustInclude: [
      "@/components/ui/popover",
      "@/components/ui/command",
      "useState",
      "'use client'",
    ],
    mustNotInclude: [],
  },
  {
    id: "shadcn-multi-select",
    category: "Shadcn/UI",
    subcategory: "Multi-Select",
    prompt: "Create a multi-select component with checkboxes",
    expectedPatterns: ["Checkbox", "Popover", "useState"],
    mustInclude: [
      "@/components/ui/checkbox",
      "@/components/ui/popover",
      "useState",
      "'use client'",
    ],
    mustNotInclude: [],
  },

  // ============================================================================
  // Radix UI Primitive Patterns (7 patterns)
  // ============================================================================
  {
    id: "radix-dialog-composition",
    category: "Radix UI",
    subcategory: "Dialog",
    prompt:
      "Create a custom dialog using Radix UI primitives with custom styling",
    expectedPatterns: ["Dialog.Root", "Dialog.Trigger", "Dialog.Content"],
    mustInclude: ["@radix-ui/react-dialog", "Dialog.Root", "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "radix-dropdown-submenu",
    category: "Radix UI",
    subcategory: "Dropdown",
    prompt: "Create a dropdown menu with nested submenus using Radix UI",
    expectedPatterns: ["DropdownMenu.Root", "DropdownMenu.Sub"],
    mustInclude: [
      "@radix-ui/react-dropdown-menu",
      "DropdownMenu.Sub",
      "'use client'",
    ],
    mustNotInclude: [],
  },
  {
    id: "radix-popover-positioning",
    category: "Radix UI",
    subcategory: "Popover",
    prompt: "Create a popover with custom anchor positioning using Radix UI",
    expectedPatterns: ["Popover.Root", "Popover.Anchor"],
    mustInclude: ["@radix-ui/react-popover", "Popover.Anchor", "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "radix-accordion-multiple",
    category: "Radix UI",
    subcategory: "Accordion",
    prompt: "Create an accordion with multiple expandable panels",
    expectedPatterns: ["Accordion.Root", "Accordion.Item"],
    mustInclude: [
      "@radix-ui/react-accordion",
      'type="multiple"',
      "'use client'",
    ],
    mustNotInclude: [],
  },
  {
    id: "radix-tabs-lazy",
    category: "Radix UI",
    subcategory: "Tabs",
    prompt: "Create tabs with lazy loading content using Radix UI",
    expectedPatterns: ["Tabs.Root", "Tabs.Content", "useState"],
    mustInclude: ["@radix-ui/react-tabs", "Tabs.Content", "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "radix-toast-system",
    category: "Radix UI",
    subcategory: "Toast",
    prompt: "Create a toast notification system using Radix UI primitives",
    expectedPatterns: ["Toast.Provider", "Toast.Root"],
    mustInclude: ["@radix-ui/react-toast", "Toast.Provider", "'use client'"],
    mustNotInclude: [],
  },
  {
    id: "radix-context-menu-nested",
    category: "Radix UI",
    subcategory: "Context Menu",
    prompt: "Create a context menu with nested items using Radix UI",
    expectedPatterns: ["ContextMenu.Root", "ContextMenu.Sub"],
    mustInclude: [
      "@radix-ui/react-context-menu",
      "ContextMenu.Sub",
      "'use client'",
    ],
    mustNotInclude: [],
  },

  // ============================================================================
  // Tailwind CSS Patterns (6 patterns)
  // ============================================================================
  {
    id: "tailwind-responsive-grid",
    category: "Tailwind CSS",
    subcategory: "Layouts",
    prompt: "Create a responsive grid layout with Tailwind CSS",
    expectedPatterns: ["grid", "grid-cols", "gap"],
    mustInclude: ["grid", "grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3"],
    mustNotInclude: [],
  },
  {
    id: "tailwind-dark-mode",
    category: "Tailwind CSS",
    subcategory: "Dark Mode",
    prompt: "Create a component with dark mode support using Tailwind CSS",
    expectedPatterns: ["dark:", "bg-white", "dark:bg-gray-900"],
    mustInclude: ["dark:", "bg-", "text-"],
    mustNotInclude: [],
  },
  {
    id: "tailwind-animations",
    category: "Tailwind CSS",
    subcategory: "Animations",
    prompt: "Create an animated component with Tailwind CSS transitions",
    expectedPatterns: ["transition", "duration", "ease"],
    mustInclude: ["transition", "hover:", "duration-"],
    mustNotInclude: [],
  },
  {
    id: "tailwind-custom-utilities",
    category: "Tailwind CSS",
    subcategory: "Custom Classes",
    prompt: "Create a component using Tailwind CSS custom utility classes",
    expectedPatterns: ["className", "cn"],
    mustInclude: ["className", "cn("],
    mustNotInclude: [],
  },
  {
    id: "tailwind-container-queries",
    category: "Tailwind CSS",
    subcategory: "Container Queries",
    prompt:
      "Create a responsive component using Tailwind CSS container queries",
    expectedPatterns: ["@container", "container-type"],
    mustInclude: ["@container", "container"],
    mustNotInclude: [],
  },
  {
    id: "tailwind-aspect-ratio",
    category: "Tailwind CSS",
    subcategory: "Aspect Ratio",
    prompt: "Create a component with aspect ratio utilities using Tailwind CSS",
    expectedPatterns: ["aspect-", "aspect-video", "aspect-square"],
    mustInclude: ["aspect-"],
    mustNotInclude: [],
  },
];

/**
 * Get tests by category
 */
export function getExpandedTestsByCategory(
  category: string
): ExpandedTestPrompt[] {
  return expandedPatternTests.filter((test) => test.category === category);
}

/**
 * Get tests by subcategory
 */
export function getExpandedTestsBySubcategory(
  subcategory: string
): ExpandedTestPrompt[] {
  return expandedPatternTests.filter(
    (test) => test.subcategory === subcategory
  );
}

/**
 * Get all categories
 */
export function getExpandedTestCategories(): string[] {
  return Array.from(new Set(expandedPatternTests.map((test) => test.category)));
}

/**
 * Export as JSONL for model testing
 */
export function exportExpandedAsJSONL(): string {
  return expandedPatternTests
    .map((test) => JSON.stringify({ prompt: test.prompt, id: test.id }))
    .join("\n");
}
