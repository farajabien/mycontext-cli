/**
 * Comprehensive Error Handling System for MyContext CLI
 *
 * Provides structured error handling, logging, and recovery mechanisms
 * for AI providers, API calls, and CLI operations.
 */

import { logger } from "./logger";

export enum ErrorType {
  API_ERROR = "API_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  AI_PROVIDER_ERROR = "AI_PROVIDER_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface StructuredError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string | number;
  details?: Record<string, unknown>;
  timestamp: string;
  source?: string;
  retryable?: boolean;
  retryAfter?: number; // seconds
  suggestions?: string[];
}

export interface ErrorContext {
  operation?: string;
  provider?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export class MyContextError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string | number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly source?: string;
  public readonly retryable?: boolean;
  public readonly retryAfter?: number;
  public readonly suggestions?: string[];

  constructor(structuredError: StructuredError) {
    super(structuredError.message);
    this.name = "MyContextError";
    this.type = structuredError.type;
    this.severity = structuredError.severity;
    this.code = structuredError.code;
    this.details = structuredError.details;
    this.timestamp = structuredError.timestamp;
    this.source = structuredError.source;
    this.retryable = structuredError.retryable;
    this.retryAfter = structuredError.retryAfter;
    this.suggestions = structuredError.suggestions;
  }

  toJSON(): StructuredError {
    return {
      type: this.type,
      severity: this.severity,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      source: this.source,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
      suggestions: this.suggestions,
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: StructuredError[] = [];
  private maxLogSize = 100;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create a structured error from various input types
   */
  public createError(
    error: unknown,
    context: ErrorContext = {},
    defaultType: ErrorType = ErrorType.UNKNOWN_ERROR
  ): MyContextError {
    const timestamp = new Date().toISOString();

    // Handle different error types
    if (error instanceof MyContextError) {
      return error;
    }

    if (error instanceof Error) {
      return this.handleStandardError(error, context, timestamp);
    }

    if (typeof error === "string") {
      return new MyContextError({
        type: defaultType,
        severity: ErrorSeverity.MEDIUM,
        message: error,
        timestamp,
        source: context.operation,
        retryable: false,
      });
    }

    // Handle fetch errors and API responses
    if (typeof error === "object" && error !== null) {
      return this.handleObjectError(
        error as Record<string, unknown>,
        context as Record<string, unknown>,
        timestamp
      );
    }

    return new MyContextError({
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: "An unknown error occurred",
      timestamp,
      source: context.operation,
      details: { originalError: error },
      retryable: false,
    });
  }

  /**
   * Handle AI provider specific errors
   */
  public handleAIProviderError(
    error: unknown,
    provider: string,
    operation: string,
    requestData?: Record<string, unknown>
  ): MyContextError {
    const context: ErrorContext = {
      operation,
      provider,
      metadata: requestData,
    };

    const structuredError = this.createError(
      error,
      context,
      ErrorType.AI_PROVIDER_ERROR
    );

    // Add provider-specific error handling
    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as any).status;

      switch (status) {
        case 401:
          return new MyContextError({
            ...structuredError,
            type: ErrorType.AUTHENTICATION_ERROR,
            suggestions: [
              "Check your API key configuration",
              "Verify API key permissions",
              "Contact support if the issue persists",
            ],
          });
        case 429:
          return new MyContextError({
            ...structuredError,
            type: ErrorType.RATE_LIMIT_ERROR,
            retryable: true,
            retryAfter: 60, // Default retry after 60 seconds
            suggestions: [
              "Wait before retrying",
              "Consider upgrading your API plan",
              "Implement exponential backoff",
            ],
          });
        case 500:
        case 502:
        case 503:
        case 504:
          return new MyContextError({
            ...structuredError,
            retryable: true,
            retryAfter: 30,
            suggestions: [
              "Retry the request after a short delay",
              "Check provider status page",
              "Try a different AI provider if available",
            ],
          });
      }
    }

    this.logError(structuredError);
    return structuredError;
  }

  /**
   * Handle network and connectivity errors
   */
  public handleNetworkError(
    error: unknown,
    context: ErrorContext = {}
  ): MyContextError {
    const baseError = this.createError(error, context, ErrorType.NETWORK_ERROR);

    const networkError = new MyContextError({
      ...baseError.toJSON(),
      retryable: true,
      retryAfter: 10,
      suggestions: [
        "Check your internet connection",
        "Verify firewall settings",
        "Try again in a few moments",
      ],
    });

    this.logError(networkError);
    return networkError;
  }

