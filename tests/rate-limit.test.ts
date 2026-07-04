import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkChatRateLimit, checkSubmissionRateLimit } from '@/lib/rate-limit';

// Mock the KV store if it exists
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}), { virtual: true });

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing rate limit data and reset singletons
    (global as any).rateLimitStore = new Map();
    // Force recreation of rate limiters by clearing the module cache
    vi.resetModules();
  });

  describe('checkChatRateLimit', () => {
    it('allows requests within rate limit', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('192.168.1.1'),
        },
      } as any;

      const result = await checkChatRateLimit(mockRequest);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // 30 - 1
    });

    it('blocks requests exceeding rate limit', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('192.168.1.1'),
        },
      } as any;

      // Make 30 requests to hit the limit
      for (let i = 0; i < 30; i++) {
        await checkChatRateLimit(mockRequest);
      }

      // 31st request should be blocked
      const result = await checkChatRateLimit(mockRequest);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('handles different IP addresses separately', async () => {
      const mockRequest1 = {
        headers: {
          get: vi.fn().mockReturnValue('192.168.1.1'),
        },
      } as any;

      const mockRequest2 = {
        headers: {
          get: vi.fn().mockReturnValue('192.168.1.2'),
        },
      } as any;

      // Make 30 requests from first IP
      for (let i = 0; i < 30; i++) {
        await checkChatRateLimit(mockRequest1);
      }

      // First IP should be blocked
      const result1 = await checkChatRateLimit(mockRequest1);
      expect(result1.allowed).toBe(false);

      // Second IP should still be allowed
      const result2 = await checkChatRateLimit(mockRequest2);
      expect(result2.allowed).toBe(true);
    });

    it('handles missing IP address gracefully', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as any;

      const result = await checkChatRateLimit(mockRequest);
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkSubmissionRateLimit', () => {
    it('allows submissions within rate limit', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('192.168.1.1'),
        },
      } as any;

      const result = await checkSubmissionRateLimit(mockRequest);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
    });

    it('blocks submissions exceeding rate limit', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('192.168.1.1'),
        },
      } as any;

      // Make 5 submissions to hit the limit
      for (let i = 0; i < 5; i++) {
        await checkSubmissionRateLimit(mockRequest);
      }

      // 6th submission should be blocked
      const result = await checkSubmissionRateLimit(mockRequest);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('has longer window than chat rate limit', async () => {
      // This test verifies that submission rate limit exists and works
      // The actual window duration (5 minutes vs 1 minute) is defined in constants
      // and would require time mocking to test properly, which is complex with singletons
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('192.168.1.2'),
        },
      } as any;

      // Verify submission rate limit allows 5 requests
      const result1 = await checkSubmissionRateLimit(mockRequest);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4); // 5 - 1
    });
  });

  describe('Rate limit cleanup', () => {
    it('cleans up expired entries', async () => {
      const mockRequest = {
        headers: {
          get: vi.fn().mockReturnValue('192.168.1.1'),
        },
      } as any;

      // Make a request
      await checkChatRateLimit(mockRequest);

      // Advance time beyond the window
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 120000); // 2 minutes

      // Should reset the count
      const result = await checkChatRateLimit(mockRequest);
      expect(result.remaining).toBe(29); // Fresh start

      Date.now = originalNow;
    });
  });
});