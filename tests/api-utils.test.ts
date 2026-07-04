import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSecurityHeaders,
  createJsonResponse,
  createErrorResponse,
} from '@/lib/api-utils';

describe('API Utilities', () => {
  describe('getSecurityHeaders', () => {
    it('should return security headers', () => {
      const headers = getSecurityHeaders();
      
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
    });
  });

  describe('createJsonResponse', () => {
    it('should create response with JSON data', async () => {
      const data = { message: 'success', value: 42 };
      const response = createJsonResponse(data);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const body = await response.json();
      expect(body).toEqual(data);
    });

    it('should apply security headers', () => {
      const response = createJsonResponse({ test: true });
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should accept custom status code', () => {
      const response = createJsonResponse({ created: true }, { status: 201 });
      
      expect(response.status).toBe(201);
    });

    it('should merge custom headers', () => {
      const response = createJsonResponse(
        { data: 'test' },
        { headers: { 'X-Custom-Header': 'custom-value' } }
      );
      
      expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('createErrorResponse', () => {
    let consoleErrorSpy: any;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should create error response from string', async () => {
      const response = createErrorResponse('Something went wrong', 400);
      
      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body).toHaveProperty('error', 'Something went wrong');
    });

    it('should create error response from Error object', async () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error, 400);
      
      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body).toHaveProperty('error', 'Test error');
    });

    it('should sanitize 500 errors', async () => {
      const error = new Error('Internal database connection failed');
      const response = createErrorResponse(error, 500);
      
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
      expect(body.error).not.toContain('database');
    });

    it('should not sanitize 4xx errors', async () => {
      const response = createErrorResponse('Invalid input provided', 400);
      
      const body = await response.json();
      expect(body.error).toBe('Invalid input provided');
    });

    it('should apply security headers', () => {
      const response = createErrorResponse('Error', 400);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should include error code when provided', async () => {
      const response = createErrorResponse('Validation failed', 400, {
        code: 'VALIDATION_ERROR',
      });
      
      const body = await response.json();
      expect(body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should log errors by default', () => {
      const error = new Error('Test error');
      createErrorResponse(error, 500);
      
      expect(console.error).toHaveBeenCalledWith('API error:', error);
    });

    it('should not log when logError is false', () => {
      const error = new Error('Test error');
      createErrorResponse(error, 500, { logError: false });
      
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should merge custom headers', () => {
      const response = createErrorResponse('Error', 400, {
        headers: { 'X-Custom-Header': 'value' }
      });
      
      expect(response.headers.get('X-Custom-Header')).toBe('value');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });
});
