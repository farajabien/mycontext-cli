/**
 * Design Token Extractor
 *
 * Extracts design tokens from React component code including colors, spacing, typography, shadows, and animations.
 */

export interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
  borderRadius: BorderRadiusTokens;
  animations: AnimationTokens;
}

export interface ColorTokens {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
  success: string[];
  warning: string[];
  error: string[];
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
}

export interface TypographyTokens {
  fontFamily: string[];
  fontSize: string[];
  fontWeight: string[];
  lineHeight: string[];
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface BorderRadiusTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface AnimationTokens {
  duration: string[];
  easing: string[];
  properties: string[];
}

export class DesignTokenExtractor {
  /**
   * Extract design tokens from component code
   */
  async extractTokens(componentCode: string): Promise<DesignTokens> {
    return {
      colors: this.extractColors(componentCode),
      spacing: this.extractSpacing(componentCode),
      typography: this.extractTypography(componentCode),
      shadows: this.extractShadows(componentCode),
      borderRadius: this.extractBorderRadius(componentCode),
      animations: this.extractAnimations(componentCode),
    };
  }

  /**
   * Extract color tokens from Tailwind classes
   */
  private extractColors(componentCode: string): ColorTokens {
    const colorPatterns = {
      primary: /(?:bg-|text-|border-)(primary|blue-\d+|indigo-\d+|purple-\d+)/g,
      secondary: /(?:bg-|text-|border-)(secondary|gray-\d+|slate-\d+)/g,
      accent: /(?:bg-|text-|border-)(accent|emerald-\d+|teal-\d+|cyan-\d+)/g,
      neutral: /(?:bg-|text-|border-)(neutral|zinc-\d+|stone-\d+)/g,
      success: /(?:bg-|text-|border-)(success|green-\d+|emerald-\d+)/g,
      warning:
        /(?:bg-|text-|border-)(warning|yellow-\d+|amber-\d+|orange-\d+)/g,
      error: /(?:bg-|text-|border-)(error|red-\d+|rose-\d+)/g,
    };

    const colors: ColorTokens = {
      primary: [],
      secondary: [],
      accent: [],
      neutral: [],
      success: [],
      warning: [],
      error: [],
    };

    Object.entries(colorPatterns).forEach(([category, pattern]) => {
      const matches = componentCode.match(pattern) || [];
      const uniqueColors = [
        ...new Set(
          matches.map((match) => {
            const color = match.split("-").slice(1).join("-");
            return this.mapTailwindToHex(color);
          })
        ),
      ];
      colors[category as keyof ColorTokens] = uniqueColors;
    });

    return colors;
  }

  /**
   * Extract spacing tokens
   */
  private extractSpacing(componentCode: string): SpacingTokens {
    const spacingPattern = /(?:p-|m-|gap-|space-)(xs|sm|md|lg|xl|2xl|3xl)/g;
    const matches = componentCode.match(spacingPattern) || [];
    const uniqueSpacings = [
      ...new Set(matches.map((match) => match.split("-")[1])),
    ];

    return {
      xs: uniqueSpacings.includes("xs") ? "0.25rem" : "0.25rem",
      sm: uniqueSpacings.includes("sm") ? "0.5rem" : "0.5rem",
      md: uniqueSpacings.includes("md") ? "1rem" : "1rem",
      lg: uniqueSpacings.includes("lg") ? "1.5rem" : "1.5rem",
      xl: uniqueSpacings.includes("xl") ? "2rem" : "2rem",
      "2xl": uniqueSpacings.includes("2xl") ? "3rem" : "3rem",
      "3xl": uniqueSpacings.includes("3xl") ? "4rem" : "4rem",
    };
  }

  /**
   * Extract typography tokens
   */
  private extractTypography(componentCode: string): TypographyTokens {
    const fontFamilyPattern = /font-(sans|serif|mono)/g;
    const fontSizePattern =
      /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/g;
    const fontWeightPattern =
      /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/g;
    const lineHeightPattern = /leading-(none|tight|snug|normal|relaxed|loose)/g;

    return {
      fontFamily: [...new Set(componentCode.match(fontFamilyPattern) || [])],
      fontSize: [...new Set(componentCode.match(fontSizePattern) || [])],
      fontWeight: [...new Set(componentCode.match(fontWeightPattern) || [])],
      lineHeight: [...new Set(componentCode.match(lineHeightPattern) || [])],
    };
  }

