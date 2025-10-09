#!/usr/bin/env node

/**
 * MyContext AI Training Data Generator
 *
 * Generates 10,000+ training examples from intent-dictionary.json
 * for fine-tuning GPT-4o Mini to create MyContext AI.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TrainingExample {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

interface IntentMapping {
  intent_phrases: Array<{
    phrase: string;
    aliases?: string[];
    context_keywords?: string[];
  }>;
  component_pattern: {
    pattern_name: string;
    template_code: string;
    shadcn_components: Array<{
      name: string;
      import_path: string;
    }>;
    required_props: Array<{
      name: string;
      type: string;
      description?: string;
    }>;
    optional_props: Array<{
      name: string;
      type: string;
      description?: string;
    }>;
  };
  accessibility_spec: {
    aria_attributes: Record<string, string>;
    keyboard_support: Array<{
      key: string;
      action: string;
    }>;
  };
}

interface IntentDictionary {
  mappings: Record<string, IntentMapping>;
  synonyms: Record<string, string>;
}

class TrainingDataGenerator {
  private dictionary: IntentDictionary;
  private outputPath: string;
  private domains = [
    "e-commerce site",
    "dashboard application",
    "blog platform",
    "admin panel",
    "mobile app",
    "landing page",
    "SaaS application",
    "content management system",
    "social media platform",
    "analytics dashboard",
  ];

  constructor(dictionaryPath: string, outputPath: string) {
    this.dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf-8"));
    this.outputPath = outputPath;
  }

  async generateAllTrainingData(): Promise<void> {
    console.log("🚀 Generating MyContext AI training data...");

    const examples: TrainingExample[] = [];

    // 1. Generate base examples from intent dictionary
    console.log("📝 Generating base examples...");
    examples.push(...this.generateBaseExamples());

    // 2. Generate contextual variations
    console.log("🌍 Generating contextual variations...");
    examples.push(...this.generateContextualVariations());

    // 3. Generate composition patterns
    console.log("🔗 Generating composition patterns...");
    examples.push(...this.generateCompositionPatterns());

    // 4. Generate edge cases
    console.log("⚠️  Generating edge cases...");
    examples.push(...this.generateEdgeCases());

    // 5. Export to JSONL format
    await this.exportToJSONL(examples);

    console.log(`✅ Generated ${examples.length} training examples`);
    console.log(`📁 Training data exported to: ${this.outputPath}`);
  }

  private generateBaseExamples(): TrainingExample[] {
    const examples: TrainingExample[] = [];

    for (const [canonicalName, mapping] of Object.entries(
      this.dictionary.mappings
    )) {
      // Generate 50 variations per pattern
      for (let i = 0; i < 50; i++) {
        const variation = this.generateVariation(mapping, canonicalName, i);
        examples.push({
          messages: [
            {
              role: "system",
              content: this.generateSystemPrompt(mapping),
            },
            {
              role: "user",
              content: variation.userPrompt,
            },
            {
              role: "assistant",
              content: variation.assistantResponse,
            },
          ],
        });
      }
    }

    return examples;
  }

  private generateVariation(
    mapping: IntentMapping,
    canonicalName: string,
    index: number
  ): { userPrompt: string; assistantResponse: string } {
    const phrases = mapping.intent_phrases;
    const basePhrase = phrases[Math.floor(Math.random() * phrases.length)];

    // Generate contextual variations
    const context = this.domains[index % this.domains.length];
    const userPrompt = `${basePhrase?.phrase || ""} ${context}`;

    // Generate component code based on mapping
    const assistantResponse = this.generateComponentCode(
      mapping,
      basePhrase,
      canonicalName
    );

    return { userPrompt, assistantResponse };
  }

  private generateComponentCode(
    mapping: IntentMapping,
    phrase: any,
    canonicalName: string
  ): string {
    // Extract component template and expand it
    const template = mapping.component_pattern.template_code;
    const expandedCode = this.expandTemplate(template, mapping);

    // Add intent mapping explanation
    const explanation = this.generateIntentExplanation(
      mapping,
      phrase,
      canonicalName
    );

    return `${expandedCode}\n\n**Intent Mapping Applied:**\n${explanation}`;
  }

  private expandTemplate(template: string, mapping: IntentMapping): string {
    // Replace placeholders with actual values
    let expanded = template;

    // Replace component imports
    const imports = mapping.component_pattern.shadcn_components
      .map(
        (comp) =>
          `import { ${
            comp.name
          } } from '@/components/ui/${comp.name.toLowerCase()}'`
      )
      .join("\n");

    expanded = expanded.replace("{{IMPORTS}}", imports);

    // Replace props interface
    const props = mapping.component_pattern.required_props
      .map((prop) => `  ${prop.name}: ${prop.type}`)
      .join("\n");

    expanded = expanded.replace("{{PROPS}}", props);

    // Replace component name
    const componentName = this.generateComponentName(
      mapping.component_pattern.pattern_name
    );
    expanded = expanded.replace("{{COMPONENT_NAME}}", componentName);

    return expanded;
  }

  private generateComponentName(patternName: string): string {
    // Convert pattern name to PascalCase component name
    return patternName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }

  private generateIntentExplanation(
    mapping: IntentMapping,
    phrase: any,
    canonicalName: string
  ): string {
    return [
      `- Primary Intent: \`${canonicalName}\` (confidence: 0.95)`,
      `- Components Used: ${mapping.component_pattern.shadcn_components
        .map((c) => c.name)
        .join(", ")}`,
      `- Design Pattern: ${mapping.component_pattern.pattern_name}`,
      `- Required Props: ${mapping.component_pattern.required_props
        .map((p) => p.name)
        .join(", ")}`,
      `- Accessibility: ${Object.keys(
        mapping.accessibility_spec.aria_attributes || {}
      ).join(", ")}`,
    ].join("\n");
  }

  private generateSystemPrompt(mapping: IntentMapping): string {
    return `You are MyContext AI, a specialized UI code generator that maps natural language to shadcn/ui components using the Intent Dictionary System. Always follow these rules:

1. Use only shadcn/ui components from the provided dictionary
2. Generate complete, production-ready React components
3. Include proper TypeScript types and accessibility attributes
4. Follow the exact component patterns specified in the intent mapping
5. Never hallucinate components or props not in the dictionary

Intent Dictionary Context:
- Available Components: ${mapping.component_pattern.shadcn_components
      .map((c) => c.name)
      .join(", ")}
- Design Pattern: ${mapping.component_pattern.pattern_name}
- Required Props: ${mapping.component_pattern.required_props
      .map((p) => `${p.name}: ${p.type}`)
      .join(", ")}
- Accessibility Specs: ${JSON.stringify(mapping.accessibility_spec)}`;
  }

  private generateContextualVariations(): TrainingExample[] {
    const examples: TrainingExample[] = [];

    // Generate domain-specific variations for each pattern
    for (const [canonicalName, mapping] of Object.entries(
      this.dictionary.mappings
    )) {
      for (const domain of this.domains) {
        // Generate 2 examples per domain per pattern
        for (let i = 0; i < 2; i++) {
          const domainExample = this.generateDomainExample(
            mapping,
            canonicalName,
            domain,
            i
          );
          examples.push(domainExample);
        }
      }
    }

    return examples;
  }

  private generateDomainExample(
    mapping: IntentMapping,
    canonicalName: string,
    domain: string,
    index: number
  ): TrainingExample {
    const phrases = mapping.intent_phrases;
    const basePhrase = phrases[Math.floor(Math.random() * phrases.length)];

    // Add domain-specific context
    const domainContexts = {
      "e-commerce site": "for product listings and shopping cart",
      "dashboard application": "for data visualization and metrics",
      "blog platform": "for content management and publishing",
      "admin panel": "for user management and settings",
      "mobile app": "with responsive design and touch interactions",
      "landing page": "for marketing and conversion",
      "SaaS application": "for user onboarding and feature access",
      "content management system": "for content creation and editing",
      "social media platform": "for user engagement and sharing",
      "analytics dashboard": "for data analysis and reporting",
    };

    const context = domainContexts[domain as keyof typeof domainContexts] || "";
    const userPrompt = `${basePhrase?.phrase || ""} ${context}`;

    const assistantResponse = this.generateComponentCode(
      mapping,
      basePhrase,
      canonicalName
    );

    return {
      messages: [
        {
          role: "system",
          content: this.generateSystemPrompt(mapping),
        },
        {
          role: "user",
          content: userPrompt,
        },
        {
          role: "assistant",
          content: assistantResponse,
        },
      ],
    };
  }

  private generateCompositionPatterns(): TrainingExample[] {
    const compositions = [
      {
        user: "Create a product page with image gallery, product details, add to cart form, related products, and reviews section",
        components: [
          "image-gallery",
          "product-details",
          "add-to-cart-form",
          "product-grid",
          "review-list",
        ],
        system:
          "Generate a complete product page combining multiple UI components with proper layout and interactions.",
      },
      {
        user: "Build a dashboard with metrics cards, charts, data table, and sidebar navigation",
        components: ["stat-card", "chart", "data-table", "sidebar-menu"],
        system:
          "Create a comprehensive dashboard layout with multiple data visualization components.",
      },
      {
        user: "Add a user profile page with avatar upload, personal info form, settings tabs, and activity feed",
        components: ["avatar", "form", "tabs-navigation", "activity-feed"],
        system:
          "Build a user profile interface with multiple interactive components and data sections.",
      },
      {
        user: "Create a blog post editor with rich text, image upload, tags, and preview panel",
        components: [
          "rich-text-editor",
          "file-upload",
          "tag-input",
          "preview-panel",
        ],
        system:
          "Generate a content creation interface with editing and preview capabilities.",
      },
      {
        user: "Build a checkout flow with cart summary, shipping form, payment method, and order confirmation",
        components: [
          "cart-summary",
          "form",
          "payment-form",
          "confirmation-dialog",
        ],
        system:
          "Create a multi-step checkout process with form validation and payment integration.",
      },
    ];

    return compositions.map((comp) => ({
      messages: [
        {
          role: "system",
          content: comp.system,
        },
        {
          role: "user",
          content: comp.user,
        },
        {
          role: "assistant",
          content: this.generateCompositionCode(comp.components),
        },
      ],
    }));
  }

  private generateCompositionCode(components: string[]): string {
    // Generate a complex component that combines multiple patterns
    const imports = components
      .map((comp) => {
        const mapping = this.dictionary.mappings[comp];
        return (
          mapping?.component_pattern.shadcn_components
            .map((c) => c.name)
            .join(", ") || comp
        );
      })
      .join(", ");

    return `import { ${imports} } from '@/components/ui'

interface CompositeComponentProps {
  // Props for the composite component
}

export function CompositeComponent({ ...props }: CompositeComponentProps) {
  return (
    <div className="space-y-6">
      {/* Component composition based on intent patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Component 1 */}
        </div>
        
        {/* Right column */}
        <div className="space-y-4">
          {/* Component 2 */}
        </div>
      </div>
    </div>
  )
}

