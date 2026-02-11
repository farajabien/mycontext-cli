import {
  IntentValidationReport,
  ValidatedIntent,
  EnrichedComponentSpec,
  IntentMapping,
} from "../types/intent-dictionary";
import { FunctionalSummary, VisualSystem } from "@mycontext/core";
import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";

/**
 * IntentEnricher Service
 *
 * Transforms validated intents into enriched component specifications
 * with expanded templates, design token mappings, and full type definitions.
 */
export class IntentEnricher {
  private dictionaryPath: string;

  constructor() {
    this.dictionaryPath = path.join(
      __dirname,
      "..",
      "config",
      "intent-dictionary.json"
    );
  }

  /**
   * Enrich validated intents into component specifications
   */
  async enrichComponentDefinitions(
    summary: FunctionalSummary,
    validation: IntentValidationReport,
    visualSystem?: VisualSystem
  ): Promise<EnrichedComponentSpec[]> {
    console.log(
      chalk.blue("🔧 Enriching intents into component specifications...")
    );

    const enrichedSpecs: EnrichedComponentSpec[] = [];

    for (const validatedIntent of validation.validated_intents) {
      try {
        const enrichedSpec = await this.enrichSingleIntent(
          validatedIntent,
          summary,
          visualSystem
        );
        enrichedSpecs.push(enrichedSpec);
      } catch (error) {
        console.warn(
          chalk.yellow(
            `⚠️  Failed to enrich intent: ${validatedIntent.canonical_name}`
          ),
          error
        );
      }
    }

    console.log(
      chalk.green(
        `✅ Enriched ${enrichedSpecs.length} component specifications`
      )
    );

    return enrichedSpecs;
  }

  /**
   * Enrich a single validated intent
   */
  private async enrichSingleIntent(
    intent: ValidatedIntent,
    summary: FunctionalSummary,
    visualSystem?: VisualSystem
  ): Promise<EnrichedComponentSpec> {
    const mapping = intent.intent_mapping;

    // Generate component name from intent context
    const componentName = this.generateComponentName(intent, summary);

    // Expand template with context
    const expandedTemplate = this.expandTemplate(
      mapping.component_pattern.template_code,
      intent,
      visualSystem
    );

    // Map design tokens
    const designTokens = visualSystem
      ? this.mapDesignTokens(mapping.design_tokens, visualSystem)
      : {};

    // Generate TypeScript type definitions
    const typeDefinitions = this.generateTypeDefinitions(
      mapping,
      componentName
    );

    return {
      component_name: componentName,
      original_description: intent.original_text,
      canonical_intent: intent.canonical_name,
      intent_confidence: intent.confidence,
      shadcn_components: mapping.component_pattern.shadcn_components.map(
        (comp) => comp.name
      ),
      component_imports: mapping.component_pattern.shadcn_components.map(
        (comp) => comp.import_path
      ),
      design_pattern: mapping.component_pattern,
      code_template: expandedTemplate,
      props_spec: [
        ...mapping.component_pattern.required_props,
        ...mapping.component_pattern.optional_props,
      ],
      type_definitions: typeDefinitions,
      state_management: mapping.interaction_spec.states,
      event_handlers: mapping.interaction_spec.events,
      design_tokens_used: designTokens,
      accessibility_spec: mapping.accessibility_spec,
      responsive_config: mapping.responsive_behavior,
      validation_rules: mapping.validation_rules,
      conflicts: [],
    };
  }

  /**
   * Generate component name from intent and context
   */
  private generateComponentName(
    intent: ValidatedIntent,
    summary: FunctionalSummary
  ): string {
    // Try to extract action/noun from original text
    const text = intent.original_text.toLowerCase();

    // Common patterns for component names
    const patterns = [
      /(\w+)\s+(button|form|dialog|card|table|menu)/,
      /(login|signup|profile|settings|dashboard)/,
      /(\w+)\s+(component|page|modal)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return this.toPascalCase(match[1] + "-" + match[2]);
      }
    }