  /**
   * Extract shadow tokens
   */
  private extractShadows(componentCode: string): ShadowTokens {
    const shadowPattern = /shadow-(sm|md|lg|xl|2xl)/g;
    const matches = componentCode.match(shadowPattern) || [];
    const shadowMatches = matches.map((match) => match.split("-")[1]);

    return {
      sm: shadowMatches.includes("sm")
        ? "0 1px 2px 0 rgb(0 0 0 / 0.05)"
        : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      md: shadowMatches.includes("md")
        ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
        : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      lg: shadowMatches.includes("lg")
        ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
        : "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      xl: shadowMatches.includes("xl")
        ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
        : "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    };
  }

  /**
   * Extract border radius tokens
   */
  private extractBorderRadius(componentCode: string): BorderRadiusTokens {
    const borderRadiusPattern = /rounded-(sm|md|lg|xl|2xl|3xl|full)/g;
    const matches = componentCode.match(borderRadiusPattern) || [];
    const radiusMatches = matches.map((match) => match.split("-")[1]);

    return {
      sm: radiusMatches.includes("sm") ? "0.125rem" : "0.125rem",
      md: radiusMatches.includes("md") ? "0.375rem" : "0.375rem",
      lg: radiusMatches.includes("lg") ? "0.5rem" : "0.5rem",
      xl: radiusMatches.includes("xl") ? "0.75rem" : "0.75rem",
      full: radiusMatches.includes("full") ? "9999px" : "9999px",
    };
  }

  /**
   * Extract animation tokens
   */
  private extractAnimations(componentCode: string): AnimationTokens {
    const durationPattern = /duration-(\d+)/g;
    const easingPattern = /ease-(linear|in|out|in-out)/g;
    const animationPattern =
      /animate-(pulse|bounce|spin|ping|pulse|bounce|spin|ping|wiggle|shake|fade-in|fade-out|slide-in|slide-out)/g;

    return {
      duration: [...new Set(componentCode.match(durationPattern) || [])],
      easing: [...new Set(componentCode.match(easingPattern) || [])],
      properties: [...new Set(componentCode.match(animationPattern) || [])],
    };
  }

  /**
   * Map Tailwind color names to hex values
   */
  private mapTailwindToHex(colorName: string): string {
    const colorMap: Record<string, string> = {
      // Primary colors
      primary: "#3b82f6",
      "blue-500": "#3b82f6",
      "blue-600": "#2563eb",
      "blue-700": "#1d4ed8",
      "indigo-500": "#6366f1",
      "indigo-600": "#4f46e5",
      "purple-500": "#8b5cf6",
      "purple-600": "#7c3aed",

      // Secondary colors
      secondary: "#6b7280",
      "gray-500": "#6b7280",
      "gray-600": "#4b5563",
      "slate-500": "#64748b",
      "slate-600": "#475569",

      // Accent colors
      accent: "#8b5cf6",
      "emerald-500": "#10b981",
      "emerald-600": "#059669",
      "teal-500": "#14b8a6",
      "teal-600": "#0d9488",
      "cyan-500": "#06b6d4",
      "cyan-600": "#0891b2",

      // Neutral colors
      neutral: "#f3f4f6",
      "zinc-500": "#71717a",
      "zinc-600": "#52525b",
      "stone-500": "#78716c",
      "stone-600": "#57534e",

      // Success colors
      success: "#10b981",
      "green-500": "#22c55e",
      "green-600": "#16a34a",

      // Warning colors
      warning: "#f59e0b",
      "yellow-500": "#eab308",
      "yellow-600": "#ca8a04",
      "amber-500": "#f59e0b",
      "amber-600": "#d97706",
      "orange-500": "#f97316",
      "orange-600": "#ea580c",

      // Error colors
      error: "#ef4444",
      "red-500": "#ef4444",
      "red-600": "#dc2626",
      "rose-500": "#f43f5e",
      "rose-600": "#e11d48",
    };

    return colorMap[colorName] || "#000000";
  }

  /**
   * Generate CSS custom properties from design tokens
   */
  generateCSSVariables(tokens: DesignTokens): string {
    let css = ":root {\n";

    // Colors
    Object.entries(tokens.colors).forEach(([category, colors]) => {
      colors.forEach((color: string, index: number) => {
        css += `  --color-${category}-${index + 1}: ${color};\n`;
      });
    });

    // Spacing
    Object.entries(tokens.spacing).forEach(([size, value]) => {
      css += `  --spacing-${size}: ${value};\n`;
    });

    // Typography
    if (tokens.typography.fontFamily.length > 0) {
      css += `  --font-family: ${tokens.typography.fontFamily.join(", ")};\n`;
    }
    if (tokens.typography.fontSize.length > 0) {
      css += `  --font-size-base: ${
        tokens.typography.fontSize.includes("text-base") ? "1rem" : "1rem"
      };\n`;
    }

    // Shadows
    Object.entries(tokens.shadows).forEach(([size, value]) => {
      css += `  --shadow-${size}: ${value};\n`;
    });

    // Border radius
    Object.entries(tokens.borderRadius).forEach(([size, value]) => {
      css += `  --radius-${size}: ${value};\n`;
    });

    css += "}\n";
    return css;
  }
}
