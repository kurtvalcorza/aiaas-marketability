/**
 * Production-ready rate limiting with Vercel KV support and in-memory fallback
 */

import {
  RATE_LIMIT_WINDOW,
  MAX_REQUESTS_PER_WINDOW,
  SUBMISSION_RATE_LIMIT_WINDOW,
  MAX_SUBMISSIONS_PER_WINDOW,
} from './constants';
import { RateLimitRecord, RateLimitResult } from './types';

/**
 * In-memory storage for rate limiting (fallback for development)
 */
class InMemoryRateLimiter {
  private storage = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private windowMs: number) {
    // Only set up cleanup in Node.js environment (not Edge runtime)
    if (typeof setInterval !== 'undefined') {
      this.setupCleanup();
    }
  }

  private setupCleanup(): void {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.storage.entries()) {
        if (now > value.resetTime) {
          this.storage.delete(key);
        }
      }
    }, 300000);

    // Ensure cleanup doesn't prevent process exit (Node.js only)
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }

  /**
   * Check and update rate limit
   */
  async check(key: string, maxRequests: number): Promise<RateLimitResult> {
    const now = Date.now();
    const record = this.storage.get(key);

    if (!record || now > record.resetTime) {
      this.storage.set(key, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count };
  }
}

/**
 * Vercel KV rate limiter (Redis-based, for production)
 * Only initialized when KV credentials are available
 */
class VercelKVRateLimiter {
  private kv: any = null;
  private kvInitialized = false;

  constructor(private windowMs: number, kvInstance: any) {
    this.kv = kvInstance;
    this.kvInitialized = true;
  }

  async check(key: string, maxRequests: number): Promise<RateLimitResult> {
    if (!this.kvInitialized || !this.kv) {
      throw new Error('KV not initialized');
    }

    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / this.windowMs)}`;
    const expirySeconds = Math.ceil(this.windowMs / 1000);

    try {
      // Use pipeline to make operations atomic and reduce round trips
      const pipeline = this.kv.pipeline();

      // Increment counter
      pipeline.incr(windowKey);

      // Set expiry (will override existing TTL, which is fine for rate limiting)
      pipeline.expire(windowKey, expirySeconds);

      // Execute both commands atomically
      const results = await pipeline.exec();

      // First result is the incremented count
      const count = results[0] as number;

      const allowed = count <= maxRequests;
      const remaining = Math.max(0, maxRequests - count);

      return { allowed, remaining };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiter fails
      return { allowed: true, remaining: maxRequests };
    }
  }

  cleanup(): void {
    // No cleanup needed for KV
  }
}

/**
 * Attempts to load Vercel KV if available
 * Returns null if not available (package not installed or env vars not set)
 */
async function tryLoadVercelKV(): Promise<any | null> {
  // Check if Vercel KV is configured
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }

  try {
    // Dynamically import Vercel KV only if available
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (error) {
    // Package not installed or import failed
    console.warn('Vercel KV package not available, using in-memory rate limiting');
    return null;
  }
}

/**
 * Factory for creating appropriate rate limiter based on environment
 * Attempts to use Vercel KV, falls back to in-memory
 */
async function createRateLimiter(
  windowMs: number
): Promise<InMemoryRateLimiter | VercelKVRateLimiter> {
  // Try to load Vercel KV
  const kvInstance = await tryLoadVercelKV();

  if (kvInstance) {
    console.log('Using Vercel KV for distributed rate limiting');
    return new VercelKVRateLimiter(windowMs, kvInstance);
  }

  // Fallback to in-memory
  console.warn('Using in-memory rate limiting. For production, configure Vercel KV.');
  return new InMemoryRateLimiter(windowMs);
}

// Singleton instances
let chatRateLimiter: InMemoryRateLimiter | VercelKVRateLimiter | null = null;
let submissionRateLimiter: InMemoryRateLimiter | VercelKVRateLimiter | null = null;

/**
 * Gets or creates the chat rate limiter instance
 */
async function getChatRateLimiter(): Promise<InMemoryRateLimiter | VercelKVRateLimiter> {
  if (!chatRateLimiter) {
    chatRateLimiter = await createRateLimiter(RATE_LIMIT_WINDOW);
  }
  return chatRateLimiter;
}

/**
 * Gets or creates the submission rate limiter instance
 */
async function getSubmissionRateLimiter(): Promise<
  InMemoryRateLimiter | VercelKVRateLimiter
> {
  if (!submissionRateLimiter) {
    submissionRateLimiter = await createRateLimiter(SUBMISSION_RATE_LIMIT_WINDOW);
  }
  return submissionRateLimiter;
}

/**
 * Extracts rate limit key (IP address) from request
 * @param req - The incoming request
 * @returns IP address or 'unknown'
 */
export function getRateLimitKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

/**
 * Checks rate limit for chat API requests
 * @param req - The incoming request
 * @returns Rate limit result
 */
export async function checkChatRateLimit(req: Request): Promise<RateLimitResult> {
  const key = getRateLimitKey(req);
  const limiter = await getChatRateLimiter();
  return limiter.check(key, MAX_REQUESTS_PER_WINDOW);
}

/**
 * Checks rate limit for submission API requests
 * @param req - The incoming request
 * @returns Rate limit result
 */
export async function checkSubmissionRateLimit(req: Request): Promise<RateLimitResult> {
  const key = getRateLimitKey(req);
  const limiter = await getSubmissionRateLimiter();
  return limiter.check(key, MAX_SUBMISSIONS_PER_WINDOW);
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupRateLimiters(): void {
  if (chatRateLimiter) {
    chatRateLimiter.cleanup();
    chatRateLimiter = null;
  }
  if (submissionRateLimiter) {
    submissionRateLimiter.cleanup();
    submissionRateLimiter = null;
  }
}
