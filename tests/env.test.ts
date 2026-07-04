/**
 * Tests for environment validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnv, getEnv } from '@/lib/env';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('should validate successfully with all required variables', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
      process.env.NODE_ENV = 'test';

      const result = validateEnv();

      expect(result).toEqual({
        GOOGLE_GENERATIVE_AI_API_KEY: 'test-api-key',
        GOOGLE_SHEETS_WEBHOOK_URL: undefined,
        WEBHOOK_SIGNING_SECRET: undefined,
        NODE_ENV: 'test',
      });
    });

    it('should validate successfully with optional variables', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
      process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://example.com/webhook';
      process.env.WEBHOOK_SIGNING_SECRET = 'test-secret';
      process.env.NODE_ENV = 'production';

      const result = validateEnv();

      expect(result).toEqual({
        GOOGLE_GENERATIVE_AI_API_KEY: 'test-api-key',
        GOOGLE_SHEETS_WEBHOOK_URL: 'https://example.com/webhook',
        WEBHOOK_SIGNING_SECRET: 'test-secret',
        NODE_ENV: 'production',
      });
    });

    it('should throw error for missing API key', () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      expect(() => validateEnv()).toThrow('Environment validation failed');
      expect(() => validateEnv()).toThrow('GOOGLE_GENERATIVE_AI_API_KEY');
    });

    it('should throw error for empty API key', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = '';

      expect(() => validateEnv()).toThrow('Environment validation failed');
    });

    it('should throw error for invalid webhook URL format', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
      process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'not-a-valid-url';

      expect(() => validateEnv()).toThrow('Environment validation failed');
      expect(() => validateEnv()).toThrow('GOOGLE_SHEETS_WEBHOOK_URL');
    });

    it('should default NODE_ENV to development', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
      delete process.env.NODE_ENV;

      const result = validateEnv();

      expect(result.NODE_ENV).toBe('development');
    });

    it('should warn when webhook URL is not configured', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
      delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;

      validateEnv();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('GOOGLE_SHEETS_WEBHOOK_URL not set')
      );
      warnSpy.mockRestore();
    });

    it('should warn when signing secret is missing but webhook is configured', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
      process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://example.com/webhook';
      delete process.env.WEBHOOK_SIGNING_SECRET;

      validateEnv();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WEBHOOK_SIGNING_SECRET not set')
      );
      warnSpy.mockRestore();
    });
  });

  describe('getEnv', () => {
    it('should return current environment variables', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
      process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://example.com/webhook';
      process.env.NODE_ENV = 'test';

      const result = getEnv();

      expect(result).toEqual({
        GOOGLE_GENERATIVE_AI_API_KEY: 'test-api-key',
        GOOGLE_SHEETS_WEBHOOK_URL: 'https://example.com/webhook',
        WEBHOOK_SIGNING_SECRET: undefined,
        NODE_ENV: 'test',
      });
    });

    it('should default NODE_ENV to development when not set', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-api-key';
      delete process.env.NODE_ENV;

      const result = getEnv();

      expect(result.NODE_ENV).toBe('development');
    });
  });
});
