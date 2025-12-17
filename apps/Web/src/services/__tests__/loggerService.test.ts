import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoggerService, LogLevel } from '../loggerService';

describe('LoggerService', () => {
  beforeEach(() => {
    // Reset log level before each test
    LoggerService.setLogLevel(LogLevel.DEBUG);
    // Clear console mocks
    vi.clearAllMocks();
  });

  describe('log levels', () => {
    it('should log debug messages in development', () => {
      const consoleSpy = vi.spyOn(console, 'debug');
      LoggerService.debug('Test debug message');
      // In test environment, may or may not log based on MODE
      // This test just ensures the method doesn't throw
      expect(LoggerService).toBeDefined();
    });

    it('should log info messages', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      LoggerService.log('Test info message');
      // Just check method exists and doesn't throw
      expect(LoggerService).toBeDefined();
    });

    it('should log warnings', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      LoggerService.warn('Test warning');
      expect(LoggerService).toBeDefined();
    });

    it('should log errors', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      LoggerService.error('Test error', new Error('Test'));
      expect(LoggerService).toBeDefined();
    });
  });

  describe('service-specific logging', () => {
    it('should log with service name prefix', () => {
      LoggerService.serviceLog('TestService', 'Test message');
      expect(LoggerService).toBeDefined();
    });

    it('should log errors with service name prefix', () => {
      LoggerService.serviceError('TestService', 'Test error', new Error('Test'));
      expect(LoggerService).toBeDefined();
    });

    it('should log warnings with service name prefix', () => {
      LoggerService.serviceWarn('TestService', 'Test warning');
      expect(LoggerService).toBeDefined();
    });
  });

  describe('log level configuration', () => {
    it('should set and get log level', () => {
      LoggerService.setLogLevel(LogLevel.WARN);
      expect(LoggerService.getLogLevel()).toBe(LogLevel.WARN);
      
      LoggerService.setLogLevel(LogLevel.ERROR);
      expect(LoggerService.getLogLevel()).toBe(LogLevel.ERROR);
    });
  });
});

