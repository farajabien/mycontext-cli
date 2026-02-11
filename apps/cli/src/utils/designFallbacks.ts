import {
  FunctionalSummary,
  ProjectScope,
  ContextGaps,
  DesignBrief,
  VisualSystem,
  ComponentHierarchy,
  ImplementationPlan,
  DesignIntent,
  FallbackResult,
  DesignTemplate,
} from "../types/design-pipeline";
import chalk from "chalk";

/**
 * Design Fallbacks
 *
 * Rule-based extractors and templates for when AI generation fails.
 * Ensures the design pipeline always produces usable output.
 */
export class DesignFallbacks {
  private templates: Map<string, DesignTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Extract colors from brand context
   */
  extractColorsFromBrand(brand: string): FallbackResult {
    try {
      const colors: Record<string, string> = {};

      // Look for hex colors in brand text
      const hexMatches = brand.match(/#[0-9A-Fa-f]{6}/g);
      if (hexMatches) {
        colors.primary = hexMatches[0];
        if (hexMatches.length > 1) {
          colors.secondary = hexMatches[1] || "#64748B";
        }
      }

      // Look for color names
      const colorKeywords = {
        blue: "#3B82F6",
        green: "#10B981",
        red: "#EF4444",
        yellow: "#F59E0B",
        purple: "#8B5CF6",
        gray: "#6B7280",
        black: "#000000",
        white: "#FFFFFF",
      };

      for (const [keyword, hex] of Object.entries(colorKeywords)) {
        if (brand.toLowerCase().includes(keyword)) {
          if (!colors.primary) colors.primary = hex;
          else if (!colors.secondary) colors.secondary = hex;
        }
      }

      // Generate complementary colors if we found a primary
      if (colors.primary && !colors.secondary) {
        colors.secondary = this.generateComplementaryColor(colors.primary);
      }

      // Add standard colors
      colors.background = "#FFFFFF";
      colors.surface = "#F8FAFC";
      colors.text = "#0F172A";
      colors.text_muted = "#64748B";
      colors.border = "#E2E8F0";

      return {
        success: true,
        data: colors,
        confidence: 0.7,
        method: "rule_based",
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        data: this.getDefaultColors(),
        confidence: 0.3,
        method: "default",
        warnings: ["Failed to extract colors from brand"],
      };
    }
  }

  /**
   * Infer typography from project context
   */
  inferTypography(summary: FunctionalSummary): FallbackResult {
    try {
      const isDataFocused = summary.key_features.some(
        (f) =>
          f.toLowerCase().includes("dashboard") ||
          f.toLowerCase().includes("analytics") ||
          f.toLowerCase().includes("data")
      );

      const isConsumer = summary.key_features.some(
        (f) =>
          f.toLowerCase().includes("social") ||
          f.toLowerCase().includes("community") ||
          f.toLowerCase().includes("mobile")
      );

      let fontFamilies;
      if (isDataFocused) {
        fontFamilies = {
          heading: "Inter",
          body: "Inter",
          mono: "JetBrains Mono",
        };
      } else if (isConsumer) {
        fontFamilies = {
          heading: "Poppins",
          body: "Inter",
          mono: "Fira Code",
        };
      } else {
        fontFamilies = {
          heading: "Inter",
          body: "Inter",
          mono: "JetBrains Mono",
        };
      }

      const scale = {
        xs: "12px",
        sm: "14px",
        md: "16px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "30px",
        "4xl": "36px",
      };

      const weights = {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      };

      return {
        success: true,
        data: { font_families: fontFamilies, scale, weights },
        confidence: 0.8,
        method: "rule_based",
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        data: this.getDefaultTypography(),
        confidence: 0.5,
        method: "default",
        warnings: ["Failed to infer typography"],
      };
    }
  }

  /**
   * Generate default design tokens
   */
  generateDefaultTokens(projectType: string = "web"): FallbackResult {
    try {
      const template =
        this.templates.get(projectType) || this.templates.get("web");

      if (template?.phases.visual_system) {
        return {
          success: true,
          data: template.phases.visual_system,
          confidence: 0.9,
          method: "template_based",
          warnings: [],
        };
      }

      // Fallback to basic tokens
      const tokens = {
        colors: this.getDefaultColors(),
        typography: this.getDefaultTypography(),
        spacing: this.getDefaultSpacing(),
        radii: this.getDefaultRadii(),
        shadows: this.getDefaultShadows(),
        motion: this.getDefaultMotion(),
        breakpoints: this.getDefaultBreakpoints(),
      };

      return {
        success: true,
        data: tokens,
        confidence: 0.6,
        method: "default",
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        data: this.getDefaultTokens(),
        confidence: 0.3,
        method: "default",
        warnings: ["Failed to generate default tokens"],
      };
    }
  }

  /**
   * Map common design patterns
   */
  mapCommonPatterns(summary: FunctionalSummary): FallbackResult {
    try {
      const patterns: string[] = [];
      const components: any[] = [];
      const screens: any[] = [];

      // Dashboard patterns
      if (
        summary.key_features.some((f) => f.toLowerCase().includes("dashboard"))
      ) {
        patterns.push(
          "card-based layout",
          "data visualization",
          "sidebar navigation"
        );
        components.push(
          this.createComponent("MetricCard", "display", "Display key metrics"),
          this.createComponent("DataTable", "display", "Tabular data display"),
          this.createComponent("Chart", "display", "Data visualization")
        );
        screens.push({
          name: "Dashboard",
          description: "Main dashboard with metrics and charts",
          purpose: "Overview of key data",
          components: ["MetricCard", "DataTable", "Chart"],
          layout_type: "dashboard",
          navigation_flow: ["Settings", "Details"],
          user_journey_position: "main",
        });
      }

      // E-commerce patterns
      if (
        summary.key_features.some(
          (f) =>
            f.toLowerCase().includes("shop") ||
            f.toLowerCase().includes("product")
        )
      ) {
        patterns.push("product grid", "shopping cart", "checkout flow");
        components.push(
          this.createComponent(
            "ProductCard",
            "display",
            "Product information display"
          ),
          this.createComponent("Cart", "display", "Shopping cart component"),
          this.createComponent(
            "CheckoutForm",
            "form",
            "Payment and shipping form"
          )
        );
        screens.push({
          name: "ProductList",
          description: "Product catalog page",
          purpose: "Browse and select products",
          components: ["ProductCard"],
          layout_type: "grid",
          navigation_flow: ["ProductDetail", "Cart"],
          user_journey_position: "main",
        });
      }

      // Form patterns
      if (
        summary.key_features.some(
          (f) =>
            f.toLowerCase().includes("form") ||
            f.toLowerCase().includes("input")
        )
      ) {
        patterns.push(
          "progressive disclosure",
          "validation feedback",
          "step-by-step flow"
        );
        components.push(
          this.createComponent("Input", "form", "Text input field"),
          this.createComponent("Button", "form", "Action button"),
          this.createComponent("FormField", "form", "Form field wrapper")
        );
      }

      // Default patterns if none detected
      if (patterns.length === 0) {
        patterns.push(
          "card-based layout",
          "responsive grid",
          "progressive disclosure"
        );
        components.push(
          this.createComponent("Card", "display", "Content container"),
          this.createComponent("Button", "form", "Action button"),
          this.createComponent("Input", "form", "Text input field")
        );
        screens.push({
          name: "Home",
          description: "Main landing page",
          purpose: "Welcome and navigation",
          components: ["Card", "Button"],
          layout_type: "single_column",
          navigation_flow: ["Settings"],
          user_journey_position: "entry",
        });
      }

      const hierarchy: ComponentHierarchy = {
        screens,
        components,
        design_patterns: patterns,
        interaction_flows: [
          "user onboarding",
          "primary task completion",
          "error recovery",
        ],
        state_management: ["React hooks", "local storage"],
        data_flow: ["Unidirectional data flow with props and callbacks"],
      };

      return {
        success: true,
        data: hierarchy,
        confidence: 0.7,
        method: "rule_based",
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        data: this.getDefaultHierarchy(),
        confidence: 0.4,
        method: "default",
        warnings: ["Failed to map common patterns"],
      };
    }
  }

  /**
   * Get template by project type
   */
  getTemplate(projectType: string): DesignTemplate | null {
    return this.templates.get(projectType) || null;
  }

  /**
   * List available templates
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private initializeTemplates(): void {
    // Dashboard template
    this.templates.set("dashboard", {
      name: "Dashboard",
      description: "Data-focused, minimal design system",
      category: "dashboard",
      phases: {
        design_brief: {
          theme: "light",
          inspiration_sources: [
            { name: "Linear", style: "minimal, data-focused, clean" },
            { name: "Vercel", style: "modern, professional, subtle" },
          ],
          blended_style:
            "Clean, minimal interface optimized for data consumption",
          primary_color: "#3B82F6",
          support_colors: ["#F8FAFC", "#1E293B", "#64748B", "#E2E8F0"],
          typography: {
            heading: "Inter",
            body: "Inter",
            mono: "JetBrains Mono",
          },
          ui_principles: ["clarity", "data-first", "minimal", "performance"],
          motion_style: "subtle, purposeful",
          personality_keywords: ["professional", "clean", "data-focused"],
          emotional_tone: "confident and analytical",
          target_audience: "data professionals",
          accessibility_focus: ["high contrast", "keyboard navigation"],
        },
        visual_system: {
          colors: {
            primary: "#3B82F6",
            secondary: "#64748B",
            accent: "#10B981",
            background: "#FFFFFF",
            surface: "#F8FAFC",
            text: "#0F172A",
            text_muted: "#64748B",
            border: "#E2E8F0",
            success: "#10B981",
            warning: "#F59E0B",
            error: "#EF4444",
            info: "#3B82F6",
          },
          typography: {
            font_families: {
              heading: "Inter",
              body: "Inter",
              mono: "JetBrains Mono",
            },
            scale: {
              xs: "12px",
              sm: "14px",
              md: "16px",
              lg: "18px",
              xl: "20px",
              "2xl": "24px",
              "3xl": "30px",
              "4xl": "36px",
            },
            weights: {
              normal: "400",
              medium: "500",
              semibold: "600",
              bold: "700",
            },
          },
          spacing: {
            xs: "4px",
            sm: "8px",
            md: "16px",
            lg: "24px",
            xl: "32px",
            "2xl": "48px",
            "3xl": "64px",
            "4xl": "96px",
          },
          radii: {
            none: "0px",
            sm: "4px",
            md: "8px",
            lg: "12px",
            xl: "16px",
            full: "9999px",
          },
          shadows: {
            sm: "0 1px 2px rgba(0,0,0,0.05)",
            md: "0 4px 6px rgba(0,0,0,0.1)",
            lg: "0 10px 15px rgba(0,0,0,0.1)",
            xl: "0 20px 25px rgba(0,0,0,0.1)",
          },
          motion: {
            duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
            easing: {
              linear: "linear",
              ease_in: "cubic-bezier(0.4,0,1,1)",
              ease_out: "cubic-bezier(0,0,0.2,1)",
              ease_in_out: "cubic-bezier(0.4,0,0.2,1)",
            },
          },
          breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
        },
      },
      use_cases: ["Analytics dashboards", "Admin panels", "Data visualization"],
      complexity: "medium",
    });

    // E-commerce template
    this.templates.set("ecommerce", {
      name: "E-commerce",
      description: "Product-focused, conversion-optimized design system",
      category: "ecommerce",
      phases: {
        design_brief: {
          theme: "light",
          inspiration_sources: [
            { name: "Shopify", style: "conversion-focused, product-centric" },
            { name: "Stripe", style: "clean, trustworthy, professional" },
          ],
          blended_style:
            "Conversion-optimized interface with strong product focus",
          primary_color: "#2563EB",
          support_colors: ["#F8FAFC", "#1E293B", "#64748B", "#E2E8F0"],
          typography: {
            heading: "Inter",
            body: "Inter",
            mono: "JetBrains Mono",
          },
          ui_principles: ["conversion", "trust", "clarity", "accessibility"],
          motion_style: "smooth, engaging",
          personality_keywords: ["trustworthy", "engaging", "professional"],
          emotional_tone: "confident and welcoming",
          target_audience: "online shoppers",
          accessibility_focus: [
            "high contrast",
            "keyboard navigation",
            "screen reader support",
          ],
        },
        visual_system: {
          colors: {
            primary: "#2563EB",
            secondary: "#64748B",
            accent: "#10B981",
            background: "#FFFFFF",
            surface: "#F8FAFC",
            text: "#0F172A",
            text_muted: "#64748B",
            border: "#E2E8F0",
            success: "#10B981",
            warning: "#F59E0B",
            error: "#EF4444",
            info: "#3B82F6",
          },
          typography: {
            font_families: {
              heading: "Inter",
              body: "Inter",
              mono: "JetBrains Mono",
            },
            scale: {
              xs: "12px",
              sm: "14px",
              md: "16px",
              lg: "18px",
              xl: "20px",
              "2xl": "24px",
              "3xl": "30px",
              "4xl": "36px",
            },
            weights: {
              normal: "400",
              medium: "500",
              semibold: "600",
              bold: "700",
            },
          },
          spacing: {
            xs: "4px",
            sm: "8px",
            md: "16px",
            lg: "24px",
            xl: "32px",
            "2xl": "48px",
            "3xl": "64px",
            "4xl": "96px",
          },
          radii: {
            none: "0px",
            sm: "4px",
            md: "8px",
            lg: "12px",
            xl: "16px",
            full: "9999px",
          },
          shadows: {
            sm: "0 1px 2px rgba(0,0,0,0.05)",
            md: "0 4px 6px rgba(0,0,0,0.1)",
            lg: "0 10px 15px rgba(0,0,0,0.1)",
            xl: "0 20px 25px rgba(0,0,0,0.1)",
          },
          motion: {
            duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
            easing: {
              linear: "linear",
              ease_in: "cubic-bezier(0.4,0,1,1)",
              ease_out: "cubic-bezier(0,0,0.2,1)",
              ease_in_out: "cubic-bezier(0.4,0,0.2,1)",
            },
          },
          breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
        },
      },
      use_cases: ["Online stores", "Product catalogs", "Marketplace platforms"],
      complexity: "high",
    });

    // Mobile PWA template
    this.templates.set("mobile", {
      name: "Mobile PWA",
      description: "Touch-first, bold design system",
      category: "mobile",
      phases: {
        design_brief: {
          theme: "light",
          inspiration_sources: [
            { name: "iOS", style: "clean, touch-optimized, intuitive" },
            { name: "Material Design", style: "bold, accessible, consistent" },
          ],
          blended_style:
            "Touch-optimized interface with bold, accessible design",
          primary_color: "#6366F1",
          support_colors: ["#F8FAFC", "#1E293B", "#64748B", "#E2E8F0"],
          typography: {
            heading: "Inter",
            body: "Inter",
            mono: "JetBrains Mono",
          },
          ui_principles: [
            "touch-first",
            "accessibility",
            "performance",
            "engagement",
          ],
          motion_style: "smooth, responsive",
          personality_keywords: ["engaging", "intuitive", "modern"],
          emotional_tone: "energetic and approachable",
          target_audience: "mobile users",
          accessibility_focus: [
            "touch targets",
            "high contrast",
            "screen reader support",
          ],
        },
        visual_system: {
          colors: {
            primary: "#6366F1",
            secondary: "#64748B",
            accent: "#10B981",
            background: "#FFFFFF",
            surface: "#F8FAFC",
            text: "#0F172A",
            text_muted: "#64748B",
            border: "#E2E8F0",
            success: "#10B981",
            warning: "#F59E0B",
            error: "#EF4444",
            info: "#3B82F6",
          },
          typography: {
            font_families: {
              heading: "Inter",
              body: "Inter",
              mono: "JetBrains Mono",
            },
            scale: {
              xs: "14px",
              sm: "16px",
              md: "18px",
              lg: "20px",
              xl: "22px",
              "2xl": "24px",
              "3xl": "28px",
              "4xl": "32px",
            },
            weights: {
              normal: "400",
              medium: "500",
              semibold: "600",
              bold: "700",
            },
          },
          spacing: {
            xs: "8px",
            sm: "12px",
            md: "16px",
            lg: "20px",
            xl: "24px",
            "2xl": "32px",
            "3xl": "40px",
            "4xl": "48px",
          },
          radii: {
            none: "0px",
            sm: "6px",
            md: "8px",
            lg: "12px",
            xl: "16px",
            full: "9999px",
          },
          shadows: {
            sm: "0 2px 4px rgba(0,0,0,0.1)",
            md: "0 4px 8px rgba(0,0,0,0.1)",
            lg: "0 8px 16px rgba(0,0,0,0.1)",
            xl: "0 16px 32px rgba(0,0,0,0.1)",
          },
          motion: {
            duration: { fast: "200ms", normal: "300ms", slow: "400ms" },
            easing: {
              linear: "linear",
              ease_in: "cubic-bezier(0.4,0,1,1)",
              ease_out: "cubic-bezier(0,0,0.2,1)",
              ease_in_out: "cubic-bezier(0.4,0,0.2,1)",
            },
          },
          breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
        },
      },
      use_cases: ["Mobile apps", "PWAs", "Touch interfaces"],
      complexity: "medium",
    });

    // Default web template
    this.templates.set("web", {
      name: "Web Application",
      description: "General purpose web application design system",
      category: "custom",
      phases: {
        design_brief: {
          theme: "light",
          inspiration_sources: [
            { name: "Tailwind UI", style: "utility-first, component-based" },
            { name: "shadcn/ui", style: "accessible, customizable, modern" },
          ],
          blended_style:
            "Modern, accessible web interface with utility-first approach",
          primary_color: "#3B82F6",
          support_colors: ["#F8FAFC", "#1E293B", "#64748B", "#E2E8F0"],
          typography: {
            heading: "Inter",
            body: "Inter",
            mono: "JetBrains Mono",
          },
          ui_principles: [
            "accessibility",
            "consistency",
            "performance",
            "maintainability",
          ],
          motion_style: "smooth, purposeful",
          personality_keywords: ["professional", "clean", "reliable"],
          emotional_tone: "confident and trustworthy",
          target_audience: "general web users",
          accessibility_focus: [
            "WCAG 2.1 AA",
            "keyboard navigation",
            "screen reader support",
          ],
        },
        visual_system: {
          colors: {
            primary: "#3B82F6",
            secondary: "#64748B",
            accent: "#10B981",
            background: "#FFFFFF",
            surface: "#F8FAFC",
            text: "#0F172A",
            text_muted: "#64748B",
            border: "#E2E8F0",
            success: "#10B981",
            warning: "#F59E0B",
            error: "#EF4444",
            info: "#3B82F6",
          },
          typography: {
            font_families: {
              heading: "Inter",
              body: "Inter",
              mono: "JetBrains Mono",
            },
            scale: {
              xs: "12px",
              sm: "14px",
              md: "16px",
              lg: "18px",
              xl: "20px",
              "2xl": "24px",
              "3xl": "30px",
              "4xl": "36px",
            },
            weights: {
              normal: "400",
              medium: "500",
              semibold: "600",
              bold: "700",
            },
          },
          spacing: {
            xs: "4px",
            sm: "8px",
            md: "16px",
            lg: "24px",
            xl: "32px",
            "2xl": "48px",
            "3xl": "64px",
            "4xl": "96px",
          },
          radii: {
            none: "0px",
            sm: "4px",
            md: "8px",
            lg: "12px",
            xl: "16px",
            full: "9999px",
          },
          shadows: {
            sm: "0 1px 2px rgba(0,0,0,0.05)",
            md: "0 4px 6px rgba(0,0,0,0.1)",
            lg: "0 10px 15px rgba(0,0,0,0.1)",
            xl: "0 20px 25px rgba(0,0,0,0.1)",
          },
          motion: {
            duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
            easing: {
              linear: "linear",
              ease_in: "cubic-bezier(0.4,0,1,1)",
              ease_out: "cubic-bezier(0,0,0.2,1)",
              ease_in_out: "cubic-bezier(0.4,0,0.2,1)",
            },
          },
          breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
        },
      },
      use_cases: ["Web applications", "SaaS platforms", "General websites"],
      complexity: "low",
    });
  }

  private createComponent(
    name: string,
    type: string,
    description: string
  ): any {
    return {
      name,
      description,
      type,
      props: [
        {
          name: "children",
          type: "ReactNode",
          required: false,
          description: "Component content",
        },
      ],
      interactions: ["click", "hover"],
      states: ["default", "loading", "disabled"],
      accessibility_requirements: ["aria-label", "keyboard navigation"],
      responsive_behavior: "Responsive design",
      related_components: [],
    };
  }

  private generateComplementaryColor(hex: string): string {
    // Simple complementary color generation
    const colorMap: Record<string, string> = {
      "#3B82F6": "#F59E0B", // Blue -> Orange
      "#10B981": "#EF4444", // Green -> Red
      "#EF4444": "#10B981", // Red -> Green
      "#F59E0B": "#3B82F6", // Orange -> Blue
      "#8B5CF6": "#F59E0B", // Purple -> Orange
      "#6366F1": "#10B981", // Indigo -> Green
    };

    return colorMap[hex] || "#64748B";
  }

  private getDefaultColors(): Record<string, string> {
    return {
      primary: "#3B82F6",
      secondary: "#64748B",
      accent: "#10B981",
      background: "#FFFFFF",
      surface: "#F8FAFC",
      text: "#0F172A",
      text_muted: "#64748B",
      border: "#E2E8F0",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    };
  }

  private getDefaultTypography(): any {
    return {
      font_families: {
        heading: "Inter",
        body: "Inter",
        mono: "JetBrains Mono",
      },
      scale: {
        xs: "12px",
        sm: "14px",
        md: "16px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "30px",
        "4xl": "36px",
      },
      weights: { normal: "400", medium: "500", semibold: "600", bold: "700" },
    };
  }

  private getDefaultSpacing(): Record<string, string> {
    return {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "24px",
      xl: "32px",
      "2xl": "48px",
      "3xl": "64px",
      "4xl": "96px",
    };
  }

  private getDefaultRadii(): Record<string, string> {
    return {
      none: "0px",
      sm: "4px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      full: "9999px",
    };
  }

  private getDefaultShadows(): Record<string, string> {
    return {
      sm: "0 1px 2px rgba(0,0,0,0.05)",
      md: "0 4px 6px rgba(0,0,0,0.1)",
      lg: "0 10px 15px rgba(0,0,0,0.1)",
      xl: "0 20px 25px rgba(0,0,0,0.1)",
    };
  }

  private getDefaultMotion(): any {
    return {
      duration: { fast: "150ms", normal: "300ms", slow: "500ms" },
      easing: {
        linear: "linear",
        ease_in: "cubic-bezier(0.4,0,1,1)",
        ease_out: "cubic-bezier(0,0,0.2,1)",
        ease_in_out: "cubic-bezier(0.4,0,0.2,1)",
      },
    };
  }

  private getDefaultBreakpoints(): Record<string, string> {
    return { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" };
  }

  private getDefaultTokens(): any {
    return {
      colors: this.getDefaultColors(),
      typography: this.getDefaultTypography(),
      spacing: this.getDefaultSpacing(),
      radii: this.getDefaultRadii(),
      shadows: this.getDefaultShadows(),
      motion: this.getDefaultMotion(),
      breakpoints: this.getDefaultBreakpoints(),
    };
  }

  private getDefaultHierarchy(): ComponentHierarchy {
    return {
      screens: [
        {
          name: "Home",
          description: "Main landing page",
          purpose: "Welcome and navigation",
          components: ["Card", "Button"],
          layout_type: "single_column",
          navigation_flow: ["Settings"],
          user_journey_position: "entry",
        },
      ],
      components: [
        this.createComponent("Card", "display", "Content container"),
        this.createComponent("Button", "form", "Action button"),
        this.createComponent("Input", "form", "Text input field"),
      ],
      design_patterns: [
        "card-based layout",
        "responsive grid",
        "progressive disclosure",
      ],
      interaction_flows: [
        "user onboarding",
        "primary task completion",
        "error recovery",
      ],
      state_management: ["React hooks", "local storage"],
      data_flow: ["Unidirectional data flow with props and callbacks"],
    };
  }
}
