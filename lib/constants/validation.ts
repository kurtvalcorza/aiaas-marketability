/**
 * Validation-related constants
 * Message validation, PII patterns, and content limits
 */

/**
 * Validation configuration namespace
 */
export const VALIDATION = {
  /**
   * Message validation limits
   */
  MESSAGE: {
    MAX_LENGTH: 2000, // Maximum characters per user message
    // The app-generated form-context system message can be larger than a chat
    // turn (it lists every selected tag), so it gets its own, higher cap.
    MAX_SYSTEM_LENGTH: 6000, // Maximum characters for a system message
    MIN_UNIQUE_CHARS: 5, // Minimum unique characters for spam detection
    MIN_LENGTH_FOR_SPAM_CHECK: 100, // Minimum message length to trigger spam check
  },

  /**
   * Conversation limits
   */
  CONVERSATION: {
    MAX_MESSAGES: 80, // Max messages in conversation (longer 15+3 question flow)
    MAX_HISTORY_SIZE: 50000, // Maximum size for conversation history in bytes
  },

  /**
   * Interview submission payload limits.
   * Server-side bounds so a direct API call cannot store unbounded data.
   */
  INTERVIEW: {
    MAX_ORGANIZATION_TYPE_LENGTH: 300,
    MAX_RESPONDENT_ROLE_LENGTH: 200,
    MAX_CURRENT_WORK_LENGTH: 500,
    MAX_AI_MATURITY_LENGTH: 500,
    MAX_USE_CASE_LENGTH: 1000,
    MAX_COMPETITORS_LENGTH: 1000,
    MAX_TAGS: 20,
    MAX_TAG_LENGTH: 100,
    MAX_LIKELIHOOD_LENGTH: 100,
    MAX_PATHWAY_LENGTH: 500,
    MAX_TIMEFRAME_LENGTH: 100,
    MAX_BLOCKERS_LENGTH: 1000,
    MAX_SUMMARY_LENGTH: 2000,
    MAX_INTERPRETATION_LENGTH: 100,
    MAX_CONTACT_NAME_LENGTH: 200,
    MAX_CONTACT_EMAIL_LENGTH: 320,
    SCORE_MIN: 0, // 0.0-5.0 self-report scale (0 = "not a barrier" / "not useful")
    SCORE_MAX: 5,
    DVI_MIN: 0,
    DVI_MAX: 5,
    MAX_HISTORY_PAYLOAD_SIZE: 100000, // Hard request cap; stored history is further truncated to CONVERSATION.MAX_HISTORY_SIZE
  },

  /**
   * PII detection patterns
   * Used for sanitizing sensitive information
   */
  PII_PATTERNS: {
    /** Matches email addresses (e.g. user@example.com, name+tag@domain.co.uk) */
    EMAIL: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
    /** Matches phone numbers in various formats */
    PHONE: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    /** Matches Social Security Numbers (e.g. 123-45-6789) */
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  } as const,

  /**
   * PII redaction placeholders
   */
  REDACTION: {
    EMAIL: '[EMAIL_REDACTED]',
    PHONE: '[PHONE_REDACTED]',
    SSN: '[SSN_REDACTED]',
    TRUNCATED: '...[truncated]',
  } as const,
} as const;

// Legacy exports for backward compatibility
export const MAX_INPUT_LENGTH = VALIDATION.MESSAGE.MAX_LENGTH;
export const MAX_MESSAGE_LENGTH = VALIDATION.MESSAGE.MAX_LENGTH;
export const MAX_SYSTEM_MESSAGE_LENGTH = VALIDATION.MESSAGE.MAX_SYSTEM_LENGTH;
export const MIN_UNIQUE_CHARS = VALIDATION.MESSAGE.MIN_UNIQUE_CHARS;
export const MIN_LENGTH_FOR_SPAM_CHECK = VALIDATION.MESSAGE.MIN_LENGTH_FOR_SPAM_CHECK;
export const MAX_MESSAGES_COUNT = VALIDATION.CONVERSATION.MAX_MESSAGES;
export const MAX_CONVERSATION_HISTORY_SIZE = VALIDATION.CONVERSATION.MAX_HISTORY_SIZE;
export const MAX_ORGANIZATION_TYPE_LENGTH = VALIDATION.INTERVIEW.MAX_ORGANIZATION_TYPE_LENGTH;
export const MAX_HISTORY_PAYLOAD_SIZE = VALIDATION.INTERVIEW.MAX_HISTORY_PAYLOAD_SIZE;
export const PII_PATTERNS = VALIDATION.PII_PATTERNS;
export const REDACTION_PLACEHOLDERS = VALIDATION.REDACTION;
