/**
 * CSP Violation Reporting Endpoint
 * Logs Content Security Policy violations for monitoring and debugging
 * 
 * Rate limited to prevent abuse (100 reports per minute per IP)
 */

import { NextRequest } from 'next/server';

/** Simple in-memory rate limiter for CSP reports (Edge-compatible) */
const reportCounts = new Map<string, { count: number; resetTime: number }>();
const CSP_RATE_LIMIT = 100; // max reports per window
const CSP_RATE_WINDOW = 60000; // 1 minute

function checkCspRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = reportCounts.get(ip);

  if (!record || now > record.resetTime) {
    reportCounts.set(ip, { count: 1, resetTime: now + CSP_RATE_WINDOW });
    return true;
  }

  if (record.count >= CSP_RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

interface CSPReport {
  'csp-report': {
    'document-uri': string;
    'violated-directive': string;
    'blocked-uri': string;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
    'status-code'?: number;
  };
}

/**
 * POST handler for CSP violation reports
 * @param req - The incoming request with CSP violation data
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit CSP reports to prevent flooding
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    if (!checkCspRateLimit(ip)) {
      return new Response(null, { status: 429 });
    }

    const report: CSPReport = await req.json();
    const violation = report['csp-report'];

    // Log violation details
    console.error('🚨 CSP Violation Detected:', {
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number'],
      columnNumber: violation['column-number'],
      timestamp: new Date().toISOString(),
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return new Response(null, { status: 400 });
  }
}