**Intent Mapping Applied:**
- Composite Pattern: Combines ${components.join(", ")}
- Layout: Responsive grid with proper spacing
- Components: ${imports}
- Design System: Consistent with shadcn/ui patterns`;
  }

  private generateEdgeCases(): TrainingExample[] {
    const edgeCases = [
      {
        user: "Create a form with validation errors, loading states, and disabled fields",
        scenario: "error-validation",
        system:
          "Generate components with comprehensive error handling, loading states, and accessibility features.",
      },
      {
        user: "Add a data table with empty state, loading skeleton, and error handling",
        scenario: "empty-loading",
        system:
          "Create data components with proper state management and user feedback.",
      },
      {
        user: "Build a component with disabled state, tooltip explanation, and keyboard navigation",
        scenario: "disabled-tooltip",
        system:
          "Generate accessible components with proper interaction states and keyboard support.",
      },
      {
        user: "Create a responsive component that works on mobile, tablet, and desktop",
        scenario: "responsive",
        system:
          "Build components with responsive design patterns and mobile-first approach.",
      },
      {
        user: "Add a component with dark mode support and theme switching",
        scenario: "theming",
        system:
          "Generate components with theme support and proper color contrast.",
      },
    ];

    return edgeCases.map((edge) => ({
      messages: [
        {
          role: "system",
          content: edge.system,
        },
        {
          role: "user",
          content: edge.user,
        },
        {
          role: "assistant",
          content: this.generateEdgeCaseCode(edge.scenario),
        },
      ],
    }));
  }

  private generateEdgeCaseCode(scenario: string): string {
    const edgeCaseTemplates = {
      "error-validation": `import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FormWithValidationProps {
  onSubmit: (data: FormData) => void
  isLoading?: boolean
}

