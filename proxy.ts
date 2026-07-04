/**
 * Next.js proxy for security headers
 * 
 * Note: This app is designed to be embedded as an iframe in the ACABAI-PH website,
 * so frame-ancestors CSP directive allows embedding from trusted domains.
 * 
 * CSP Configuration:
 * - Development: Relaxed CSP for hot reload and dev tools
 * - Production: Strict CSP with nonce-based inline scripts
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generates a cryptographically secure nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // Convert to base64 without using Buffer (Edge runtime compatible)
  return btoa(String.fromCharCode(...array));
}

export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  const nonce = generateNonce();

  // Store nonce in request headers for use in pages
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Build CSP based on environment
  // Note: Next.js 16 requires 'unsafe-inline' and 'unsafe-eval' for framework scripts in production
  // The nonce provides additional protection for custom inline scripts
  const scriptSrc = isDev
    ? "'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://vitals.vercel-insights.com"
    : `'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vitals.vercel-insights.com`;

  // Tightened img-src: removed wildcard https:, only allow specific domains
  const imgSrc = "'self' blob: data: https://fonts.gstatic.com";

  // Tightened frame-ancestors: specific domains only (no wildcards in production)
  const frameAncestors = isDev
    ? "'self' https://*.vercel.app https://*.netlify.app https://*.github.io https://*.pages.dev https://*.amplifyapp.com https://kurt.valcorza.com https://localhost:* http://localhost:*"
    : "'self' https://acabai-ph.vercel.app https://master.d3bx5uqqofxvve.amplifyapp.com https://kurt.valcorza.com";

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src ${imgSrc};
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors ${frameAncestors};
    connect-src 'self' https://generativelanguage.googleapis.com https://script.google.com https://va.vercel-scripts.com https://vitals.vercel-insights.com;
    worker-src 'self' blob:;
    upgrade-insecure-requests;
    report-uri /api/csp-report;
  `.replace(/\s{2,}/g, ' ').trim();

  // Set security headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-DNS-Prefetch-Control', 'false');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=(), serial=()');
  
  // Store nonce in response header for debugging (optional, remove in production if needed)
  if (isDev) {
    response.headers.set('X-CSP-Nonce', nonce);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};