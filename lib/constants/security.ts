/**
 * Security-related constants
 * Rate limiting and prompt injection detection
 */

/**
 * Security configuration namespace
 */
export const SECURITY = {
  /**
   * Chat API rate limiting
   * Limits: 30 requests per minute
   */
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 30, // 30 requests per minute
  },

  /**
   * Submission API rate limiting
   * Limits: 5 submissions per 5 minutes
   */
  SUBMISSION_RATE_LIMIT: {
    WINDOW_MS: 300000, // 5 minutes
    MAX_REQUESTS: 5, // 5 submissions per 5 minutes
  },

  /**
   * Dashboard login rate limiting (brute-force guard)
   * Limits: 10 attempts per 5 minutes
   */
  LOGIN_RATE_LIMIT: {
    WINDOW_MS: 300000, // 5 minutes
    MAX_REQUESTS: 10, // 10 login attempts per 5 minutes
  },

  /**
   * Prompt injection detection
   */
  PROMPT_INJECTION: {
    ENABLED: true, // Block requests with detected prompt injection attempts
    // NOTE: this is a best-effort denylist, not a complete defense. It is a speed
    // bump for the obvious attempts; the real protection is architectural (the model
    // cannot touch the DVI/scores, and no secrets are in its context). Patterns are
    // kept high-signal to avoid false positives on legitimate survey answers.
    PATTERNS: [
      /ignore\s+(the\s+)?(previous|all|prior|above|preceding)\s+(instructions?|prompts?|rules?|messages?)/i,
      /disregard\s+(the\s+)?(previous|all|prior|above|preceding)\s+(instructions?|prompts?|rules?|messages?)/i,
      /forget\s+(the\s+)?(previous|all|prior|above|preceding)\s+(instructions?|prompts?|rules?|messages?)/i,
      /system\s*:\s*you\s+are/i,
      /you\s+are\s+now\s+(a|an|the)\b/i, // role-override ("you are now a ...")
      /(reveal|print|show|repeat|expose)\s+(your\s+|the\s+)?(system\s+)?(prompt|instructions?)/i,
      /new\s+instructions?\s*:/i,
      /<\s*script\s*>/i,
      /\{\{.*?\}\}/i, // Template injection
      /\$\{.*?\}/i, // String interpolation
    ] as const,
  },
} as const;

// Legacy exports for backward compatibility
export const RATE_LIMIT_WINDOW = SECURITY.RATE_LIMIT.WINDOW_MS;
export const MAX_REQUESTS_PER_WINDOW = SECURITY.RATE_LIMIT.MAX_REQUESTS;
export const SUBMISSION_RATE_LIMIT_WINDOW = SECURITY.SUBMISSION_RATE_LIMIT.WINDOW_MS;
export const MAX_SUBMISSIONS_PER_WINDOW = SECURITY.SUBMISSION_RATE_LIMIT.MAX_REQUESTS;
export const LOGIN_RATE_LIMIT_WINDOW = SECURITY.LOGIN_RATE_LIMIT.WINDOW_MS;
export const MAX_LOGIN_ATTEMPTS_PER_WINDOW = SECURITY.LOGIN_RATE_LIMIT.MAX_REQUESTS;
export const BLOCK_PROMPT_INJECTION = SECURITY.PROMPT_INJECTION.ENABLED;
export const PROMPT_INJECTION_PATTERNS = SECURITY.PROMPT_INJECTION.PATTERNS;
