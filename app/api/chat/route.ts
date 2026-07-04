/**
 * Chat API route handler
 * Handles AI chat requests with rate limiting, validation, and security checks
 */

import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { systemPrompt } from '@/lib/systemPrompt';
import { validateEnv } from '@/lib/env';
import { checkChatRateLimit } from '@/lib/rate-limit';
import { createErrorResponse } from '@/lib/api-utils';
import { validateConversation, prepareMessagesForAI } from '@/services/chatService';
import { IncomingMessage } from '@/lib/types';
import { safeLogError } from '@/lib/safe-logger';

export const maxDuration = 30;

/**
 * POST handler for chat requests
 * @param req - The incoming request
 * @returns Streamed chat response or error
 */
export async function POST(req: Request) {
  try {
    // Rate limiting check
    const rateLimit = await checkChatRateLimit(req);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        'Too many requests. Please wait a moment before trying again.',
        429,
        {
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      );
    }

    // Validate environment variables
    validateEnv();
    const body = await req.json();
    const { messages } = body;

    // Validate conversation structure
    const conversationValidation = validateConversation(messages);
    if (!conversationValidation.valid) {
      return createErrorResponse(conversationValidation.error!, 400);
    }

    // Prepare messages for AI (validates and converts format)
    const coreMessages = prepareMessagesForAI(messages as IncomingMessage[]);

    const result = streamText({
      model: google('models/gemini-2.5-flash'),
      system: systemPrompt,
      messages: coreMessages,
    });

    const response = result.toTextStreamResponse();
    
    // Add security headers to streaming response
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    return response;
  } catch (error: any) {
    safeLogError('Chat API error', error);

    // Determine safe client-facing message based on known validation errors
    const safeMessages = [
      'Message exceeds maximum length',
      'Your message contains patterns that may indicate a security risk',
      'Invalid input detected',
    ];
    
    const isKnownError = safeMessages.some((msg) => error.message?.includes(msg));
    
    if (isKnownError) {
      // Known validation errors - return as-is with 400 status
      return createErrorResponse(error.message, 400, { sanitize: false });
    } else {
      // Unknown errors - return generic message with 500 status and disable sanitization
      return createErrorResponse('An internal error occurred. Please try again.', 500, { sanitize: false });
    }
  }
}