    // Fallback: use canonical intent name + suffix
    const base = intent.canonical_name.replace(/-/g, " ");
    const suffix = this.getComponentSuffix(intent.canonical_name);
    return this.toPascalCase(base + suffix);
  }

  /**
   * Get appropriate suffix for component type
   */
  private getComponentSuffix(canonicalName: string): string {
    if (canonicalName.includes("button")) return "";
    if (canonicalName.includes("form")) return "Form";
    if (canonicalName.includes("dialog")) return "Dialog";
    if (canonicalName.includes("card")) return "Card";
    if (canonicalName.includes("table")) return "Table";
    if (canonicalName.includes("menu")) return "Menu";
    return "Component";
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  /**
   * Expand template with placeholder values
   */
  private expandTemplate(
    template: string,
    intent: ValidatedIntent,
    visualSystem?: VisualSystem
  ): string {
    let expanded = template;

    // Replace common placeholders
    const replacements: Record<string, string> = {
      "{{label}}": this.extractLabel(intent.original_text),
      "{{size}}": "default",
      "{{variant}}": "default",
      "{{handler}}": "handleAction",
      "{{className}}": "",
    };

    // Add design token replacements
    if (visualSystem) {
      replacements["{{primaryColor}}"] = visualSystem.colors.primary;
      replacements["{{backgroundColor}}"] = visualSystem.colors.background;
      replacements["{{textColor}}"] = visualSystem.colors.text;
    }

    // Replace all placeholders
    for (const [placeholder, value] of Object.entries(replacements)) {
      expanded = expanded.replace(new RegExp(placeholder, "g"), value);
    }

    return expanded;
  }

  /**
   * Extract label from intent text
   */
  private extractLabel(text: string): string {
    // Try to find action words
    const actionWords = [
      "submit",
      "save",
      "cancel",
      "delete",
      "create",
      "update",
      "login",
      "signup",
      "confirm",
    ];

    for (const action of actionWords) {
      if (text.toLowerCase().includes(action)) {
        return action.charAt(0).toUpperCase() + action.slice(1);
      }
    }

    return "Action";
  }

  /**
   * Map design tokens from visual system
   */
  private mapDesignTokens(
    tokenMappings: any[],
    visualSystem: VisualSystem
  ): Record<string, string> {
    const tokens: Record<string, string> = {};

    for (const mapping of tokenMappings) {
      const tokenPath = mapping.token_path.split(".");
      let value: any = visualSystem;

      // Navigate token path
      for (const key of tokenPath) {
        if (value && typeof value === "object" && key in value) {
          value = value[key];
        } else {
          value = undefined;
          break;
        }
      }

      if (value !== undefined) {
        tokens[mapping.css_var_name] = String(value);
      }
    }

    return tokens;
  }

  /**
   * Generate TypeScript type definitions for component
   */
  private generateTypeDefinitions(
    mapping: IntentMapping,
    componentName: string
  ): string {
    const props = [
      ...mapping.component_pattern.required_props,
      ...mapping.component_pattern.optional_props,
    ];

    const propDefinitions = props
      .map((prop) => {
        // Determine if prop is required based on which array it came from
        const isRequired =
          mapping.component_pattern.required_props.includes(prop);
        const optional = !isRequired ? "?" : "";
        const description = prop.description
          ? `  /** ${prop.description} */\n`
          : "";
        return `${description}  ${prop.name}${optional}: ${prop.type};`;
      })
      .join("\n");

    return `export interface ${componentName}Props {
${propDefinitions}
}`;
  }

  /**
   * Get component category from canonical name
   */
  getComponentCategory(canonicalName: string): string {
    if (canonicalName.includes("button")) return "interactive";
    if (canonicalName.includes("form") || canonicalName.includes("input"))
      return "form";
    if (canonicalName.includes("dialog") || canonicalName.includes("modal"))
      return "overlay";
    if (canonicalName.includes("card") || canonicalName.includes("layout"))
      return "layout";
    if (canonicalName.includes("table") || canonicalName.includes("list"))
      return "data";
    if (canonicalName.includes("menu") || canonicalName.includes("nav"))
      return "navigation";
    if (canonicalName.includes("alert") || canonicalName.includes("toast"))
      return "feedback";
    return "display";
  }

  /**
   * Generate usage example for component
   */
  generateUsageExample(spec: EnrichedComponentSpec): string {
    const propsExample = spec.props_spec
      .filter((p) => {
        // Check if prop is required by looking at the original mapping
        // For now, assume first few props are required
        return spec.props_spec.indexOf(p) < 3;
      })
      .map((p) => {
        if (p.type.includes("=>")) return `${p.name}={handleAction}`;
        if (p.type === "string") return `${p.name}="${p.name}"`;
        if (p.type === "boolean") return p.name;
        return `${p.name}={${p.name}}`;
      })
      .join(" ");

    return `<${spec.component_name} ${propsExample}>
  {children}
</${spec.component_name}>`;
  }

  /**
   * Calculate complexity score for enriched spec
   */
  calculateComplexity(spec: EnrichedComponentSpec): number {
    let complexity = 0;

    // More shadcn components = more complex
    complexity += spec.shadcn_components.length * 10;

    // More required props = more complex
    complexity +=
      spec.props_spec.filter((p) => {
        // Assume first few props are required
        return spec.props_spec.indexOf(p) < 3;
      }).length * 5;

    // State management adds complexity
    complexity += spec.state_management.length * 8;

    // More design tokens = more styling = more complex
    complexity += Object.keys(spec.design_tokens_used || {}).length * 3;

    return Math.min(complexity, 100);
  }
}
