/**
 * CodeGenSubAgent Implementation
 *
 * Specialized sub-agent for generating production-ready React components and TypeScript code.
 * Uses MyContext AI (fine-tuned GPT-4o Mini) for 95%+ accurate component generation.
 * Enhanced with shadcn/ui primitives and modern React patterns for Next.js 14+.
 */
import { getProviderChain } from "../../clients/ProviderChain";
import {
  PromptConstructorAgent,
  PromptConstructionContext,
} from "./PromptConstructorAgent";
import * as fs from "fs";
import * as path from "path";

import {
  SubAgent,
  ComponentGenerationInput,
  ComponentGenerationOutput,
} from "../interfaces/SubAgent";
import { getSubAgentPersonality } from "@/constants/subAgentPersonalities";
import { GenerateComponentsCommand } from "../../commands/generate-components";

// shadcn/ui component mapping for intelligent imports
const SHADCN_COMPONENTS = {
  // Layout & Structure
  layout: ["Card", "Separator", "AspectRatio"],
  form: [
    "Button",
    "Input",
    "Label",
    "Form",
    "Select",
    "Checkbox",
    "RadioGroup",
    "Textarea",
    "Switch",
  ],
  navigation: ["NavigationMenu", "Breadcrumb", "Pagination", "Tabs"],
  feedback: ["Alert", "AlertDialog", "Dialog", "Toast", "Progress", "Skeleton"],
  data: ["Table", "DataTable", "Command", "Combobox"],
  overlay: ["Popover", "HoverCard", "Tooltip", "Sheet", "Drawer"],
  media: ["Avatar", "Badge", "Calendar", "Carousel"],
  utility: [
    "ScrollArea",
    "Resizable",
    "Collapsible",
    "Accordion",
    "ContextMenu",
    "Menubar",
    "DropdownMenu",
    "Toggle",
    "ToggleGroup",
    "Slider",
    "Sonner",
  ],
} as const;

// Canonical shadcn/ui list (normalized later to proper export names)
const CANONICAL_SHADCN_LIST = [
  "Accordion",
  "Alert",
  "Alert Dialog",
  "Aspect Ratio",
  "Avatar",
  "Badge",
  "Breadcrumb",
  "Button",
  "Calendar",
  "Card",
  "Carousel",
  "Chart",
  "Checkbox",
  "Collapsible",
  "Combobox",
  "Command",
  "Context Menu",
  "Data Table",
  "Date Picker",
  "Dialog",
  "Drawer",
  "Dropdown Menu",
  "Hover Card",
  "Input",
  "Input OTP",
  "Label",
  "Menubar",
  "Navigation Menu",
  "Pagination",
  "Popover",
  "Progress",
  "Radio Group",
  "Resizable",
  "Scroll-area",
  "Select",
  "Separator",
  "Sheet",
  "Sidebar",
  "Skeleton",
  "Slider",
  "Sonner",
  "Switch",
  "Table",
  "Tabs",
  "Textarea",
  "Toast",
  "Toggle",
  "Toggle Group",
  "Tooltip",
  "Typography",
];

