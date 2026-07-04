/**
 * Dashboard logout handler. Clears the session cookie and returns to login.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_COOKIE } from '@/lib/dashboard-auth';

export async function POST(request: NextRequest): Promise<Response> {
  const response = NextResponse.redirect(new URL('/dashboard/login', request.url), 303);
  response.cookies.set(DASHBOARD_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
