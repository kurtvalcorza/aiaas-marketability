/**
 * Chat Service
 * Handles message validation, prompt injection detection, and message preparation for AI
 */

import { validateMessageContent, detectPromptInjection } from '@/lib/validation';
import {
  MAX_MESSAGE_LENGTH,
  MAX_SYSTEM_MESSAGE_LENGTH,
  MAX_MESSAGES_COUNT,
  BLOCK_PROMPT_INJECTION,
} from '@/lib/constants';
import { CoreMessage, IncomingMessage } from '@/lib/types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Roles the chat endpoint will accept from a client. */
const ALLOWED_ROLES = new Set(['user', 'assistant', 'system']);

/**
 * Validates a single message for length and content
 * @param content - The message content to validate
 * @returns Validation result
 */
export function validateMessage(content: string): ValidationResult {
  // Check message length
  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }

  // Validate content (spam detection)
  try {
    validateMessageContent(content);
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Invalid input detected',
    };
  }
}

/**
 * Validates the conversation structure: count, message roles, and that at most
 * one system message is present (and, if so, that it is the first message).
 *
 * This enforces the legitimate shape — a single app-generated form-context
 * system message, then the alternating turns — so a direct API caller cannot
 * smuggle extra or mid-conversation `system` instructions to the model.
 * @param messages - Array of messages
 * @returns Validation result
 */
export function validateConversation(messages: any[]): ValidationResult {
  if (!messages || !Array.isArray(messages)) {
    return {
      valid: false,
      error: 'Invalid request: messages array is required',
    };
  }

  if (messages.length > MAX_MESSAGES_COUNT) {
    return {
      valid: false,
      error: 'Too many messages in conversation. Please start a new assessment.',
    };
  }

  let systemCount = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m !== 'object' || !ALLOWED_ROLES.has(m.role)) {
      return { valid: false, error: 'Invalid input detected: unrecognized message role.' };
    }
    if (m.role === 'system') {
      systemCount += 1;
      if (systemCount > 1) {
        return { valid: false, error: 'Invalid input detected: multiple system messages are not allowed.' };
      }
      if (i !== 0) {
        return { valid: false, error: 'Invalid input detected: the system message must be first.' };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates a system message: a larger length cap than a chat turn, plus the
 * same prompt-injection screen applied to user input. The legitimate system
 * message is built from fixed form options, so this never false-positives on it
 * — but it blocks a forged `system` message from skipping the injection filter.
 * @param content - The system message content to validate
 * @returns Validation result
 */
export function validateSystemMessage(content: string): ValidationResult {
  if (content.length > MAX_SYSTEM_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MAX_SYSTEM_MESSAGE_LENGTH} characters`,
    };
  }
  return detectPromptInjectionAttempt(content);
}

/**
 * Detects potential prompt injection attempts in user messages
 * @param content - The message content to check
 * @returns Validation result with detected patterns
 */
export function detectPromptInjectionAttempt(content: string): ValidationResult {
  const injectionPatterns = detectPromptInjection(content);

  if (injectionPatterns.length > 0) {
    console.warn('Potential prompt injection detected:', injectionPatterns);

    if (BLOCK_PROMPT_INJECTION) {
      return {
        valid: false,
        error:
          'Your message contains patterns that may indicate a security risk. ' +
          'Please rephrase your response and avoid using system commands or unusual formatting.',
      };
    }
  }

  return { valid: true };
}

/**
 * Prepares messages for AI by converting to CoreMessage format and validating
 * @param messages - Array of incoming messages
 * @returns Array of CoreMessage objects ready for AI
 * @throws Error if validation fails
 */
export function prepareMessagesForAI(messages: IncomingMessage[]): CoreMessage[] {
  return messages.map((m: IncomingMessage) => {
    let content = '';

    // Handle both parts format and content format
    if (m.parts) {
      content = m.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('');
    } else if (typeof m.content === 'string') {
      content = m.content;
    }

    // Validate the instruction-bearing roles. `user` gets the full length + spam
    // + injection screen; `system` gets a length cap + the same injection screen
    // (so it can't be used to bypass the filter). `assistant` messages are the
    // model's own prior turns and are left as-is to avoid false positives.
    if (m.role === 'user') {
      const messageValidation = validateMessage(content);
      if (!messageValidation.valid) {
        throw new Error(messageValidation.error);
      }

      const injectionValidation = detectPromptInjectionAttempt(content);
      if (!injectionValidation.valid) {
        throw new Error(injectionValidation.error);
      }
    } else if (m.role === 'system') {
      const systemValidation = validateSystemMessage(content);
      if (!systemValidation.valid) {
        throw new Error(systemValidation.error);
      }
    }

    return {
      role: m.role,
      content,
    };
  });
}
