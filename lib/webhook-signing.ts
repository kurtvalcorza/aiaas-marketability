/**
 * HMAC-SHA256 webhook signing utility
 * Signs outbound webhook requests so the receiving Google Apps Script
 * can verify the request originated from this application.
 *
 * The signature is computed over `${timestamp}.${payload}` where payload
 * is the exact JSON string of the original data. This string is also sent
 * as `_webhookPayload` so the receiver can verify against the exact same bytes
 * without needing to reconstruct the JSON (avoiding serialization mismatches).
 */

import { createHmac } from 'crypto';

export const MAX_TIMESTAMP_DRIFT_MS = 300000; // 5 minutes

/**
 * Signs a webhook payload and returns a JSON string containing:
 * - _webhookPayload: the original JSON string (used for verification)
 * - _webhookSignature: HMAC-SHA256 hex digest
 * - _webhookTimestamp: millisecond timestamp
 *
 * The receiver parses _webhookPayload to get the actual data fields.
 */
export function signWebhookPayload(
  data: object,
  secret: string
): string {
  const payload = JSON.stringify(data);
  const timestamp = Date.now();
  const message = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret).update(message).digest('hex');

  return JSON.stringify({
    _webhookPayload: payload,
    _webhookSignature: signature,
    _webhookTimestamp: timestamp,
  });
}
