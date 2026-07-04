/**
 * Validation utilities for input sanitization and security
 */

import {
  MIN_UNIQUE_CHARS,
  MIN_LENGTH_FOR_SPAM_CHECK,
  PII_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
  REDACTION_PLACEHOLDERS,
  MAX_CONVERSATION_HISTORY_SIZE,
} from './constants';
import { UIMessage } from './types';
import { interviewDataSchema } from './schemas';

/**
 * Validates message content for potential spam or malicious input
 * @param content - The message content to validate
 * @throws {Error} If content is invalid
 */
export function validateMessageContent(content: string): void {
  // Check for extremely repetitive content (potential spam attack)
  const uniqueChars = new Set(content.toLowerCase().replace(/\s/g, '')).size;
  if (uniqueChars < MIN_UNIQUE_CHARS && content.length > MIN_LENGTH_FOR_SPAM_CHECK) {
    throw new Error('Invalid input detected. Please provide a meaningful response.');
  }
}

/**
 * Detects potential prompt injection attempts in user input
 * @param content - The content to check
 * @returns Array of detected patterns (empty if none found)
 */
export function detectPromptInjection(content: string): string[] {
  const detected: string[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      detected.push(pattern.source);
    }
  }

  return detected;
}

/**
 * Sanitizes text by removing or redacting PII (Personally Identifiable Information)
 * @param text - The text to sanitize
 * @returns Sanitized text with PII redacted
 */
export function sanitizePII(text: string): string {
  let sanitized = text;

  // Redact emails
  sanitized = sanitized.replace(PII_PATTERNS.EMAIL, REDACTION_PLACEHOLDERS.EMAIL);

  // Redact phone numbers
  sanitized = sanitized.replace(PII_PATTERNS.PHONE, REDACTION_PLACEHOLDERS.PHONE);

  // Redact SSN
  sanitized = sanitized.replace(PII_PATTERNS.SSN, REDACTION_PLACEHOLDERS.SSN);

  return sanitized;
}

/**
 * Truncates text to a maximum length
 * @param text - The text to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated text with marker if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + REDACTION_PLACEHOLDERS.TRUNCATED;
}

/**
 * Sanitizes conversation history to prevent storing sensitive data
 * @param messages - Array of UI messages
 * @returns JSON string of sanitized conversation history
 */
export function sanitizeConversationHistory(messages: UIMessage[]): string {
  try {
    // Create a simplified version of conversation history
    const simplified = messages.map((msg) => ({
      role: msg.role,
      content: msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => {
          let text = p.text;
          // Remove PII
          text = sanitizePII(text);
          // Truncate very long messages
          return truncateText(text, 500);
        })
        .join(''),
    }));

    const historyJson = JSON.stringify(simplified);

    // If conversation history is too large, truncate it
    if (historyJson.length > MAX_CONVERSATION_HISTORY_SIZE) {
      console.warn('Conversation history too large, truncating...');
      return truncateText(historyJson, MAX_CONVERSATION_HISTORY_SIZE);
    }

    return historyJson;
  } catch (error) {
    console.error('Error sanitizing conversation history:', error);
    return JSON.stringify([{ role: 'system', content: 'Error sanitizing history' }]);
  }
}

/**
 * Validates interview data structure using Zod schema
 * @param data - Interview data to validate
 * @throws {Error} If data structure is invalid with detailed error messages
 */
export function validateInterviewData(data: any): void {
  try {
    interviewDataSchema.parse(data);
  } catch (error: any) {
    if (error.errors && Array.isArray(error.errors)) {
      // Format Zod validation errors into a readable message
      const errorMessages = error.errors.map((err: any) => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      }).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    throw new Error('Invalid interview data structure');
  }
}
