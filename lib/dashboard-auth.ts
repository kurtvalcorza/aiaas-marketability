/**
 * Researcher-dashboard session auth (shared-password gate).
 *
 * A single shared password (DASHBOARD_PASSWORD) guards the researcher
 * dashboard while the public survey stays open. On a successful login we issue
 * a signed, time-limited session token stored in an HttpOnly cookie.
 *
 * Everything here uses the Web Crypto API so it runs unchanged in both the Edge
 * middleware (proxy.ts) and Node route handlers. The password doubles as the
 * HMAC signing key, so rotating DASHBOARD_PASSWORD instantly invalidates every
 * outstanding session.
 */

export const DASHBOARD_COOKIE = 'dash_session';
export const DASHBOARD_SESSION_MAX_AGE_S = 60 * 60 * 12; // 12 hours

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return base64url(new Uint8Array(signature));
}

async function sha256(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(message));
  return base64url(new Uint8Array(digest));
}

/** Constant-time comparison of two equal-length strings. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Constant-time password check. Both sides are SHA-256 digested first so the
 * comparison length is fixed regardless of the submitted password length
 * (avoids leaking the password length through timing).
 */
export async function verifyPassword(submitted: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256(submitted), sha256(expected)]);
  return timingSafeEqual(a, b);
}

/** Creates a signed `<issuedAtMs>.<sig>` session token. */
export async function createSessionToken(
  secret: string,
  nowMs: number = Date.now(),
): Promise<string> {
  const issuedAt = Math.floor(nowMs).toString();
  const signature = await hmacSha256(secret, issuedAt);
  return `${issuedAt}.${signature}`;
}

/**
 * Verifies a session token: the signature must match and the token must be
 * within DASHBOARD_SESSION_MAX_AGE_S of now.
 */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string | undefined | null,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;

  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;

  const issuedAt = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) return false;

  const expected = await hmacSha256(secret, issuedAt);
  if (!timingSafeEqual(signature, expected)) return false;

  const age = nowMs - issuedAtMs;
  if (age < 0 || age > DASHBOARD_SESSION_MAX_AGE_S * 1000) return false;

  return true;
}