  /**
   * Handle file system errors
   */
  public handleFileSystemError(
    error: unknown,
    filePath?: string
  ): MyContextError {
    const context: ErrorContext = {
      operation: "file_system",
      metadata: { filePath },
    };

    const baseError = this.createError(
      error,
      context,
      ErrorType.FILE_SYSTEM_ERROR
    );

    const fileSystemError = new MyContextError({
      ...baseError.toJSON(),
      suggestions: [
        "Check file permissions",
        "Verify the file path exists",
        "Ensure sufficient disk space",
        "Check if the file is in use by another process",
      ],
    });

    this.logError(fileSystemError);
    return fileSystemError;
  }

  /**
   * Log error for debugging and monitoring
   */
  private logError(error: StructuredError | MyContextError): void {
    const errorData = error instanceof MyContextError ? error.toJSON() : error;

    this.errorLog.push(errorData);

    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Console logging based on severity
    switch (errorData.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`CRITICAL ERROR: ${errorData.message}`, errorData);
        break;
      case ErrorSeverity.HIGH:
        logger.error(`HIGH SEVERITY ERROR: ${errorData.message}`, errorData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`MEDIUM SEVERITY ERROR: ${errorData.message}`, errorData);
        break;
      case ErrorSeverity.LOW:
        logger.info(`LOW SEVERITY ERROR: ${errorData.message}`, errorData);
        break;
    }
  }

  /**
   * Get recent errors for debugging
   */
  public getRecentErrors(count = 10): StructuredError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  public clearErrors(): void {
    this.errorLog = [];
  }

  /**
   * Handle standard JavaScript errors
   */
  private handleStandardError(
    error: Error,
    context: ErrorContext,
    timestamp: string
  ): MyContextError {
    let type = ErrorType.UNKNOWN_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;
    const suggestions: string[] = [];

    // Categorize by error message patterns
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      type = ErrorType.NETWORK_ERROR;
      retryable = true;
      suggestions.push("Check your internet connection");
    } else if (message.includes("timeout")) {
      type = ErrorType.TIMEOUT_ERROR;
      retryable = true;
      suggestions.push("Try again with a longer timeout");
    } else if (message.includes("permission") || message.includes("access")) {
      type = ErrorType.FILE_SYSTEM_ERROR;
      suggestions.push("Check file permissions and access rights");
    } else if (message.includes("config") || message.includes("setting")) {
      type = ErrorType.CONFIGURATION_ERROR;
      suggestions.push("Check your configuration settings");
    } else if (message.includes("validation") || message.includes("invalid")) {
      type = ErrorType.VALIDATION_ERROR;
      suggestions.push("Verify your input data");
    }

    return new MyContextError({
      type,
      severity,
      message: error.message,
      timestamp,
      source: context.operation,
      details: {
        stack: error.stack,
        name: error.name,
      },
      retryable,
      suggestions,
    });
  }

  /**
   * Handle object-type errors (API responses, etc.)
   */
  private handleObjectError(
    error: Record<string, unknown>,
    context: ErrorContext,
    timestamp: string
  ): MyContextError {
    const message = String(error.message || error.error || "Unknown error");
    const code = error.code || error.status;

    let type = ErrorType.API_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;

    if (typeof code === "number") {
      if (code >= 500) {
        severity = ErrorSeverity.HIGH;
        retryable = true;
      } else if (code === 429) {
        type = ErrorType.RATE_LIMIT_ERROR;
        retryable = true;
      } else if (code === 401 || code === 403) {
        type = ErrorType.AUTHENTICATION_ERROR;
        severity = ErrorSeverity.HIGH;
      }
    }

    return new MyContextError({
      type,
      severity,
      message,
      code:
        typeof code === "string" || typeof code === "number" ? code : undefined,
      timestamp,
      source: context.operation,
      details: error,
      retryable,
    });
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions for common error scenarios
export const createAIProviderError = (
  error: unknown,
  provider: string,
  operation: string
) => errorHandler.handleAIProviderError(error, provider, operation);

export const createNetworkError = (error: unknown, context?: ErrorContext) =>
  errorHandler.handleNetworkError(error, context);

export const createFileSystemError = (error: unknown, filePath?: string) =>
  errorHandler.handleFileSystemError(error, filePath);

export const createError = (
  error: unknown,
  context?: ErrorContext,
  type?: ErrorType
) => errorHandler.createError(error, context, type);