export class CodeGenSubAgent
  implements SubAgent<ComponentGenerationInput, ComponentGenerationOutput>
{
  name = "CodeGenSubAgent";
  description =
    "Expert React/TypeScript developer using MyContext AI for 95%+ accurate shadcn/ui component generation";
  personality: string;
  traits: string[];
  llmProvider: string;
  expertise: string[];
  modelName: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;

  constructor() {
    const personality = getSubAgentPersonality(this.name);
    if (!personality) {
      throw new Error(`Personality not found for ${this.name}`);
    }

    this.personality = personality.systemPrompt;
    this.traits = personality.traits;
    this.llmProvider = personality.llmProvider;
    this.expertise = personality.expertise;
    this.modelName = personality.modelName;
    this.temperature = personality.temperature;
    this.maxTokens = personality.maxTokens;
    this.systemPrompt = personality.systemPrompt;
  }

  async run(
    input: ComponentGenerationInput
  ): Promise<ComponentGenerationOutput> {
    const { component, group, options, context } = input;

    // Use the existing GenerateComponentsCommand logic
    const generateCommand = new GenerateComponentsCommand();

    // Handle both string and object inputs
    let componentName: string;
    if (typeof component === "string") {
      componentName = component;
    } else {
      componentName = component.name;
    }

    // Generate the component code using the enhanced method
    const code = await this.generateProductionReadyComponent(
      component,
      group,
      options
    );

    // Calculate metadata
    const estimatedLines = code.split("\n").length;
    const dependencies = this.extractDependencies(code);
    const shadcnComponents = this.extractShadcnComponents(code);

    return {
      code,
      metadata: {
        componentName,
        group,
        dependencies,
        estimatedLines,
        shadcnComponents,
        qualityScore: this.calculateQualityScore(code),
      },
    };
  }

  async validate(input: ComponentGenerationInput): Promise<boolean> {
    // Accept both structured component objects and simple string descriptions
    if (typeof input.component === "string") {
      return !!(input.component && input.group);
    }

    // Structured component object - require minimal fields; AI will infer the rest
    if (!input.component || !input.component.name) return false;
    if (!input.group) return false;

    // Do NOT require userStories; treat type as optional (default handled downstream)
    return true;
  }

  async getStatus(): Promise<{
    name: string;
    status: "idle" | "running" | "completed" | "error";
    lastRun?: Date;
    executionTime?: number;
    errorCount: number;
    successCount: number;
  }> {
    return {
      name: this.name,
      status: "idle",
      errorCount: 0,
      successCount: 0,
    };
  }

  private async generateProductionReadyComponent(
    component: any,
    group: any,
    options: any
  ): Promise<string> {
    // Use MyContext AI (fine-tuned GPT-4o Mini) with fallbacks to Claude SDK and XAI
    try {
      const ai = getProviderChain();

      const compObj =
        typeof component === "string"
          ? {
              name: this.generateComponentName(component),
              description: String(component),
              type: "form",
            }
          : component;

      // Enhanced context loading from multiple files
      const prd = options?.context?.prd || "";
      const types = options?.context?.types || "";
      const componentList = options?.context?.componentList || "";
      const projectBrief = options?.context?.brief || "";
      const stackConfig = options?.context?.stackConfig || null;

      // Load additional context files if available
      let enhancedContext = "";
      try {
        const fs = require("fs");
        const path = require("path");
        const contextDir = ".mycontext";

        // Try to load component list for better context
        if (fs.existsSync(path.join(contextDir, "04-component-list.json"))) {
          const compListRaw = fs.readFileSync(
            path.join(contextDir, "04-component-list.json"),
            "utf8"
          );
          enhancedContext += `\nComponent Architecture:\n${compListRaw.slice(
            0,
            2000
          )}\n`;
        }

        // Try to load project brief
        if (fs.existsSync(path.join(contextDir, "01a-brief.md"))) {
          const briefRaw = fs.readFileSync(
            path.join(contextDir, "01a-brief.md"),
            "utf8"
          );
          enhancedContext += `\nProject Brief:\n${briefRaw.slice(0, 1000)}\n`;
        }

        // CRITICAL: Load design tokens from globals.css
        const globalsCssPath = path.join(process.cwd(), "src/app/globals.css");
        if (fs.existsSync(globalsCssPath)) {
          const globalsCss = fs.readFileSync(globalsCssPath, "utf8");
          enhancedContext += `\n=== DESIGN TOKENS (REQUIRED FOR STYLING) ===\n${globalsCss}\n=== END DESIGN TOKENS ===\n`;
        } else {
          // Fallback to try other common locations
          const altPaths = [
            "app/globals.css",
            "globals.css",
            "src/globals.css",
          ];
          for (const altPath of altPaths) {
            const fullPath = path.join(process.cwd(), altPath);
            if (fs.existsSync(fullPath)) {
              const globalsCss = fs.readFileSync(fullPath, "utf8");
              enhancedContext += `\n=== DESIGN TOKENS (REQUIRED FOR STYLING) ===\n${globalsCss}\n=== END DESIGN TOKENS ===\n`;
              break;
            }
          }
        }

        // Load branding context if available
        if (fs.existsSync(path.join(contextDir, "03-branding.md"))) {
          const brandingRaw = fs.readFileSync(
            path.join(contextDir, "03-branding.md"),
            "utf8"
          );
          enhancedContext += `\n=== BRANDING CONTEXT ===\n${brandingRaw}\n=== END BRANDING ===\n`;
        }

        // Load available UI components for context
        const uiComponentsPath = path.join(process.cwd(), "components/ui");
        if (fs.existsSync(uiComponentsPath)) {
          const uiFiles = fs
            .readdirSync(uiComponentsPath)
            .filter((f: string) => f.endsWith(".tsx") || f.endsWith(".ts"))
            .map((f: string) => f.replace(/\.(tsx|ts)$/, ""));
          enhancedContext += `\n=== AVAILABLE UI COMPONENTS ===\n${uiFiles.join(
            ", "
          )}\n=== END UI COMPONENTS ===\n`;
        }
      } catch (e) {
        // Fallback gracefully if file reading fails
        console.log("Context loading warning:", e);
      }

      // 🧠 AI-ENHANCED PROMPT CONSTRUCTION
      console.log(
        "🧠 Constructing intelligent prompt using PromptConstructorAgent or AI..."
      );

      let constructedPrompt;
      try {
        // Option 1: Try using PromptConstructorAgent first
        const promptConstructor = new PromptConstructorAgent();
        const constructionContext: PromptConstructionContext = {
          prd,
          types,
          branding: options?.context?.branding || "",
          componentList: enhancedContext,
          componentName: compObj?.name || "Component",
          componentGroup: group?.name || "UI",
          projectPath: options?.projectPath || process.cwd(),
          stackConfig: stackConfig,
        };

        constructedPrompt = await promptConstructor.run(constructionContext);
        console.log(
          `✅ Intelligent prompt constructed via PromptConstructorAgent: ${constructedPrompt.contextSummary}`
        );
        console.log(
          `📋 Specific requirements: ${constructedPrompt.specificRequirements.length} items`
        );
      } catch (promptAgentError) {
        console.log(
          "❌ PromptConstructorAgent failed, trying LLM-based prompt construction..."
        );

        try {
          // Option 2: Use LLM for prompt construction
          constructedPrompt = await this.constructPromptWithLLM(
            compObj,
            group,
            {
              prd,
              types,
              enhancedContext,
              designSystem: options?.context?.designSystem,
              designIntent: options?.context?.designIntent,
              visualTokens: options?.context?.visualTokens,
            }
          );
          console.log(
            `✅ Intelligent prompt constructed via LLM: ${constructedPrompt.contextSummary}`
          );
        } catch (llmPromptError) {
          console.log(
            "❌ LLM prompt construction failed, falling back to enriched static prompt..."
          );

          // Option 3: Enriched static prompt as ultimate fallback
          constructedPrompt = this.createEnrichedStaticPrompt(compObj, group, {
            prd,
            types,
            enhancedContext,
          });
          console.log("✅ Using enriched static prompt construction");
        }
      }

      const prompt = `${constructedPrompt.systemPrompt}\n\n${constructedPrompt.userPrompt}`;

      console.log("🔍 DEBUG: About to call AI for component generation");
      const code = await ai.generateComponent(
        prompt,
        {
          prd,
          types,
          brand: options?.context?.branding,
          componentList: options?.context?.componentList,
          projectStructure: options?.context?.projectStructure,
          previousOutputs: options?.context?.previousOutputs,
          userPrompt: prompt,
          workingDirectory: options?.context?.workingDirectory,
        },
        {
          temperature: this.temperature,
          maxTokens: Math.max(this.maxTokens, 8000), // Ensure minimum 8000 tokens
        }
      );

      console.log(
        "🔍 DEBUG: AI component generation response length:",
        code.length
      );
      console.log(
        "🔍 DEBUG: AI component generation response preview:",
        code.substring(0, 200)
      );

      if (typeof code === "string" && code.trim().length > 0) {
        // 📱 RESPONSIVE VALIDATION CHECKPOINT
        console.log("📱 Validating responsive design requirements...");
        const validationResult = this.validateResponsiveDesign(code);

        if (!validationResult.isValid) {
          console.log(
            "⚠️  Responsive validation warnings:",
            validationResult.warnings
          );
          // Continue with warnings but log them
        } else {
          console.log("✅ Responsive design validation passed");
        }

        return code.trim();
      }
      throw new Error("Empty code from AI provider");
    } catch (err) {
      // No fallbacks - fail cleanly and ask user to retry
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(
        `AI component generation failed: ${errorMessage}\n\n` +
          `💡 This ensures only high-quality AI-generated components.\n` +
          `Please retry when:\n` +
          `- Rate limits reset (check GitHub Models dashboard)\n` +
          `- Network connectivity improves\n` +
          `- AI provider is available\n\n` +
          `🚀 Tip: Try again in a few minutes for best results!`
      );
    }
  }

  /**
   * Uses LLM to construct intelligent prompts for component generation
   */
  private async constructPromptWithLLM(
    component: any,
    group: any,
    context: {
      prd: string;
      types: string;
      enhancedContext: string;
      designSystem?: any;
      designIntent?: any;
      visualTokens?: any;
    }
  ): Promise<{
    systemPrompt: string;
    userPrompt: string;
    contextSummary: string;
    specificRequirements: string[];
  }> {
    const ai = getProviderChain();

    const promptConstructionRequest = `
You are a specialist in creating optimal prompts for React/TypeScript component generation.

📱 **MOBILE-FIRST DESIGN REQUIREMENTS**:
Design a mobile-first, touch-first, single-focus stepped experience rather than multi-field forms. Requirements:

Primary goal: turn multi-field forms into 1 task per screen (single focus), with a clear stepper/progress indicator and per-step status badges (e.g., Pending / Saved / Error / Completed).

Device & constraints: target phones (360–430px width). Touch targets ≥44–48px. Thumb-reachable layouts (controls near bottom where appropriate).

Navigation: linear forward/back with swipe support and unobtrusive skip where needed. Avoid deep menus.

Visuals: card-based steps, large CTA, clear illustrations or icons to contextualize each step (no dense inputs). Use status colors + icons for states.

Interactions: single primary action per screen (big button). Support gestures (swipe to go back/forward), skeleton loaders, and subtle transitions between steps.

Statuses & feedback: show real-time per-step statuses (e.g., "Saving…", success check, retry on error). Include undo where destructive.

Accessibility: high contrast text, semantic labels, reachable controls, readable font sizes.

Edge cases: offline, retries, partial saves, validations that show contextual microcopy (not large error pages).

Deliverables: clickable mobile prototype, design tokens (spacing, colors, typography), interaction specs, and exportable assets (SVGs/icons) plus short dev handoff notes.

Tone: simple, visual, mobile-first. No long forms — use single-task screens, visual progress and clear statuses.

Given this component request:
- Component: ${JSON.stringify(component, null, 2)}
- Group: ${JSON.stringify(group, null, 2)}

And this project context:
- PRD: ${context.prd.slice(0, 1000)}
- Types: ${context.types.slice(0, 500)}
- Additional Context: ${context.enhancedContext.slice(0, 500)}

Create a highly specific and detailed prompt that will result in production-ready React components.

🚨 CRITICAL SERVER COMPONENT RULE:
- ALL page.tsx files MUST be Server Components (no "use client" directive)
- Move client-side logic to separate components with "use client" directive
- Server Components cannot use hooks like useState, useEffect, or event handlers
- Create client components for interactive functionality

Respond with a JSON object containing:
{
  "systemPrompt": "Detailed system prompt with role, constraints, and requirements",
  "userPrompt": "Specific user prompt with exact component specifications",
  "contextSummary": "Brief summary of the prompt context",
  "specificRequirements": ["requirement1", "requirement2", ...]
}

Focus on:
- shadcn/ui integration
- TypeScript best practices
- Accessibility requirements
- Production-ready patterns
- Specific business logic based on context
- Error handling and validation
- Modern React patterns (hooks, etc.)
- Server Component architecture for page.tsx files
`;

    const response = await ai.generateComponent(
      promptConstructionRequest,
      {},
      {
        temperature: 0.3, // Lower temperature for more consistent prompt construction
        maxTokens: 2000,
      }
    );

    try {
      console.log(
        "🔍 DEBUG: CodeGen prompt construction response length:",
        response.length
      );
      console.log(
        "🔍 DEBUG: CodeGen prompt construction response preview:",
        response.substring(0, 200)
      );

      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(
          "❌ DEBUG: No JSON found in LLM response, using fallback prompt construction"
        );
        console.log("❌ DEBUG: Full response:", response);
        return this.createFallbackPrompt(component, group, context);
      }

      console.log(
        "✅ DEBUG: Found JSON match:",
        jsonMatch[0].substring(0, 100) + "..."
      );
      const promptData = JSON.parse(jsonMatch[0]);

      // Validate the structure
      if (!promptData.systemPrompt || !promptData.userPrompt) {
        console.warn(
          "Invalid prompt structure from LLM, using fallback prompt construction"
        );
        return this.createFallbackPrompt(component, group, context);
      }

      return {
        systemPrompt: promptData.systemPrompt,
        userPrompt: promptData.userPrompt,
        contextSummary: promptData.contextSummary || "LLM-generated prompt",
        specificRequirements: promptData.specificRequirements || [],
      };
    } catch (parseError) {
      console.warn(
        "Failed to parse LLM prompt construction response, using fallback:",
        parseError
      );
      return this.createFallbackPrompt(component, group, context);
    }
  }

  /**
   * Creates a fallback prompt when AI prompt construction fails
   */
  private createFallbackPrompt(
    component: any,
    group: any,
    context: {
      prd: string;
      types: string;
      enhancedContext: string;
      designSystem?: any;
      designIntent?: any;
      visualTokens?: any;
    }
  ): {
    systemPrompt: string;
    userPrompt: string;
    contextSummary: string;
    specificRequirements: string[];
  } {
    const componentName = component.name || "Component";
    const componentDescription = component.description || "A React component";

    // Add design system context if available
    let designSystemContext = "";
    if (context.designSystem || context.designIntent || context.visualTokens) {
      designSystemContext = "\n\n🎨 **DESIGN SYSTEM CONTEXT**:\n";

      if (context.designSystem) {
        designSystemContext += `\n**Visual Tokens:**
- Primary Color: ${context.designSystem.colors?.primary || "Not specified"}
- Secondary Color: ${context.designSystem.colors?.secondary || "Not specified"}
- Typography: ${
          context.designSystem.typography?.heading || "Not specified"
        } (headings), ${
          context.designSystem.typography?.body || "Not specified"
        } (body)
- Spacing Scale: ${
          context.designSystem.spacing?.base || "Not specified"
        }px base unit
- Border Radius: ${context.designSystem.borderRadius?.base || "Not specified"}px
- Shadows: ${context.designSystem.shadows?.base || "Not specified"}`;
      }

      if (context.designIntent) {
        designSystemContext += `\n\n**Design Principles:**
- Design Anchors: ${
          context.designIntent.design_anchors?.join(", ") || "Not specified"
        }
- Key Principles: ${
          context.designIntent.key_principles?.join(", ") || "Not specified"
        }
- User Experience Focus: ${
          context.designIntent.user_experience_focus || "Not specified"
        }`;
      }

      if (context.visualTokens) {
        designSystemContext += `\n\n**Component Tokens:**
- Button Styles: ${JSON.stringify(context.visualTokens.buttons || {})}
- Input Styles: ${JSON.stringify(context.visualTokens.inputs || {})}
- Card Styles: ${JSON.stringify(context.visualTokens.cards || {})}`;
      }

      designSystemContext += "\n\n**Design Implementation Requirements:**\n";
      designSystemContext +=
        "- Use the specified color palette for all UI elements\n";
      designSystemContext +=
        "- Apply consistent typography scale throughout the component\n";
      designSystemContext +=
        "- Follow the established spacing and border radius patterns\n";
      designSystemContext +=
        "- Implement component tokens for buttons, inputs, and cards\n";
      designSystemContext +=
        "- Ensure visual consistency with the overall design system";
    }

    const systemPrompt = `You are an expert React/TypeScript developer specializing in production-ready Next.js 14+ components with shadcn/ui.

📱 **MOBILE-FIRST DESIGN REQUIREMENTS**:
Design a mobile-first, touch-first, single-focus stepped experience rather than multi-field forms. Requirements:

Primary goal: turn multi-field forms into 1 task per screen (single focus), with a clear stepper/progress indicator and per-step status badges (e.g., Pending / Saved / Error / Completed).

Device & constraints: target phones (360–430px width). Touch targets ≥44–48px. Thumb-reachable layouts (controls near bottom where appropriate).

Navigation: linear forward/back with swipe support and unobtrusive skip where needed. Avoid deep menus.

Visuals: card-based steps, large CTA, clear illustrations or icons to contextualize each step (no dense inputs). Use status colors + icons for states.

Interactions: single primary action per screen (big button). Support gestures (swipe to go back/forward), skeleton loaders, and subtle transitions between steps.

Statuses & feedback: show real-time per-step statuses (e.g., "Saving…", success check, retry on error). Include undo where destructive.

Accessibility: high contrast text, semantic labels, reachable controls, readable font sizes.

Edge cases: offline, retries, partial saves, validations that show contextual microcopy (not large error pages).

Deliverables: clickable mobile prototype, design tokens (spacing, colors, typography), interaction specs, and exportable assets (SVGs/icons) plus short dev handoff notes.

Tone: simple, visual, mobile-first. No long forms — use single-task screens, visual progress and clear statuses.

CRITICAL REQUIREMENTS:
- Use TypeScript with strict typing
- Follow Next.js 14+ App Router patterns
- Use shadcn/ui components from @/components/ui/*
- Implement proper error handling and validation
- Follow accessibility best practices
- Use modern React patterns (hooks, functional components)
- Server Components for page.tsx files (no "use client")
- Client Components for interactive functionality

Generate production-ready, maintainable code that follows industry best practices.${designSystemContext}`;

    const userPrompt = `Create a React component: ${componentName}

Description: ${componentDescription}

Context:
${context.prd ? `PRD: ${context.prd.substring(0, 500)}...` : ""}
${context.types ? `Types: ${context.types.substring(0, 300)}...` : ""}

Requirements:
- Use shadcn/ui components
- Implement proper TypeScript interfaces
- Add comprehensive error handling
- Follow accessibility guidelines
- Use modern React patterns
- Include proper imports and exports

Generate the complete component code with all necessary imports and proper structure.`;

    return {
      systemPrompt,
      userPrompt,
      contextSummary: `Fallback prompt for ${componentName}`,
      specificRequirements: [
        "Use shadcn/ui components",
        "Implement TypeScript interfaces",
        "Add error handling",
        "Follow accessibility guidelines",
      ],
    };
  }

  /**
   * Creates an enriched static prompt with intelligent analysis of the context
   */
  private createEnrichedStaticPrompt(
    component: any,
    group: any,
    context: { prd: string; types: string; enhancedContext: string }
  ): {
    systemPrompt: string;
    userPrompt: string;
    contextSummary: string;
    specificRequirements: string[];
  } {
    const shadcnList = this.getAvailableShadcnPrimitives();

    // Analyze context to extract key requirements
    const requirements = this.analyzeContextForRequirements(component, context);

    // Build enhanced system prompt based on component type and context
    const systemPrompt = `You are an expert React/TypeScript developer generating production-ready Next.js components.

📱 **RESPONSIVE DESIGN REQUIREMENTS** (NON-NEGOTIABLE):
Generate components that work perfectly on mobile AND desktop. This is the #1 priority.

**MOBILE REQUIREMENTS** (360-430px width):
- Touch targets: MINIMUM 44px × 44px (WCAG 2.1 AA standard)
- Full-width buttons on mobile: \`w-full sm:w-auto\`
- Larger text: \`text-base sm:text-sm\` for better readability
- Thumb-reachable layouts: controls near bottom
- Single-column layouts with proper spacing
- Swipe gestures support where appropriate

**DESKTOP REQUIREMENTS** (1024px+ width):
- Auto-width buttons: \`sm:w-auto\`
- Smaller text: \`text-sm\` for desktop
- Multi-column layouts where appropriate
- Hover states and keyboard navigation
- More compact spacing

**TABLET REQUIREMENTS** (768-1023px width):
- Hybrid approach: larger than mobile, smaller than desktop
- Touch targets: 42px minimum
- Responsive grid layouts

**RESPONSIVE BREAKPOINTS** (Tailwind CSS):
- \`sm:\` 640px+ (tablet portrait)
- \`md:\` 768px+ (tablet landscape) 
- \`lg:\` 1024px+ (desktop)
- \`xl:\` 1280px+ (large desktop)

**ACCESSIBILITY REQUIREMENTS** (WCAG 2.1 AA):
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Focus indicators: visible and clear
- Keyboard navigation: Tab, Enter, Space, Arrow keys
- Screen reader support: proper ARIA labels
- Touch targets: minimum 44px × 44px
- Orientation support: portrait and landscape

**RESPONSIVE VALIDATION CHECKPOINTS**:
- Does it work on mobile? (360px width)
- Does it work on tablet? (768px width)  
- Does it work on desktop? (1024px width)
- Are touch targets 44px+ on mobile?
- Is text readable on all screen sizes?
- Are interactive elements reachable with thumb on mobile?

🎯 CRITICAL: Generate FUNCTIONAL, INTERACTIVE components with real business logic.
❌ DO NOT generate generic layout wrappers or placeholder components.
✅ DO implement actual functionality, state management, and user interactions.

🚨 SERVER COMPONENT RULE: 
- ALL page.tsx files MUST be Server Components (no "use client" directive)
- Move client-side logic to separate components with "use client" directive
- Server Components cannot use hooks like useState, useEffect, or event handlers
- Create client components for interactive functionality

COMPONENT SPECIFICATIONS:
- Type: ${component?.type || "interactive"}
- Group: ${group?.name || "UI"}
- Primary Function: ${requirements.primaryFunction}
- Key Features: ${requirements.keyFeatures.join(", ")}

TECHNICAL REQUIREMENTS:
- Use shadcn/ui primitives: ${shadcnList.slice(0, 15).join(", ")}${
      shadcnList.length > 15 ? "..." : ""
    }
- Implement proper TypeScript interfaces and types
- Add comprehensive accessibility features (ARIA labels, keyboard navigation)
- Include error handling and loading states
- Use modern React patterns (hooks, memoization)
- Follow Next.js 14+ best practices
- Include proper validation where applicable

CONTEXT-SPECIFIC REQUIREMENTS:
${requirements.specificRequirements.map((req) => `- ${req}`).join("\n")}

QUALITY STANDARDS:
- Production-ready code with no TODOs or placeholders
- Comprehensive error handling
- Responsive design with Tailwind CSS
- Semantic HTML structure
- Performance optimizations (useMemo, useCallback where appropriate)`;

    const userPrompt = `Generate the ${
      component?.name
    } component with these specifications:

Component Details:
${JSON.stringify(
  {
    group: group?.name || "",
    name: component?.name,
    description: component?.description || "",
    type: component?.type || "interactive",
    userStories: Array.isArray(component?.userStories)
      ? component.userStories
      : [],
    actionFunctions: Array.isArray(component?.actionFunctions)
      ? component.actionFunctions
      : [],
  },
  null,
  2
)}

Project Context Analysis:
${requirements.contextInsights.join("\n")}

Business Requirements:
${requirements.businessLogic}

Technical Constraints:
${requirements.technicalConstraints.join("\n")}

The component should be fully functional and ready for production use.`;

    return {
      systemPrompt,
      userPrompt,
      contextSummary: `Enhanced static prompt for ${component?.name} (${component?.type})`,
      specificRequirements: requirements.specificRequirements,
    };
  }

  /**
   * Analyzes project context to extract intelligent requirements
   */
  private analyzeContextForRequirements(
    component: any,
    context: { prd: string; types: string; enhancedContext: string }
  ): {
    primaryFunction: string;
    keyFeatures: string[];
    specificRequirements: string[];
    contextInsights: string[];
    businessLogic: string;
    technicalConstraints: string[];
  } {
    const analysis = {
      primaryFunction: "Interactive user interface component",
      keyFeatures: [] as string[],
      specificRequirements: [] as string[],
      contextInsights: [] as string[],
      businessLogic: "Standard component functionality",
      technicalConstraints: [] as string[],
    };

    // Analyze component type
    if (component?.type === "form") {
      analysis.primaryFunction = "Form handling with validation and submission";
      analysis.keyFeatures.push(
        "Input validation",
        "Error handling",
        "Submit functionality"
      );
      analysis.specificRequirements.push(
        "Use react-hook-form with zod validation"
      );
      analysis.specificRequirements.push(
        "Implement proper accessibility for form controls"
      );
    } else if (component?.type === "data") {
      analysis.primaryFunction = "Data display and manipulation";
      analysis.keyFeatures.push("Data filtering", "Sorting", "Pagination");
      analysis.specificRequirements.push(
        "Implement efficient data handling with useMemo"
      );
    } else if (component?.type === "navigation") {
      analysis.primaryFunction = "Navigation and routing";
      analysis.keyFeatures.push(
        "Route highlighting",
        "Responsive navigation",
        "Keyboard navigation"
      );
      analysis.specificRequirements.push("Use Next.js Link components");
      analysis.specificRequirements.push("Implement ARIA navigation patterns");
    }

    // Analyze PRD content
    if (context.prd) {
      const prdLower = context.prd.toLowerCase();

      if (prdLower.includes("authentication") || prdLower.includes("login")) {
        analysis.businessLogic =
          "Authentication and user management functionality";
        analysis.specificRequirements.push(
          "Implement secure authentication patterns"
        );
      }

      if (prdLower.includes("dashboard") || prdLower.includes("analytics")) {
        analysis.keyFeatures.push("Data visualization", "Real-time updates");
        analysis.specificRequirements.push(
          "Include loading states and error boundaries"
        );
      }

      if (prdLower.includes("e-commerce") || prdLower.includes("payment")) {
        analysis.businessLogic = "E-commerce and transaction handling";
        analysis.specificRequirements.push(
          "Include proper validation for financial data"
        );
      }

      analysis.contextInsights.push(
        `PRD indicates: ${
          context.prd.split("\n")[0]?.slice(0, 100) || "Standard application"
        }`
      );
    }

    // Analyze types context
    if (context.types) {
      analysis.contextInsights.push(
        "Custom TypeScript types available for integration"
      );
      analysis.specificRequirements.push(
        "Use existing type definitions where applicable"
      );
    }

    // Add default technical constraints
    analysis.technicalConstraints.push(
      "Use TypeScript with strict mode",
      "Follow React 18+ patterns",
      "Ensure mobile responsiveness",
      "Implement proper error boundaries"
    );

    return analysis;
  }

  private getAvailableShadcnPrimitives(): string[] {
    try {
      const projectRoot = process.cwd();
      const uiDir = path.join(projectRoot, "components", "ui");
      if (fs.existsSync(uiDir)) {
        const files = fs.readdirSync(uiDir);
        const names = files
          .filter((f) => f.endsWith(".tsx"))
          .map((f) => this.normalizeShadcnName(path.basename(f, ".tsx")));
        if (names.length > 0) return names.sort();
      }
    } catch {}

    // Fallback to canonical set from SHADCN_COMPONENTS
    try {
      const mapped = CANONICAL_SHADCN_LIST.map((n) =>
        this.normalizeShadcnName(n)
      );
      const fromGroups = Array.from(
        new Set(Object.values(SHADCN_COMPONENTS).flat())
      );
      const union = Array.from(new Set([...mapped, ...fromGroups]));
      return union.sort();
    } catch {
      return [];
    }
  }

  private normalizeShadcnName(name: string): string {
    const special: Record<string, string> = {
      "alert dialog": "AlertDialog",
      "aspect ratio": "AspectRatio",
      "hover card": "HoverCard",
      "input otp": "InputOTP",
      "navigation menu": "NavigationMenu",
      "radio group": "RadioGroup",
      "scroll-area": "ScrollArea",
      "toggle group": "ToggleGroup",
      "context menu": "ContextMenu",
      "dropdown menu": "DropdownMenu",
      "data table": "Table",
      "date picker": "Calendar",
      // Sonner is toast library; keep as Sonner for awareness
    };
    const key = name.toLowerCase().trim();
    if (special[key]) return special[key];
    // PascalCase default
    return key
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  }

  private getReactImportsForType(type: string): string[] {
    const imports: string[] = [];

    switch (type) {
      case "form":
        imports.push("useState", "useCallback", "useMemo");
        break;
      case "layout":
        imports.push("ReactNode", "FC");
        break;
      case "data":
        imports.push("useState", "useEffect", "useMemo");
        break;
      case "navigation":
        imports.push("useState", "useEffect");
        break;
      case "feedback":
        imports.push("useState", "useEffect");
        break;
      default:
        imports.push("useState");
    }

    return [...new Set(imports)];
  }

  private getShadcnImportsForType(type: string): string[] {
    const imports: string[] = [];

    switch (type) {
      case "form":
        imports.push(
          "Button",
          "Input",
          "Label",
          "Form",
          "FormControl",
          "FormField",
          "FormItem",
          "FormLabel",
          "FormMessage",
          "Select",
          "SelectContent",
          "SelectItem",
          "SelectTrigger",
          "SelectValue",
          "Checkbox",
          "Alert",
          "AlertDescription"
        );
        break;
      case "layout":
        imports.push(
          "Card",
          "CardContent",
          "CardDescription",
          "CardHeader",
          "CardTitle",
          "Separator"
        );
        break;
      case "card":
        imports.push(
          "Card",
          "CardContent",
          "CardDescription",
          "CardHeader",
          "CardTitle",
          "CardFooter",
          "Button"
        );
        break;
      case "button":
        imports.push("Button");
        break;
      case "navigation":
        imports.push(
          "NavigationMenu",
          "NavigationMenuContent",
          "NavigationMenuItem",
          "NavigationMenuLink",
          "NavigationMenuList",
          "NavigationMenuTrigger",
          "Breadcrumb",
          "BreadcrumbItem",
          "BreadcrumbLink",
          "BreadcrumbList",
          "BreadcrumbSeparator",
          "Tabs",
          "TabsContent",
          "TabsList",
          "TabsTrigger"
        );
        break;
      case "feedback":
        imports.push(
          "Alert",
          "AlertDescription",
          "AlertTitle",
          "Dialog",
          "DialogContent",
          "DialogDescription",
          "DialogHeader",
          "DialogTitle",
          "DialogTrigger",
          "Toast",
          "Progress"
        );
        break;
      case "data":
        imports.push(
          "Table",
          "TableBody",
          "TableCell",
          "TableHead",
          "TableHeader",
          "TableRow",
          "Command",
          "CommandEmpty",
          "CommandGroup",
          "CommandInput",
          "CommandItem",
          "CommandList"
        );
        break;
      case "overlay":
        imports.push(
          "Popover",
          "PopoverContent",
          "PopoverTrigger",
          "Tooltip",
          "TooltipContent",
          "TooltipProvider",
          "TooltipTrigger",
          "Sheet",
          "SheetContent",
          "SheetDescription",
          "SheetHeader",
          "SheetTitle",
          "SheetTrigger"
        );
        break;
      case "media":
        imports.push("Avatar", "AvatarFallback", "AvatarImage", "Badge");
        break;
      default:
        imports.push(
          "Card",
          "CardContent",
          "CardHeader",
          "CardTitle",
          "Button"
        );
    }

    return [...new Set(imports)];
  }

  private getCustomImportsForType(type: string): string[] {
    const imports: string[] = [];

    if (type === "form") {
      imports.push('import { useForm } from "react-hook-form";');
      imports.push('import { zodResolver } from "@hookform/resolvers/zod";');
      imports.push('import * as z from "zod";');
    }

    if (type === "navigation") {
      imports.push('import Link from "next/link";');
      imports.push('import { usePathname } from "next/navigation";');
    }

    if (type === "data") {
      imports.push('import { useMemo } from "react";');
    }

    return imports;
  }

  private generateTypeDefinitions(type: string, name: string): string {
    switch (type) {
      case "form":
        return `
/** Form data schema */
export const ${name.toLowerCase()}Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/** Inferred form data type */
export type ${name}FormData = z.infer<typeof ${name.toLowerCase()}Schema>;

/** Form submission result */
export interface ${name}SubmissionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
}`;
      case "navigation":
        return `
/** Navigation item interface */
export interface NavigationItem {
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Optional icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Nested items for dropdowns */
  children?: NavigationItem[];
}`;
      case "data":
        return `
/** Generic data row interface */
export interface DataRow {
  id: string | number;
  [key: string]: any;
}

/** Column definition */
export interface ColumnDef<T = DataRow> {
  /** Column key */
  key: keyof T;
  /** Display label */
  label: string;
  /** Custom render function */
  render?: (value: any, row: T) => React.ReactNode;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Column width */
  width?: string;
}

/** Sort configuration */
export interface SortConfig {
  key: keyof DataRow;
  direction: "asc" | "desc";
}`;
      default:
        return "";
    }
  }

  private generateDetailedPropsForType(type: string): string {
    switch (type) {
      case "form":
        return `
  /** Form submission handler */
  onSubmit?: (data: ${type}FormData) => Promise<${type}SubmissionResult> | ${type}SubmissionResult;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Form variant */
  variant?: "default" | "login" | "signup" | "contact";
  /** Initial form values */
  defaultValues?: Partial<${type}FormData>;
  /** Whether to show password confirmation field */
  showConfirmPassword?: boolean;
  /** Custom validation rules */
  validationRules?: Partial<Record<keyof ${type}FormData, z.ZodSchema>>;`;
      case "layout":
        return `
  /** Main content */
  children: React.ReactNode;
  /** Sidebar content */
  sidebar?: React.ReactNode;
  /** Header content */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Layout variant */
  variant?: "default" | "sidebar" | "centered" | "fullscreen";
  /** Whether sidebar is collapsible */
  collapsibleSidebar?: boolean;
  /** Sidebar initial state */
  sidebarDefaultOpen?: boolean;`;
      case "card":
        return `
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Card content */
  content?: React.ReactNode;
  /** Card footer actions */
  actions?: React.ReactNode;
  /** Card variant */
  variant?: "default" | "elevated" | "outlined" | "ghost";
  /** Whether card is interactive */
  interactive?: boolean;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** Card size */
  size?: "sm" | "default" | "lg";`;
      case "button":
        return `
  /** Button variant */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Whether button is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button content */
  children: React.ReactNode;
  /** Button type */
  type?: "button" | "submit" | "reset";
  /** ARIA label for accessibility */
  "aria-label"?: string;`;
      case "navigation":
        return `
  /** Navigation items */
  items: NavigationItem[];
  /** Currently active item path */
  activeItem?: string;
  /** Navigation orientation */
  orientation?: "horizontal" | "vertical";
  /** Whether to show icons */
  showIcons?: boolean;
  /** Custom item renderer */
  renderItem?: (item: NavigationItem, isActive: boolean) => React.ReactNode;
  /** Navigation variant */
  variant?: "default" | "pills" | "underline";`;
      case "feedback":
        return `
  /** Alert title */
  title?: string;
  /** Alert message */
  message?: string;
  /** Alert variant */
  variant?: "default" | "destructive" | "success" | "warning";
  /** Close handler */
  onClose?: () => void;
  /** Whether alert is dismissible */
  dismissible?: boolean;
  /** Auto-dismiss timeout in milliseconds */
  autoDissmissAfter?: number;
  /** Custom icon */
  icon?: React.ReactNode;`;
      case "data":
        return `
  /** Table data */
  data: DataRow[];
  /** Column definitions */
  columns: ColumnDef[];
  /** Whether table is loading */
  loading?: boolean;
  /** Whether to show pagination */
  pagination?: boolean;
  /** Items per page */
  pageSize?: number;
  /** Sort configuration */
  sortable?: boolean;
  /** Initial sort */
  defaultSort?: SortConfig;
  /** Row selection handler */
  onRowSelect?: (selectedRows: DataRow[]) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Custom row renderer */
  renderRow?: (row: DataRow, index: number) => React.ReactNode;`;
      default:
        return `
  /** Component children */
  children?: React.ReactNode;
  /** Component variant */
  variant?: "default";`;
    }
  }

  private generateExampleProps(type: string): string {
    switch (type) {
      case "form":
        return `onSubmit={handleSubmit}\n *   loading={false}\n *   variant="default"`;
      case "layout":
        return `variant="sidebar"\n *   header={<Header />}\n *   sidebar={<Sidebar />}`;
      case "card":
        return `title="Card Title"\n *   variant="elevated"\n *   interactive`;
      case "button":
        return `variant="default"\n *   size="lg"\n *   onClick={handleClick}`;
      case "navigation":
        return `items={navigationItems}\n *   variant="pills"\n *   orientation="horizontal"`;
      case "feedback":
        return `variant="success"\n *   title="Success"\n *   dismissible`;
      case "data":
        return `data={tableData}\n *   columns={columns}\n *   pagination`;
      default:
        return `variant="default"`;
    }
  }

  private generateEnhancedPropsDestructuring(type: string): string {
    switch (type) {
      case "form":
        return `
  onSubmit,
  loading = false,
  error,
  variant = "default",
  defaultValues,
  showConfirmPassword = false,
  validationRules,`;
      case "layout":
        return `
  children,
  sidebar,
  header,
  footer,
  variant = "default",
  collapsibleSidebar = false,
  sidebarDefaultOpen = true,`;
      case "card":
        return `
  title,
  description,
  content,
  actions,
  variant = "default",
  interactive = false,
  onClick,
  size = "default",`;
      case "button":
        return `
  variant = "default",
  size = "default",
  disabled = false,
  loading = false,
  onClick,
  children,
  type = "button",
  "aria-label": ariaLabel,`;
      case "navigation":
        return `
  items,
  activeItem,
  orientation = "horizontal",
  showIcons = true,
  renderItem,
  variant = "default",`;
      case "feedback":
        return `
  title,
  message,
  variant = "default",
  onClose,
  dismissible = false,
  autoDissmissAfter,
  icon,`;
      case "data":
        return `
  data,
  columns,
  loading = false,
  pagination = false,
  pageSize = 10,
  sortable = false,
  defaultSort,
  onRowSelect,
  emptyMessage = "No data available",
  renderRow,`;
      default:
        return `
  children,
  variant = "default",`;
    }
  }

  private generateProductionComponentLogic(
    type: string,
    actionFunctions: string[],
    componentName: string
  ): string {
    const logic = [];

    if (type === "form") {
      logic.push(`
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<${componentName}FormData>({
    resolver: zodResolver(${componentName.toLowerCase()}Schema),
    defaultValues: defaultValues || {
      email: "",
      password: "",
      ...(showConfirmPassword && { confirmPassword: "" }),
    },
  });

  const handleFormSubmit = useCallback(async (values: ${componentName}FormData) => {
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (result.success) {
        form.reset();
      } else if (result.errors) {
        Object.entries(result.errors).forEach(([field, message]) => {
          form.setError(field as keyof ${componentName}FormData, { message });
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      form.setError("root", { message: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, form]);`);
    }

    if (type === "navigation") {
      logic.push(`
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  
  const currentActiveItem = useMemo(() => {
    return activeItem || pathname;
  }, [activeItem, pathname]);

  const toggleDropdown = useCallback((itemLabel: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemLabel)) {
        newSet.delete(itemLabel);
      } else {
        newSet.add(itemLabel);
      }
      return newSet;
    });
  }, []);`);
    }

    if (type === "data") {
      logic.push(`
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null);
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, pagination, currentPage, pageSize]);

  const handleSort = useCallback((key: keyof DataRow) => {
    if (!sortable) return;
    
    setSortConfig(prevSort => {
      if (prevSort?.key === key) {
        return {
          key,
          direction: prevSort.direction === "asc" ? "desc" : "asc"
        };
      }
      return { key, direction: "asc" };
    });
  }, [sortable]);

  const handleRowSelection = useCallback((rowId: string | number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      
      if (onRowSelect) {
        const selectedData = data.filter(row => newSet.has(row.id));
        onRowSelect(selectedData);
      }
      
      return newSet;
    });
  }, [data, onRowSelect]);`);
    }

    if (type === "feedback" && logic.length === 0) {
      logic.push(`
  useEffect(() => {
    if (autoDissmissAfter && onClose) {
      const timer = setTimeout(onClose, autoDissmissAfter);
      return () => clearTimeout(timer);
    }
  }, [autoDissmissAfter, onClose]);`);
    }

    return logic.join("\n");
  }

  private generateAccessibleComponentJSX(
    type: string,
    name: string,
    shadcnImports: string[]
  ): string {
    switch (type) {
      case "form":
        return `<Form {...form}>
      <form 
        onSubmit={form.handleSubmit(handleFormSubmit)} 
        className={cn("space-y-6", className)} 
        noValidate
        {...props}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  autoComplete="email"
                  aria-describedby="email-error"
                  {...field}
                />
              </FormControl>
              <FormMessage id="email-error" />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-describedby="password-error"
                  {...field}
                />
              </FormControl>
              <FormMessage id="password-error" />
            </FormItem>
          )}
        />
        
        {showConfirmPassword && (
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    aria-describedby="confirm-password-error"
                    {...field}
                  />
                </FormControl>
                <FormMessage id="confirm-password-error" />
              </FormItem>
            )}
          />
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}
        
        <Button
          type="submit"
          disabled={loading || isSubmitting}
          className="w-full"
          aria-describedby={loading || isSubmitting ? "submit-loading" : undefined}
        >
          {loading || isSubmitting ? (
            <>
              <span className="sr-only" id="submit-loading">Loading...</span>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Submitting...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </Form>`;

      case "layout":
        return `<div className={cn("min-h-screen flex flex-col", className)} {...props}>
      {header && (
        <header 
          className="border-b bg-background sticky top-0 z-40"
          role="banner"
        >
          <div className="container mx-auto px-4 py-4">
            {header}
          </div>
        </header>
      )}
      
      <div className="flex-1 flex">
        {sidebar && (
          <aside 
            className={cn(
              "border-r bg-background",
              variant === "sidebar" ? "w-64" : "w-auto"
            )}
            role="complementary"
            aria-label="Sidebar navigation"
          >
            <div className="p-4">
              {sidebar}
            </div>
          </aside>
        )}
        
        <main 
          className="flex-1 focus:outline-none" 
          role="main"
          tabIndex={-1}
        >
          <div className={cn(
            "container mx-auto px-4 py-8",
            variant === "centered" && "max-w-4xl",
            variant === "fullscreen" && "max-w-none px-0 py-0"
          )}>
            {children}
          </div>
        </main>
      </div>
      
      {footer && (
        <footer 
          className="border-t bg-background"
          role="contentinfo"
        >
          <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        </footer>
      )}
    </div>`;

      case "card":
        return `<Card 
      className={cn(
        "transition-all duration-200",
        variant === "elevated" && "shadow-lg hover:shadow-xl",
        variant === "outlined" && "border-2",
        variant === "ghost" && "border-none shadow-none",
        interactive && "cursor-pointer hover:bg-accent/50",
        size === "sm" && "p-4",
        size === "lg" && "p-8",
        className
      )} 
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      {...props}
    >
      {(title || description) && (
        <CardHeader className={size === "sm" ? "pb-3" : undefined}>
          {title && (
            <CardTitle className={size === "sm" ? "text-base" : "text-lg"}>
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
      )}
      
      {content && (
        <CardContent className={cn(
          size === "sm" && "pt-0 pb-3",
          !title && !description && "pt-6"
        )}>
          {content}
        </CardContent>
      )}
      
      {actions && (
        <CardFooter className={cn(
          "flex justify-end space-x-2",
          size === "sm" && "pt-0"
        )}>
          {actions}
        </CardFooter>
      )}
    </Card>`;

      case "button":
        return `<Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      className={cn(loading && "cursor-wait", className)}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          <span className="sr-only">Loading...</span>
          Loading...
        </>
      ) : (
        children
      )}
    </Button>`;

      case "navigation":
        return `<NavigationMenu 
      className={cn("", className)} 
      orientation={orientation}
      {...props}
    >
      <NavigationMenuList className={cn(
        orientation === "vertical" && "flex-col space-x-0 space-y-1"
      )}>
        {items.map((item, index) => (
          <NavigationMenuItem key={item.href || index}>
            {item.children ? (
              <>
                <NavigationMenuTrigger 
                  className={cn(
                    variant === "pills" && "rounded-full",
                    variant === "underline" && "border-b-2 border-transparent data-[state=open]:border-primary"
                  )}
                  onClick={() => toggleDropdown(item.label)}
                  aria-expanded={openDropdowns.has(item.label)}
                >
                  {showIcons && item.icon && (
                    <item.icon className="w-4 h-4 mr-2" />
                  )}
                  {item.label}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-4 w-[400px]">
                    {item.children.map((child, childIndex) => (
                      <NavigationMenuLink
                        key={child.href || childIndex}
                        asChild
                      >
                        <Link
                          href={child.href}
                          className={cn(
                            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                            child.disabled && "pointer-events-none opacity-50"
                          )}
                        >
                          <div className="text-sm font-medium leading-none">
                            {child.label}
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink
                asChild
                className={cn(
                  currentActiveItem === item.href && "bg-accent text-accent-foreground",
                  variant === "pills" && "rounded-full",
                  variant === "underline" && currentActiveItem === item.href && "border-b-2 border-primary"
                )}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    item.disabled && "pointer-events-none opacity-50"
                  )}
                >
                  {showIcons && item.icon && (
                    <item.icon className="w-4 h-4 mr-2 inline-block" />
                  )}
                  {item.label}
                </Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>`;

      case "feedback":
        return `<Alert 
      variant={variant} 
      className={cn("relative", className)} 
      role={variant === "destructive" ? "alert" : "status"}
      aria-live={variant === "destructive" ? "assertive" : "polite"}
      {...props}
    >
      {icon || (
        <div className="w-4 h-4">
          {variant === "success" && "✓"}
          {variant === "destructive" && "⚠"}
          {variant === "warning" && "⚠"}
        </div>
      )}
      
      <div className="flex-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        {message && <AlertDescription>{message}</AlertDescription>}
      </div>
      
      {dismissible && onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 h-6 w-6 p-0"
          aria-label="Close alert"
        >
          ×
        </Button>
      )}
    </Alert>`;

      case "data":
        return `<div className={cn("space-y-4", className)} {...props}>
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="sr-only">Loading data...</span>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {onRowSelect && (
                    <TableHead className="w-12">
                      <span className="sr-only">Select row</span>
                    </TableHead>
                  )}
                  {columns.map((column) => (
                    <TableHead 
                      key={String(column.key)}
                      className={cn(
                        sortable && column.sortable && "cursor-pointer hover:bg-muted",
                        column.width && \`w-[\${column.width}]\`
                      )}
                      onClick={() => column.sortable && handleSort(column.key)}
                      role={column.sortable ? "button" : undefined}
                      tabIndex={column.sortable ? 0 : undefined}
                      onKeyDown={column.sortable ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSort(column.key);
                        }
                      } : undefined}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column.label}</span>
                        {sortable && column.sortable && sortConfig?.key === column.key && (
                          <span className="text-xs">
                            {sortConfig.direction === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={columns.length + (onRowSelect ? 1 : 0)}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, index) => (
                    renderRow ? renderRow(row, index) : (
                      <TableRow 
                        key={row.id} 
                        className={cn(
                          onRowSelect && selectedRows.has(row.id) && "bg-muted"
                        )}
                      >
                        {onRowSelect && (
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(row.id)}
                              onCheckedChange={() => handleRowSelection(row.id)}
                              aria-label={\`Select row \${index + 1}\`}
                            />
                          </TableCell>
                        )}
                        {columns.map((column) => (
                          <TableCell key={String(column.key)}>
                            {column.render 
                              ? column.render(row[column.key], row)
                              : String(row[column.key] || "")
                            }
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {pagination && data.length > pageSize && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length} results
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage * pageSize >= data.length}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>`;

      default:
        return `<Card className={cn("p-4", className)} {...props}>
      <CardHeader>
        <CardTitle>${name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is a production-ready ${type} component with accessibility features and TypeScript support.
        </p>
        {children}
      </CardContent>
    </Card>`;
    }
  }

  private generateProductionActionFunctions(
    actionFunctions: string[],
    componentName: string,
    type: string
  ): string {
    if (actionFunctions.length === 0) return "";

    const functions = actionFunctions.map((func) => {
      switch (func) {
        case "handleSubmit":
          return type === "form"
            ? `// Form submission is handled within the component`
            : `
/**
 * Handles form submission with validation and error handling
 * @param data - Form data to submit
 * @returns Promise with submission result
 */
export async function handleSubmit(data: Record<string, any>): Promise<{ success: boolean; message?: string }> {
  try {
    // Validate required data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid form data provided');
    }
    
    // Log submission attempt
    console.log("Submitting data:", data);
    
    // Prepare submission payload
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
      clientId: Math.random().toString(36).substr(2, 9)
    };
    
    // Make API request
    const response = await fetch('/api/form/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${localStorage.getItem('authToken') || ''}\`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "HTTP error");
    }
    
    const result = await response.json();
    
    return { 
      success: true, 
      message: result.message || "Data submitted successfully",
      data: result.data 
    };
  } catch (error) {
    console.error("Submission error:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to submit data" 
    };
  }
}`;
        case "handleLogin":
          return `
/**
 * Handles user authentication with proper validation
 * @param email - User email address
 * @param password - User password
 * @returns Promise with authentication result
 */
export async function handleLogin(email: string, password: string): Promise<{ 
  success: boolean; 
  user?: { id: string; email: string; name: string }; 
  error?: string 
}> {
  try {
    // Validate input parameters
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    
    // Validate password requirements
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Make authentication request
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "MyContext-CLI/1.0.0"
      },
      body: JSON.stringify({ email, password }),
    });
    
    // Handle different response statuses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      switch (response.status) {
        case 401:
          throw new Error(errorData.message || "Invalid email or password");
        case 429:
          throw new Error("Too many login attempts. Please try again later");
        case 500:
          throw new Error("Server error. Please try again later");
        default:
          throw new Error(errorData.message || "Authentication failed");
      }
    }
    
    const result = await response.json();
    
    // Validate response structure
    if (!result.user || !result.user.id) {
      throw new Error("Invalid server response");
    }
    
    // Store authentication token if provided
    if (result.token) {
      try {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      } catch (storageError) {
        console.warn('Failed to store authentication data:', storageError);
      }
    }
    
    return { 
      success: true, 
      user: result.user,
      token: result.token 
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Invalid credentials" };
  }
}`;
        case "validateEmail":
          return `/**
 * Validates email address format and availability
 * @param email - Email address to validate
 * @returns Validation result with detailed feedback
 */
export async function validateEmail(email: string): Promise<{
  isValid: boolean;
  isAvailable?: boolean;
  message?: string;
}> {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Please enter a valid email address" };
  }
  
  try {
    // Check email availability via API
    const response = await fetch("/api/auth/check-email?email=" + encodeURIComponent(email));
    
    if (!response.ok) {
      // If API is unavailable, consider email valid but unknown availability
      console.warn('Email availability check failed, proceeding with validation only');
      return { 
        isValid: true, 
        isAvailable: undefined,
        message: "Email format is valid (availability check unavailable)"
      };
    }
    
    const { available } = await response.json();
    
    return { 
      isValid: true, 
      isAvailable: available,
      message: available ? "Email is available" : "Email is already registered"
    };
  } catch (error) {
    console.error("Email validation error:", error);
    return { isValid: true, message: "Unable to verify email availability" };
  }
}`;
        default:
          return `
/**
 * ${func} function - Generated by MyContext CLI CodeGenSubAgent
 * 
 * This is a generated function template. Replace this implementation with your actual business logic.
 * 
 * @param args - Function arguments (customize parameter types based on your needs)
 * @returns Promise with operation result including success status, data, and error information
 * 
 * @example
 * const result = await ${func}(param1, param2);
 * if (result.success) {
 *   console.log('Operation succeeded:', result.data);
 * } else {
 *   console.error('Operation failed:', result.error);
 * }
 */
export async function ${func}(...args: unknown[]): Promise<{ 
  success: boolean; 
  data?: unknown; 
  error?: string; 
  timestamp?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Log function execution for debugging
    console.log(\`\${func} executed at \${new Date().toISOString()} with args:\`, args);
    
    // Input validation
    if (args.length === 0) {
      console.warn(\`\${func} called without arguments\`);
    }
    
    // Business logic implementation placeholder
    // Replace this section with your actual implementation:
    // - Data processing
    // - API calls  
    // - Database operations
    // - Calculations
    // - File operations
    // etc.
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    const executionTime = Date.now() - startTime;
    console.log(\`\${func} completed in \${executionTime}ms\`);
    
    return { 
      success: true,
      data: {
        functionName: '${func}',
        executionTime,
        processedArgs: args,
        message: 'Function executed successfully'
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(\`\${func} failed after \${executionTime}ms:\`, error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred in ${func}',
      timestamp: new Date().toISOString()
    };
  }
}`;
      }
    });

    return functions.join("\n");
  }

  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];

    // Extract import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      const importPath = match[1];
      if (
        importPath &&
        (importPath.startsWith("@/") ||
          importPath.startsWith("./") ||
          importPath.startsWith("../"))
      ) {
        dependencies.push(importPath);
      }
    }

    // Extract shadcn/ui component dependencies
    const shadcnComponents = this.extractShadcnComponents(code);
    shadcnComponents.forEach((comp) => {
      dependencies.push(`@/components/ui/${comp.toLowerCase()}`);
    });

    // Remove duplicates
    return [...new Set(dependencies)];
  }

  private extractShadcnComponents(code: string): string[] {
    const components: string[] = [];

    // Check for shadcn/ui component usage
    Object.values(SHADCN_COMPONENTS)
      .flat()
      .forEach((comp) => {
        if (code.includes(comp)) {
          components.push(comp);
        }
      });

    return [...new Set(components)];
  }

  private calculateQualityScore(code: string): number {
    let score = 70; // Base score

    // Bonus for using shadcn/ui components
    const shadcnComponents = this.extractShadcnComponents(code);
    score += Math.min(shadcnComponents.length * 3, 15);

    // Bonus for proper TypeScript usage
    if (code.includes("interface") && code.includes("Props")) score += 10;
    if (code.includes("export type") || code.includes("export interface"))
      score += 5;

    // Bonus for React patterns and hooks
    if (code.includes("useState") || code.includes("useEffect")) score += 5;
    if (code.includes("useCallback") || code.includes("useMemo")) score += 5;

    // Bonus for accessibility features
    if (code.includes("aria-") || code.includes("role=")) score += 10;
    if (code.includes("tabIndex") || code.includes("onKeyDown")) score += 5;

    // Bonus for error handling and validation
    if (code.includes("try") && code.includes("catch")) score += 5;
    if (code.includes("zodResolver") || code.includes("z.object")) score += 5;

    // Bonus for semantic HTML and proper structure
    if (code.includes("role=") && code.includes("aria-")) score += 5;
    if (code.includes("sr-only")) score += 3;

    // Bonus for production patterns
    if (code.includes("useCallback") && code.includes("useMemo")) score += 5;
    if (code.includes("React.memo") || code.includes("forwardRef")) score += 3;

    // Cap at 100
    return Math.min(score, 100);
  }

  private generateComponentName(description: string): string {
    // Convert description to PascalCase component name
    return description
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("")
      .replace(/[^a-zA-Z0-9]/g, "");
  }

  private async generateWithFallback(
    component: any,
    group: any,
    options: any
  ): Promise<string> {
    // Generate a basic component template as fallback
    const componentName = component.name || "Component";
    const componentDescription = component.description || "A React component";

    return `// ${componentName} - ${componentDescription}
// Generated as fallback template

import React from 'react';

interface ${componentName}Props {
  // Add your props here
  className?: string;
}

const ${componentName}: React.FC<${componentName}Props> = ({ className }) => {
  return (
    <div className={\`p-4 border rounded-lg \${className || ''}\`}>
      <h3 className="text-lg font-semibold mb-2">${componentName}</h3>
      <p className="text-gray-600">${componentDescription}</p>
      <p className="text-sm text-gray-500 mt-2">
        This is a fallback template. Configure an AI provider for full generation.
      </p>
    </div>
  );
};

export default ${componentName};`;
  }

  /**
   * Validates responsive design requirements in generated component code
   */
  private validateResponsiveDesign(code: string): {
    isValid: boolean;
    warnings: string[];
    score: number;
  } {
    const warnings: string[] = [];
    let score = 100;

    // Check for mobile-first responsive classes
    const hasMobileClasses =
      /w-full\s+sm:|text-base\s+sm:|min-h-\[44px\]|min-w-\[44px\]/.test(code);
    if (!hasMobileClasses) {
      warnings.push(
        "Missing mobile-first responsive classes (w-full sm:, text-base sm:, min-h-[44px])"
      );
      score -= 20;
    }

    // Check for touch target sizes
    const hasTouchTargets = /min-h-\[44px\]|min-w-\[44px\]|h-11|w-11/.test(
      code
    );
    if (!hasTouchTargets) {
      warnings.push(
        "Missing minimum touch target sizes (44px minimum for mobile)"
      );
      score -= 15;
    }

    // Check for responsive breakpoints
    const hasBreakpoints = /sm:|md:|lg:|xl:/.test(code);
    if (!hasBreakpoints) {
      warnings.push("Missing responsive breakpoints (sm:, md:, lg:, xl:)");
      score -= 15;
    }

    // Check for accessibility features
    const hasAriaLabels = /aria-label|aria-describedby|aria-labelledby/.test(
      code
    );
    if (!hasAriaLabels) {
      warnings.push("Missing ARIA labels for accessibility");
      score -= 10;
    }

    // Check for keyboard navigation
    const hasKeyboardSupport = /onKeyDown|tabIndex|role=/.test(code);
    if (!hasKeyboardSupport) {
      warnings.push("Missing keyboard navigation support");
      score -= 10;
    }

    // Check for focus management
    const hasFocusManagement = /focus:|focus-visible:|outline/.test(code);
    if (!hasFocusManagement) {
      warnings.push("Missing focus management styles");
      score -= 5;
    }

    // Check for proper button sizing
    const hasProperSizing =
      /className.*w-full.*sm:w-auto|className.*min-h-\[44px\]/.test(code);
    if (!hasProperSizing) {
      warnings.push("Button sizing may not be optimal for mobile/desktop");
      score -= 10;
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      score: Math.max(score, 0),
    };
  }
}
