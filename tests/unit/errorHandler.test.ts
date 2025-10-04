/**
 * Error Handler Unit Tests
 * 
 * Tests for the comprehensive error handling system
 */

import {
  errorHandler,
  ErrorType,
  ErrorSeverity,
  MyContextError,
  createAIProviderError,
  createNetworkError,
  createFileSystemError,
  createError
} from '../../src/utils/errorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    errorHandler.clearErrors();
  });

  describe('createError', () => {
    it('should handle MyContextError instances', () => {
      const originalError = new MyContextError({
        type: ErrorType.API_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Test error',
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      const result = errorHandler.createError(originalError);
      expect(result).toBe(originalError);
    });

    it('should handle standard Error instances', () => {
      const error = new Error('Test error message');
      const result = errorHandler.createError(error, { operation: 'test' });

      expect(result).toBeInstanceOf(MyContextError);
      expect(result.message).toBe('Test error message');
      expect(result.source).toBe('test');
      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it('should handle string errors', () => {
      const result = errorHandler.createError('String error message');

      expect(result).toBeInstanceOf(MyContextError);
      expect(result.message).toBe('String error message');
      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it('should handle object errors', () => {
      const errorObj = {
        message: 'API error',
        status: 500,
        code: 'INTERNAL_ERROR'
      };

      const result = errorHandler.createError(errorObj);

      expect(result).toBeInstanceOf(MyContextError);
      expect(result.message).toBe('API error');
      expect(result.code).toBe(500);
      expect(result.type).toBe(ErrorType.API_ERROR);
    });

    it('should handle unknown error types', () => {
      const result = errorHandler.createError(42);

      expect(result).toBeInstanceOf(MyContextError);
      expect(result.message).toBe('An unknown error occurred');
      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it('should categorize network errors correctly', () => {
      const networkError = new Error('fetch failed due to network issues');
      const result = errorHandler.createError(networkError);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.suggestions).toContain('Check your internet connection');
    });

    it('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout after 30000ms');
      const result = errorHandler.createError(timeoutError);

      expect(result.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.suggestions).toContain('Try again with a longer timeout');
    });

    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid input provided');
      const result = errorHandler.createError(validationError);

      expect(result.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.suggestions).toContain('Verify your input data');
    });
  });

  describe('handleAIProviderError', () => {
    it('should handle authentication errors (401)', () => {
      const apiError = {
        status: 401,
        message: 'Invalid API key'
      };

      const result = errorHandler.handleAIProviderError(
        apiError,
        'xai',
        'generate',
        { prompt: 'test' }
      );

      expect(result.type).toBe(ErrorType.AUTHENTICATION_ERROR);
      expect(result.suggestions).toContain('Check your API key configuration');
      expect(result.retryable).toBeFalsy();
    });

    it('should handle rate limit errors (429)', () => {
      const apiError = {
        status: 429,
        message: 'Rate limit exceeded'
      };

      const result = errorHandler.handleAIProviderError(
        apiError,
        'xai',
        'generate'
      );

      expect(result.type).toBe(ErrorType.RATE_LIMIT_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(60);
      expect(result.suggestions).toContain('Wait before retrying');
    });

    it('should handle server errors (5xx)', () => {
      const apiError = {
        status: 500,
        message: 'Internal server error'
      };

      const result = errorHandler.handleAIProviderError(
        apiError,
        'xai',
        'generate'
      );

      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(30);
      expect(result.suggestions).toContain('Retry the request after a short delay');
    });

    it('should log errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const apiError = new Error('Test error');
      errorHandler.handleAIProviderError(apiError, 'xai', 'generate');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('handleNetworkError', () => {
    it('should create retryable network errors', () => {
      const networkError = new Error('Connection refused');
      const result = errorHandler.handleNetworkError(networkError, {
        operation: 'api_call'
      });

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(10);
      expect(result.suggestions).toContain('Check your internet connection');
      expect(result.source).toBe('api_call');
    });
  });

  describe('handleFileSystemError', () => {
    it('should create file system errors with suggestions', () => {
      const fsError = new Error('ENOENT: no such file or directory');
      const result = errorHandler.handleFileSystemError(fsError, '/path/to/file');

      expect(result.type).toBe(ErrorType.FILE_SYSTEM_ERROR);
      expect(result.suggestions).toContain('Check file permissions');
      expect(result.suggestions).toContain('Verify the file path exists');
      expect(result.details?.filePath).toBe('/path/to/file');
    });
  });

  describe('error logging', () => {
    it('should store errors in log', () => {
      const error = new Error('Test error');
      errorHandler.createError(error);

      const recentErrors = errorHandler.getRecentErrors(1);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].message).toBe('Test error');
    });

    it('should limit log size', () => {
      // Create more errors than the max log size
      for (let i = 0; i < 150; i++) {
        errorHandler.createError(new Error(`Error ${i}`));
      }

      const recentErrors = errorHandler.getRecentErrors(200);
      expect(recentErrors.length).toBeLessThanOrEqual(100);
    });

    it('should clear errors', () => {
      errorHandler.createError(new Error('Test error'));
      expect(errorHandler.getRecentErrors()).toHaveLength(1);

      errorHandler.clearErrors();
      expect(errorHandler.getRecentErrors()).toHaveLength(0);
    });
  });

  describe('MyContextError', () => {
    it('should create error with all properties', () => {
      const errorData = {
        type: ErrorType.API_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Test API error',
        code: 500,
        details: { test: 'data' },
        timestamp: '2024-01-01T00:00:00.000Z',
        source: 'api_call',
        retryable: true,
        retryAfter: 30,
        suggestions: ['Try again later']
      };

      const error = new MyContextError(errorData);

      expect(error.name).toBe('MyContextError');
      expect(error.type).toBe(ErrorType.API_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Test API error');
      expect(error.code).toBe(500);
      expect(error.details).toEqual({ test: 'data' });
      expect(error.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(error.source).toBe('api_call');
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(30);
      expect(error.suggestions).toEqual(['Try again later']);
    });

    it('should serialize to JSON correctly', () => {
      const errorData = {
        type: ErrorType.API_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Test error',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      const error = new MyContextError(errorData);
      const json = error.toJSON();

      expect(json).toEqual(errorData);
    });
  });

  describe('utility functions', () => {
    it('createAIProviderError should work', () => {
      const error = createAIProviderError(
        new Error('API error'),
        'xai',
        'generate'
      );

      expect(error).toBeInstanceOf(MyContextError);
      expect(error.type).toBe(ErrorType.AI_PROVIDER_ERROR);
    });

    it('createNetworkError should work', () => {
      const error = createNetworkError(
        new Error('Network error'),
        { operation: 'test' }
      );

      expect(error).toBeInstanceOf(MyContextError);
      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
    });

    it('createFileSystemError should work', () => {
      const error = createFileSystemError(
        new Error('File error'),
        '/path/to/file'
      );

      expect(error).toBeInstanceOf(MyContextError);
      expect(error.type).toBe(ErrorType.FILE_SYSTEM_ERROR);
    });

    it('createError should work', () => {
      const error = createError(
        new Error('Generic error'),
        { operation: 'test' },
        ErrorType.CONFIGURATION_ERROR
      );

      expect(error).toBeInstanceOf(MyContextError);
      expect(error.type).toBe(ErrorType.CONFIGURATION_ERROR);
    });
  });

  describe('console logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log critical errors to console.error', () => {
      const error = new MyContextError({
        type: ErrorType.API_ERROR,
        severity: ErrorSeverity.CRITICAL,
        message: 'Critical error',
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      errorHandler.createError(error);

      expect(consoleSpy).toHaveBeenCalledWith(
        '🔴 CRITICAL ERROR:',
        expect.objectContaining({ severity: 'CRITICAL' })
      );
    });
  });
});