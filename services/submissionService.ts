/**
 * Submission Service
 * Handles interview data formatting and submission to Google Sheets
 */

import { signWebhookPayload } from '@/lib/webhook-signing';
import { InterviewData, InterviewRecord } from '@/lib/types';
import { buildSubmissionRecord } from './submissionRecord';
import { safeLogError } from '@/lib/safe-logger';

export interface SubmissionConfig {
  webhookUrl?: string;
  signingSecret?: string;
}

export interface SubmissionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Formats interview data for Google Sheets submission
 * @param data - The interview data to format
 * @returns Formatted record ready for Google Sheets
 */
export function formatForGoogleSheets(data: InterviewData): InterviewRecord {
  return buildSubmissionRecord(data);
}

/**
 * Signs the payload if a signing secret is provided
 * @param data - The data to sign
 * @param signingSecret - Optional signing secret
 * @returns JSON string (signed or unsigned)
 */
export function signPayload(data: InterviewRecord, signingSecret?: string): string {
  if (signingSecret) {
    return signWebhookPayload(data, signingSecret);
  }
  return JSON.stringify(data);
}

/**
 * Submits interview data to a Google Sheets webhook
 * @param data - The interview data to submit
 * @param config - Submission configuration
 * @returns Submission result
 */
export async function submitToGoogleSheets(
  data: InterviewData,
  config: SubmissionConfig
): Promise<SubmissionResult> {
  // Check if webhook is configured
  if (!config.webhookUrl) {
    console.warn('[submitToGoogleSheets] Google Sheets webhook URL not configured');
    return {
      success: true,
      message: 'Data received (webhook not configured)',
    };
  }

  try {
    // Format data for Google Sheets
    const formattedData = formatForGoogleSheets(data);
    console.log('[submitToGoogleSheets] Formatted data keys:', Object.keys(formattedData));

    // Sign payload if secret is provided
    const body = signPayload(formattedData, config.signingSecret);
    console.log('[submitToGoogleSheets] Payload size:', body.length, 'bytes');

    // Submit to webhook
    console.log('[submitToGoogleSheets] Fetching webhook URL...');
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    console.log('[submitToGoogleSheets] Response status:', response.status);
    console.log('[submitToGoogleSheets] Response redirected:', response.redirected);

    if (!response.ok) {
      const responseText = await response.text().catch(() => 'Could not read response body');
      console.error('[submitToGoogleSheets] Non-OK response body:', responseText.substring(0, 500));
      throw new Error(`Google Sheets submission failed: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('[submitToGoogleSheets] Response body:', responseText.substring(0, 500));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[submitToGoogleSheets] Failed to parse response as JSON:', responseText.substring(0, 200));
      throw new Error(`Google Sheets returned non-JSON response: ${responseText.substring(0, 100)}`);
    }

    if (!result.success) {
      throw new Error(`Google Sheets script error: ${result.error || 'Unknown error'}`);
    }

    return {
      success: true,
      message: 'Interview submitted successfully',
    };
  } catch (error: any) {
    safeLogError('[submitToGoogleSheets] Error', error);
    return {
      success: false,
      message: 'Submission failed. Please try again.',
      error: error.message,
    };
  }
}
