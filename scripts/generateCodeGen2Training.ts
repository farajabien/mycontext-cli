#!/usr/bin/env node

/**
 * Generate StarCoder2 Training Data
 *
 * Converts Intent Dictionary patterns into code-focused training examples
 * for StarCoder2-3B fine-tuning. Uses instruction-style prompts and
 * removes conversational wrappers for better code generation.
 */

import fs from "fs";
import path from "path";

interface IntentMapping {
  canonical_name: string;
  category: string;
  intent_phrases: Array<{
    phrase: string;
    aliases: string[];
    context_keywords: string[];
    confidence_boost: number;
  }>;
  component_pattern: {
    shadcn_components: Array<{
      name: string;
      import_path: string;
      exports: string[];
      peer_components: string[];
    }>;
    template_code: string;
    required_props: Array<{
      name: string;
      type: string;
      description: string;
    }>;
    optional_props: Array<{
      name: string;
      type: string;
      default_value?: string;
      description: string;
    }>;
    accessibility_features: string[];
  };
  design_tokens: {
    spacing: string;
    colors: string[];
    typography: string;
  };
  usage_context: string[];
  complexity: "simple" | "medium" | "complex";
}

interface IntentDictionary {
  mappings: Record<string, IntentMapping>;
  synonyms: Record<string, string>;
}

class StarCoder2TrainingGenerator {
  private dictionary: IntentDictionary;
  private examples: Array<{ text: string }> = [];

  constructor(dictionaryPath: string) {
    this.dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf8"));
  }

  /**
   * Generate training data for StarCoder2
   */
  async generateTrainingData(): Promise<void> {
    console.log("🚀 Generating StarCoder2 training data...");
    console.log(
      `📊 Found ${Object.keys(this.dictionary.mappings).length} patterns`
    );

    // Generate examples for each pattern
    for (const [patternId, mapping] of Object.entries(
      this.dictionary.mappings
    )) {
      await this.generatePatternExamples(patternId, mapping);
    }

    // Generate composition examples
    await this.generateCompositionExamples();

    // Generate edge cases
    await this.generateEdgeCases();

    // Shuffle examples
    this.shuffleArray(this.examples);

    console.log(`✅ Generated ${this.examples.length} training examples`);

    // Save to JSONL
    const outputPath = path.join(
      process.cwd(),
      "scripts",
      "starcoder2_training_data.jsonl"
    );
    const jsonlContent = this.examples
      .map((example) => JSON.stringify(example))
      .join("\n");

    fs.writeFileSync(outputPath, jsonlContent);
    console.log(`💾 Saved to: ${outputPath}`);

    // Show statistics
    this.showStatistics();
  }

  /**
   * Generate examples for a single pattern
   */
  private async generatePatternExamples(
    patternId: string,
    mapping: IntentMapping
  ): Promise<void> {
    const basePrompts = [
      `Create a ${mapping.canonical_name} component`,
      `Build a ${mapping.canonical_name} using shadcn/ui`,
      `Generate a ${mapping.canonical_name} with TypeScript`,
      `Make a ${mapping.canonical_name} component`,
    ];

    // Add synonym variations from intent phrases
    const synonyms = mapping.intent_phrases
      .slice(0, 3)
      .map((phrase) => phrase.phrase);
    for (const synonym of synonyms) {
      basePrompts.push(`Create a ${synonym} component`);
    }

    // Generate examples for each prompt
    for (const prompt of basePrompts) {
      const code = this.generateComponentCode(prompt, mapping);
      this.examples.push({ text: code });
    }

    // Generate contextual variations
    if (mapping.usage_context && mapping.usage_context.length > 0) {
      for (const context of mapping.usage_context.slice(0, 2)) {
        const contextualPrompt = `Create a ${mapping.canonical_name} for ${context}`;
        const code = this.generateComponentCode(contextualPrompt, mapping);
        this.examples.push({ text: code });
      }
    }
  }

  /**
   * Generate composition examples (multiple components)
   */
  private async generateCompositionExamples(): Promise<void> {
    const compositions = [
      {
        prompt: "Create a login form with email and password fields",
        components: [
          "form-login",
          "input-email",
          "input-password",
          "button-primary",
        ],
      },
      {
        prompt: "Create a dashboard layout with sidebar and main content",
        components: ["nav-sidebar", "card-basic"],
      },
      {
        prompt: "Create a data table with sorting and pagination",
        components: ["table-data", "pagination"],
      },
      {
        prompt: "Create a settings page with form and buttons",
        components: ["form-contact", "button-primary", "button-secondary"],
      },
      {
        prompt: "Create a modal dialog with form submission",
        components: ["modal-dialog", "form-login", "button-primary"],
      },
    ];

    for (const composition of compositions) {
      const code = this.generateCompositionCode(
        composition.prompt,
        composition.components
      );
      this.examples.push({ text: code });
    }
  }

