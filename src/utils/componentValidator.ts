/**
 * Component Validator
 * 
 * Validates React components for syntax, structure, and best practices.
 * Used by the EnhancementAgent to ensure quality and compliance.
 */

export interface ComponentValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
  suggestions: string[];
}

export interface ValidationError {
  type: "syntax" | "structure" | "react" | "typescript" | "accessibility";
  message: string;
  line?: number;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  type: "performance" | "accessibility" | "best-practice";
  message: string;
  line?: number;
  suggestion: string;
}

export class ComponentValidator {
  /**
   * Validate component syntax
   */
  async validateSyntax(componentCode: string): Promise<boolean> {
    try {
      // Basic syntax validation
      if (!componentCode.includes('export default')) {
        throw new Error('Component must have default export');
      }

      if (!componentCode.includes('function') && !componentCode.includes('const')) {
        throw new Error('Component must be a function or const');
      }

      if (!componentCode.includes('return')) {
        throw new Error('Component must have return statement');
      }

      // Check for basic React imports
      if (!componentCode.includes('import React') && !componentCode.includes('import { useState }')) {
        throw new Error('Component must import React or React hooks');
      }

      return true;
    } catch (error) {
      console.error('Syntax validation failed:', error);
      return false;
    }
  }

  /**
   * Validate enhancement against constraints
   */
  async validateEnhancement(
    componentCode: string,
    constraints: {
      maxDependencies: number;
      targetFramework: "react" | "next";
      uiLibrary: "shadcn" | "custom";
    }
  ): Promise<ComponentValidation> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Check dependencies
    const dependencies = this.extractDependencies(componentCode);
    if (dependencies.length > constraints.maxDependencies) {
      errors.push({
        type: "structure",
        message: `Too many dependencies: ${dependencies.length} > ${constraints.maxDependencies}`,
        severity: "error",
      });
    }

    // Check for shadcn/ui usage if required
    if (constraints.uiLibrary === "shadcn") {
      const shadcnComponents = this.extractShadcnComponents(componentCode);
      if (shadcnComponents.length === 0) {
        warnings.push({
          type: "best-practice",
          message: "No shadcn/ui components found",
          suggestion: "Consider using shadcn/ui components for consistency",
        });
      }
    }

    // Check accessibility
    const accessibilityIssues = this.checkAccessibility(componentCode);
    warnings.push(...accessibilityIssues);

    // Check performance
    const performanceIssues = this.checkPerformance(componentCode);
    warnings.push(...performanceIssues);

    // Calculate score
    const score = this.calculateScore(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
      suggestions,
    };
  }

  /**
   * Extract dependencies from component code
   */
  private extractDependencies(componentCode: string): string[] {
    const dependencies: string[] = [];

    // React hooks
    if (componentCode.includes('useState')) dependencies.push('useState');
    if (componentCode.includes('useEffect')) dependencies.push('useEffect');
    if (componentCode.includes('useCallback')) dependencies.push('useCallback');
    if (componentCode.includes('useMemo')) dependencies.push('useMemo');
    if (componentCode.includes('useRef')) dependencies.push('useRef');
    if (componentCode.includes('useContext')) dependencies.push('useContext');

    // shadcn/ui components
    const shadcnComponents = [
      'Button', 'Input', 'Card', 'Dialog', 'Modal', 'Select', 'Checkbox',
      'RadioGroup', 'Textarea', 'Switch', 'Slider', 'Progress', 'Badge',
      'Avatar', 'Alert', 'Toast', 'Tooltip', 'Popover', 'DropdownMenu'
    ];

    shadcnComponents.forEach(component => {
      if (componentCode.includes(component)) {
        dependencies.push(`@/components/ui/${component.toLowerCase()}`);
      }
    });

    return dependencies;
  }

  /**
   * Extract shadcn/ui components
   */
  private extractShadcnComponents(componentCode: string): string[] {
    const shadcnComponents = [
      'Button', 'Input', 'Card', 'Dialog', 'Modal', 'Select', 'Checkbox',
      'RadioGroup', 'Textarea', 'Switch', 'Slider', 'Progress', 'Badge',
      'Avatar', 'Alert', 'Toast', 'Tooltip', 'Popover', 'DropdownMenu'
    ];

    return shadcnComponents.filter(component => 
      componentCode.includes(component)
    );
  }

  /**
   * Check accessibility issues
   */
  private checkAccessibility(componentCode: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!componentCode.includes('aria-label') && !componentCode.includes('aria-labelledby')) {
      warnings.push({
        type: "accessibility",
        message: "Missing ARIA labels",
        suggestion: "Add aria-label or aria-labelledby for better screen reader support",
      });
    }

    if (componentCode.includes('onClick') && !componentCode.includes('onKeyDown')) {
      warnings.push({
        type: "accessibility",
        message: "Missing keyboard navigation",
        suggestion: "Add onKeyDown handler for keyboard accessibility",
      });
    }

    if (componentCode.includes('button') && !componentCode.includes('type=')) {
      warnings.push({
        type: "accessibility",
        message: "Button missing type attribute",
        suggestion: "Add type='button' to prevent form submission",
      });
    }

    return warnings;
  }

  /**
   * Check performance issues
   */
  private checkPerformance(componentCode: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (componentCode.includes('map') && !componentCode.includes('key=')) {
      warnings.push({
        type: "performance",
        message: "Missing key prop in map",
        suggestion: "Add unique key prop to mapped elements",
      });
    }

    if (componentCode.includes('useState') && !componentCode.includes('useCallback')) {
      warnings.push({
        type: "performance",
        message: "Consider using useCallback",
        suggestion: "Use useCallback for event handlers to prevent unnecessary re-renders",
      });
    }

    if (componentCode.includes('useEffect') && !componentCode.includes('dependencies')) {
      warnings.push({
        type: "performance",
        message: "Missing useEffect dependencies",
        suggestion: "Add dependency array to useEffect to prevent infinite loops",
      });
    }

    return warnings;
  }

  /**
   * Calculate validation score
   */
  private calculateScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;

    // Deduct points for errors
    score -= errors.length * 20;

    // Deduct points for warnings
    score -= warnings.length * 5;

    return Math.max(0, score);
  }
}