export function FormWithValidation({ onSubmit, isLoading = false }: FormWithValidationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({ email: '', password: '' })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\\S+@\\S+\\.\\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData as FormData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <Alert variant="destructive">
            <AlertDescription id="email-error">{errors.email}</AlertDescription>
          </Alert>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <Alert variant="destructive">
            <AlertDescription id="password-error">{errors.password}</AlertDescription>
          </Alert>
        )}
      </div>
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  )
}`,
      "empty-loading": `import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DataTableProps {
  data: any[]
  isLoading?: boolean
  error?: string
}

export function DataTable({ data, isLoading = false, error }: DataTableProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>{item.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}`,
      "disabled-tooltip": `import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DisabledButtonProps {
  disabled?: boolean
  disabledReason?: string
  children: React.ReactNode
  onClick?: () => void
}

export function DisabledButton({ 
  disabled = false, 
  disabledReason, 
  children, 
  onClick 
}: DisabledButtonProps) {
  const button = (
    <Button 
      disabled={disabled}
      onClick={onClick}
      aria-disabled={disabled}
      aria-describedby={disabled && disabledReason ? "disabled-reason" : undefined}
    >
      {children}
    </Button>
  )

  if (disabled && disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent id="disabled-reason">
            <p>{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}`,
      responsive: `import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ResponsiveCardProps {
  title: string
  children: React.ReactNode
}

export function ResponsiveCard({ title, children }: ResponsiveCardProps) {
  return (
    <Card className="w-full max-w-sm mx-auto sm:max-w-md md:max-w-lg lg:max-w-xl">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl md:text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}`,
      theming: `import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from 'next-themes'

interface ThemedComponentProps {
  children: React.ReactNode
}

export function ThemedComponent({ children }: ThemedComponentProps) {
  const { theme, setTheme } = useTheme()

  return (
    <Card className="bg-background text-foreground border-border">
      <CardContent className="p-4">
        <div className="space-y-4">
          {children}
          <Button 
            variant="outline" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full"
          >
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}`,
    };

    return edgeCaseTemplates[scenario as keyof typeof edgeCaseTemplates] || "";
  }

  private async exportToJSONL(examples: TrainingExample[]): Promise<void> {
    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonlContent = examples
      .map((example) => JSON.stringify(example))
      .join("\n");

    fs.writeFileSync(this.outputPath, jsonlContent);
  }
}

// CLI Usage
async function main() {
  const args = process.argv.slice(2);
  const dictionaryPath =
    args[0] || path.join(__dirname, "..", "config", "intent-dictionary.json");
  const outputPath =
    args[1] ||
    path.join(__dirname, "..", "training-data", "mycontext-ai-training.jsonl");

  console.log(`📚 Dictionary: ${dictionaryPath}`);
  console.log(`📁 Output: ${outputPath}`);

  const generator = new TrainingDataGenerator(dictionaryPath, outputPath);
  await generator.generateAllTrainingData();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TrainingDataGenerator };
