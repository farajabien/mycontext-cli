import chalk from "chalk";

export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AI_PROVIDER_ERROR = "AI_PROVIDER_ERROR",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  COMPONENT_GENERATION_ERROR = "COMPONENT_GENERATION_ERROR",
  PROJECT_SETUP_ERROR = "PROJECT_SETUP_ERROR",
  DEPENDENCY_ERROR = "DEPENDENCY_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface MyContextError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  suggestions?: string[];
}

export class ErrorHandler {
  /**
   * Format a user-friendly error message with suggestions
   */
  static formatError(error: MyContextError): string {
    const baseMessage = `${this.getErrorIcon(error.type)} ${this.getErrorTitle(
      error.type
    )}\n\n`;

    let message = `${chalk.red("❌")} ${this.getErrorTitle(error.type)}\n\n`;
    message += `${chalk.blue("💡")} ${this.getErrorDescription(error.type)}\n`;

    if (error.context) {
      message += `\n${chalk.gray("Context:")}\n`;
      Object.entries(error.context).forEach(([key, value]) => {
        message += `  ${key}: ${value}\n`;
      });
    }

    const suggestions = this.getErrorSuggestions(error);
    if (suggestions.length > 0) {
      message += `\n${chalk.yellow("🔧 Solutions:")}\n`;
      suggestions.forEach((suggestion, index) => {
        message += `  ${index + 1}. ${suggestion}\n`;
      });
    }

    if (error.originalError) {
      message += `\n${chalk.gray("Technical details:")} ${
        error.originalError.message
      }\n`;
    }

    return message;
  }

  /**
   * Create a structured error object
   */
  static createError(
    type: ErrorType,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ): MyContextError {
    return {
      type,
      message,
      originalError,
      context,
    };
  }

  /**
   * Wrap an error with additional context and suggestions
   */
  static wrapError(
    error: Error,
    type: ErrorType,
    context?: Record<string, any>
  ): MyContextError {
    return this.createError(type, error.message, error, context);
  }