  /**
   * Generate edge cases and complex scenarios
   */
  private async generateEdgeCases(): Promise<void> {
    const edgeCases = [
      "Create a responsive button that works on mobile and desktop",
      "Create a form with validation and error handling",
      "Create a data table with filtering and search",
      "Create a navigation menu with dropdown submenus",
      "Create a loading state with skeleton components",
      "Create a dark mode toggle component",
      "Create a file upload component with progress",
      "Create a multi-step form wizard",
      "Create a notification system with toast messages",
      "Create a search component with autocomplete",
    ];

    for (const prompt of edgeCases) {
      const code = this.generateEdgeCaseCode(prompt);
      this.examples.push({ text: code });
    }
  }

  /**
   * Generate component code for a single pattern
   */
  private generateComponentCode(
    prompt: string,
    mapping: IntentMapping
  ): string {
    const componentName = this.generateComponentName(mapping.canonical_name);
    const template = mapping.component_pattern.template_code;

    // Expand template with actual values
    let code = template
      .replace("{{COMPONENT_NAME}}", componentName)
      .replace(
        "{{SHADCN_COMPONENT}}",
        mapping.component_pattern.shadcn_components[0]?.name || "Component"
      )
      .replace(
        "{{REQUIRED_PROPS}}",
        mapping.component_pattern.required_props.map((p) => p.name).join(", ")
      )
      .replace(
        "{{OPTIONAL_PROPS}}",
        mapping.component_pattern.optional_props.map((p) => p.name).join(", ")
      );

    // Add proper imports
    const imports = this.generateImports(mapping);

    // Add TypeScript interface if needed
    const interfaceCode = this.generateInterface(mapping, componentName);

    // Combine everything
    const fullCode = `// Task: ${prompt}
${imports}
${interfaceCode}
${code}`;

    return fullCode;
  }

  /**
   * Generate composition code for multiple components
   */
  private generateCompositionCode(
    prompt: string,
    componentIds: string[]
  ): string {
    const components = componentIds
      .map((id) => this.dictionary.mappings[id])
      .filter(Boolean);

    if (components.length === 0) {
      return `// Task: ${prompt}
// Error: No valid components found`;
    }

    const imports = this.generateCompositionImports(components);
    const componentName = this.generateComponentName("ComposedComponent");

    let code = `// Task: ${prompt}
${imports}

export default function ${componentName}() {
  return (
    <div className="space-y-4">
`;

    for (const component of components) {
      const componentCode = this.generateSimpleComponentUsage(component);
      code += `      ${componentCode}\n`;
    }

    code += `    </div>
  );
}`;

    return code;
  }

  /**
   * Generate edge case code
   */
  private generateEdgeCaseCode(prompt: string): string {
    const componentName = this.generateComponentName("EdgeCaseComponent");

    return `// Task: ${prompt}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ${componentName}() {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Handle submission logic
      console.log('Submitted:', value);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>${componentName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter value..."
        />
        <Button 
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Submit'}
        </Button>
      </CardContent>
    </Card>
  );
}`;
  }

  /**
   * Generate imports for a component
   */
  private generateImports(mapping: IntentMapping): string {
    const imports = new Set<string>();

    // Add shadcn/ui component import
    const shadcnComponent = mapping.component_pattern.shadcn_components[0];
    if (shadcnComponent) {
      const componentName = shadcnComponent.name.toLowerCase();
      imports.add(
        `import { ${shadcnComponent.name} } from '${shadcnComponent.import_path}';`
      );
    }

    // Add React imports if needed
    const requiredProps = mapping.component_pattern.required_props.map(
      (p) => p.name
    );
    if (
      requiredProps.includes("onClick") ||
      requiredProps.includes("onChange")
    ) {
      imports.add("import { useState } from 'react';");
    }

    // Add additional imports based on complexity
    if (mapping.complexity === "complex") {
      imports.add(
        "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';"
      );
    }

    return Array.from(imports).join("\n");
  }

  /**
   * Generate composition imports
   */
  private generateCompositionImports(components: IntentMapping[]): string {
    const imports = new Set<string>();

    for (const component of components) {
      const shadcnComponent = component.component_pattern.shadcn_components[0];
      if (shadcnComponent) {
        imports.add(
          `import { ${shadcnComponent.name} } from '${shadcnComponent.import_path}';`
        );
      }
    }

    // Add common imports
    imports.add(
      "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';"
    );

    return Array.from(imports).join("\n");
  }

