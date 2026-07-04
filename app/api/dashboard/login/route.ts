/**
 * Dashboard login handler.
 * Validates the shared DASHBOARD_PASSWORD, sets a signed session cookie, and
 * redirects to the dashboard. Rate-limited to blunt brute-force attempts.
 * This route is intentionally NOT gated by proxy.ts (the matcher excludes
 * /api), so it stays reachable while unauthenticated.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  DASHBOARD_COOKIE,
  DASHBOARD_SESSION_MAX_AGE_S,
  createSessionToken,
  verifyPassword,
} from '@/lib/dashboard-auth';
import { checkLoginRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest): Promise<Response> {
  const rateLimit = await checkLoginRateLimit(request);
  if (!rateLimit.allowed) {
    const url = new URL('/dashboard/login?error=1', request.url);
    return NextResponse.redirect(url, { status: 303, headers: { 'Retry-After': '300' } });
  }

  const secret = process.env.DASHBOARD_PASSWORD;

  let password = '';
  try {
    const form = await request.formData();
    password = String(form.get('password') ?? '');
  } catch {
    password = '';
  }

  const ok = secret ? await verifyPassword(password, secret) : false;
  if (!ok) {
    return NextResponse.redirect(new URL('/dashboard/login?error=1', request.url), 303);
  }

  const token = await createSessionToken(secret!);
  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
  response.cookies.set(DASHBOARD_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DASHBOARD_SESSION_MAX_AGE_S,
  });
  return response;
}
