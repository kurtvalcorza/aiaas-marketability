/**
 * Submit API route handler
 * Handles interview submission to the configured storage backend
 * (Neon PostgreSQL or Google Sheets) with rate limiting and validation
 */

import { checkSubmissionRateLimit } from '@/lib/rate-limit';
import { validateInterviewData } from '@/lib/validation';
import { createJsonResponse, createErrorResponse } from '@/lib/api-utils';
import { submitToGoogleSheets } from '@/services/submissionService';
import { submitToNeon } from '@/services/neonSubmissionService';
import { resolveStorageProvider } from '@/lib/storage-provider';
import { InterviewData } from '@/lib/types';
import { safeLogSubmissionResult, safeLogError } from '@/lib/safe-logger';

export const maxDuration = 30;

/**
 * POST handler for interview submissions
 * @param req - The incoming request
 * @returns Success or error response
 */
export async function POST(req: Request): Promise<Response> {
  try {
    // Rate limiting check
    const rateLimit = await checkSubmissionRateLimit(req);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        'Too many submissions. Please wait a few minutes before submitting again.',
        429,
        { headers: { 'Retry-After': '300' } }
      );
    }

    const data: InterviewData = await req.json();

    console.log('[submit] Received data keys:', Object.keys(data));
    console.log('[submit] Route:', data.route);
    console.log('[submit] DVI:', data.dvi);

    // Validate data structure
    try {
      validateInterviewData(data);
      console.log('[submit] Validation passed');
    } catch (validationError: any) {
      console.error('[submit] Validation failed:', validationError.message);
      throw validationError;
    }

    // Field-length bounds are enforced by validateInterviewData (Zod) above.

    // Submit to the configured storage provider (resolved per request so
    // env changes and per-test overrides take effect without a module reload)
    const provider = resolveStorageProvider();
    console.log(`[submit] Submitting via storage provider: ${provider}`);
    let result;
    if (provider === 'google_sheets') {
      console.log('[submit] Webhook URL configured:', !!process.env.GOOGLE_SHEETS_WEBHOOK_URL);
      result = await submitToGoogleSheets(data, {
        webhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
        signingSecret: process.env.WEBHOOK_SIGNING_SECRET,
      });
    } else {
      console.log('[submit] DATABASE_URL configured:', !!process.env.DATABASE_URL);
      result = await submitToNeon(data);
    }
    console.log('[submit] Submission result:', safeLogSubmissionResult(result));

    if (!result.success) {
      // Check if it's a Google Sheets script error (should be surfaced to client)
      if (result.error?.includes('Google Sheets script error')) {
        return createErrorResponse(result.error, 400);
      }
      // All other errors are internal (network, etc.) - use custom message without sanitization
      return createErrorResponse('Submission failed. Please try again.', 500, { sanitize: false });
    }

    return createJsonResponse({ success: true, message: result.message }, { status: 200 });
  } catch (error: any) {
    safeLogError('[submit] Unhandled error', error);

    // Only surface known validation errors to the client
    const safeMessages = [
      'Google Sheets script error',
      'Validation failed:', // Zod validation errors
      'Invalid interview data structure', // Zod validation fallback
    ];
    const clientMessage = safeMessages.find((msg) => error.message?.includes(msg))
      ? error.message
      : 'Submission failed. Please try again.';

    const status = safeMessages.some((msg) => error.message?.includes(msg)) ? 400 : 500;
    return createErrorResponse(clientMessage, status);
  }
}