  /**
   * Generate TypeScript interface
   */
  private generateInterface(
    mapping: IntentMapping,
    componentName: string
  ): string {
    const props = [
      ...mapping.component_pattern.required_props.map((p) => p.name),
      ...mapping.component_pattern.optional_props.map((p) => p.name),
    ];

    if (props.length === 0) {
      return "";
    }

    const interfaceProps = props
      .map((prop) => {
        const isOptional = mapping.component_pattern.optional_props.some(
          (p) => p.name === prop
        );
        const propDef =
          mapping.component_pattern.required_props.find(
            (p) => p.name === prop
          ) ||
          mapping.component_pattern.optional_props.find((p) => p.name === prop);
        const type = propDef?.type || "any";
        return `  ${prop}${isOptional ? "?" : ""}: ${type};`;
      })
      .join("\n");

    return `interface ${componentName}Props {
${interfaceProps}
}`;
  }

  /**
   * Get TypeScript type for a prop
   */
  private getPropType(prop: string): string {
    const typeMap: Record<string, string> = {
      onClick: "() => void",
      onChange: "(value: string) => void",
      onSubmit: "(data: any) => void",
      value: "string",
      placeholder: "string",
      disabled: "boolean",
      required: "boolean",
      variant: "string",
      size: "string",
      type: "string",
      className: "string",
      children: "React.ReactNode",
    };

    return typeMap[prop] || "any";
  }

  /**
   * Generate simple component usage
   */
  private generateSimpleComponentUsage(mapping: IntentMapping): string {
    const componentName =
      mapping.component_pattern.shadcn_components[0]?.name || "Component";
    const props = mapping.component_pattern.required_props.slice(0, 2); // Limit props

    let propsString = "";
    if (props.length > 0) {
      const propsList = props
        .map((prop) => {
          const value = this.getPropValue(prop.name);
          return `${prop.name}={${value}}`;
        })
        .join(" ");
      propsString = ` ${propsList}`;
    }

    return `<${componentName}${propsString} />`;
  }

  /**
   * Get default value for a prop
   */
  private getPropValue(prop: string): string {
    const valueMap: Record<string, string> = {
      onClick: '() => console.log("clicked")',
      onChange: "(e) => console.log(e.target.value)",
      value: '"default"',
      placeholder: '"Enter text..."',
      disabled: "false",
      required: "true",
      variant: '"default"',
      size: '"default"',
      type: '"text"',
    };

    return valueMap[prop] || '""';
  }

  /**
   * Generate component name from pattern name
   */
  private generateComponentName(patternName: string): string {
    return patternName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }

  /**
   * Shuffle array in place
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Show generation statistics
   */
  private showStatistics(): void {
    const patterns = Object.keys(this.dictionary.mappings);
    const compositions = this.examples.filter((ex) =>
      ex.text.includes("ComposedComponent")
    ).length;
    const edgeCases = this.examples.filter((ex) =>
      ex.text.includes("EdgeCaseComponent")
    ).length;
    const singleComponents = this.examples.length - compositions - edgeCases;

    console.log("\n📊 Generation Statistics:");
    console.log(`   Patterns: ${patterns.length}`);
    console.log(`   Single Components: ${singleComponents}`);
    console.log(`   Compositions: ${compositions}`);
    console.log(`   Edge Cases: ${edgeCases}`);
    console.log(`   Total Examples: ${this.examples.length}`);

    // Show average length
    const avgLength =
      this.examples.reduce((sum, ex) => sum + ex.text.length, 0) /
      this.examples.length;
    console.log(`   Average Length: ${Math.round(avgLength)} characters`);
    console.log(
      `   Estimated Tokens: ${Math.round(avgLength / 4)} (rough estimate)`
    );
  }
}

/**
 * Main execution
 */
async function generateStarCoder2TrainingData(): Promise<void> {
  const dictionaryPath = path.join(
    process.cwd(),
    "src",
    "config",
    "intent-dictionary.json"
  );

  if (!fs.existsSync(dictionaryPath)) {
    console.error(`❌ Intent dictionary not found at: ${dictionaryPath}`);
    process.exit(1);
  }

  const generator = new StarCoder2TrainingGenerator(dictionaryPath);
  await generator.generateTrainingData();

  console.log("\n🎉 StarCoder2 training data generation complete!");
  console.log("📁 Next steps:");
  console.log("   1. Upload starcoder2_training_data.jsonl to Colab");
  console.log("   2. Run the StarCoder2 fine-tuning notebook");
  console.log("   3. Test the fine-tuned model");
}

// Run if called directly
if (require.main === module) {
  generateStarCoder2TrainingData().catch(console.error);
}

export { generateStarCoder2TrainingData };