  /**
   * Get error icon based on type
   */
  private static getErrorIcon(type: ErrorType): string {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return "🔍";
      case ErrorType.AI_PROVIDER_ERROR:
        return "🤖";
      case ErrorType.FILE_SYSTEM_ERROR:
        return "📁";
      case ErrorType.NETWORK_ERROR:
        return "🌐";
      case ErrorType.CONFIGURATION_ERROR:
        return "⚙️";
      case ErrorType.COMPONENT_GENERATION_ERROR:
        return "🧩";
      case ErrorType.PROJECT_SETUP_ERROR:
        return "🏗️";
      case ErrorType.DEPENDENCY_ERROR:
        return "📦";
      case ErrorType.AUTHENTICATION_ERROR:
        return "🔐";
      default:
        return "❌";
    }
  }

  /**
   * Get user-friendly error title
   */
  private static getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return "Project Validation Failed";
      case ErrorType.AI_PROVIDER_ERROR:
        return "AI Provider Error";
      case ErrorType.FILE_SYSTEM_ERROR:
        return "File System Error";
      case ErrorType.NETWORK_ERROR:
        return "Network Connection Error";
      case ErrorType.CONFIGURATION_ERROR:
        return "Configuration Error";
      case ErrorType.COMPONENT_GENERATION_ERROR:
        return "Component Generation Failed";
      case ErrorType.PROJECT_SETUP_ERROR:
        return "Project Setup Failed";
      case ErrorType.DEPENDENCY_ERROR:
        return "Dependency Error";
      case ErrorType.AUTHENTICATION_ERROR:
        return "Authentication Error";
      default:
        return "An Error Occurred";
    }
  }

  /**
   * Get error description
   */
  private static getErrorDescription(type: ErrorType): string {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return "Unable to validate the project structure.";
      case ErrorType.AI_PROVIDER_ERROR:
        return "Failed to communicate with the AI provider.";
      case ErrorType.FILE_SYSTEM_ERROR:
        return "Unable to access or modify files.";
      case ErrorType.NETWORK_ERROR:
        return "Network connection issue.";
      case ErrorType.CONFIGURATION_ERROR:
        return "Configuration is invalid or incomplete.";
      case ErrorType.COMPONENT_GENERATION_ERROR:
        return "Failed to generate React components.";
      case ErrorType.PROJECT_SETUP_ERROR:
        return "Unable to initialize or configure the project.";
      case ErrorType.DEPENDENCY_ERROR:
        return "Missing or incompatible dependencies.";
      case ErrorType.AUTHENTICATION_ERROR:
        return "Authentication failed.";
      default:
        return "An unexpected error occurred.";
    }
  }

  /**
   * Get error-specific suggestions
   */
  private static getErrorSuggestions(error: MyContextError): string[] {
    const suggestions: string[] = [];

    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        if (error.message.includes("glob")) {
          suggestions.push(
            "Install missing dependencies: npm install glob@latest"
          );
          suggestions.push(
            "Clear node_modules and reinstall: rm -rf node_modules && npm install"
          );
        }
        suggestions.push(
          "Check project structure: mycontext validate --verbose"
        );
        suggestions.push(
          "Verify Node.js version: node --version (should be 18+)"
        );
        break;

      case ErrorType.AI_PROVIDER_ERROR:
        suggestions.push("Check API key configuration in .env files");
        suggestions.push("Verify API key validity and rate limits");
        suggestions.push("Test connection: mycontext status --check-health");
        suggestions.push("Try a different AI provider in MYCONTEXT_PROVIDER");
        break;

      case ErrorType.COMPONENT_GENERATION_ERROR:
        suggestions.push("Ensure PRD is complete: check .mycontext/01-prd.md");
        suggestions.push("Verify AI provider is configured correctly");
        suggestions.push("Check available disk space");
        suggestions.push(
          "Try generating a single component first: mycontext generate-components Button"
        );
        break;

      case ErrorType.DEPENDENCY_ERROR:
        suggestions.push("Install missing packages: npm install");
        suggestions.push("Update dependencies: npm update");
        suggestions.push("Check package.json for conflicts");
        break;

      case ErrorType.CONFIGURATION_ERROR:
        suggestions.push(
          "Run setup commands: mycontext setup-database, mycontext setup-shadcn"
        );
        suggestions.push("Check .env files for required variables");
        suggestions.push("Verify configuration files are valid JSON/YAML");
        break;

      case ErrorType.PROJECT_SETUP_ERROR:
        suggestions.push("Ensure you're in a Next.js project root");
        suggestions.push("Check Node.js and npm versions");
        suggestions.push("Verify write permissions in the project directory");
        break;

      default:
        suggestions.push("Check logs for more details");
        suggestions.push("Try the command again");
        suggestions.push("Update MyContext CLI: mycontext --up");
    }

    return suggestions;
  }

  /**
   * Handle and display an error, then exit
   */
  static handleError(error: MyContextError): never {
    console.error(this.formatError(error));
    process.exit(1);
  }

  /**
   * Handle an error gracefully without exiting
   */
  static handleErrorGracefully(error: MyContextError): void {
    console.error(this.formatError(error));
  }

  /**
   * Convert common errors to structured errors
   */
  static fromError(
    error: Error,
    context?: Record<string, any>
  ): MyContextError {
    // Try to infer error type from message
    let type = ErrorType.UNKNOWN_ERROR;

    const message = error.message.toLowerCase();

    if (
      message.includes("glob") ||
      message.includes("module") ||
      message.includes("cannot find")
    ) {
      type = ErrorType.DEPENDENCY_ERROR;
    } else if (
      message.includes("api") ||
      message.includes("provider") ||
      message.includes("claude") ||
      message.includes("grok")
    ) {
      type = ErrorType.AI_PROVIDER_ERROR;
    } else if (message.includes("validation") || message.includes("invalid")) {
      type = ErrorType.VALIDATION_ERROR;
    } else if (message.includes("network") || message.includes("connection")) {
      type = ErrorType.NETWORK_ERROR;
    } else if (
      message.includes("config") ||
      message.includes("configuration")
    ) {
      type = ErrorType.CONFIGURATION_ERROR;
    } else if (message.includes("component") || message.includes("generate")) {
      type = ErrorType.COMPONENT_GENERATION_ERROR;
    } else if (message.includes("setup") || message.includes("init")) {
      type = ErrorType.PROJECT_SETUP_ERROR;
    } else if (message.includes("auth") || message.includes("login")) {
      type = ErrorType.AUTHENTICATION_ERROR;
    }

    return this.createError(type, error.message, error, context);
  }
}
