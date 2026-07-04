/**
 * Route, overlay, and contact-consent helpers.
 *
 * A respondent's final route encodes both the primary vector (RR / DD) and the
 * AI-maturity overlay (basic / AD). AD is detected within RR or DD, not a
 * separate market.
 */

import { Overlay, Route, Segment } from './types';

export const ROUTES: readonly Route[] = ['RR-Basic', 'RR-AD', 'DD-Basic', 'DD-AD'];

/** Splits a route into its segment vector and maturity overlay. */
export function routeToSegmentOverlay(route: Route): { segment: Segment; overlay: Overlay } {
  const segment: Segment = route.startsWith('RR') ? 'RR' : 'DD';
  const overlay: Overlay = route.endsWith('AD') ? 'AD' : 'basic';
  return { segment, overlay };
}

/** Builds a route from a segment vector and maturity overlay. */
export function toRoute(segment: Segment, overlay: Overlay): Route {
  const suffix = overlay === 'AD' ? 'AD' : 'Basic';
  return `${segment}-${suffix}` as Route;
}

/** Normalizes a raw route string (any case) to a canonical Route, or null. */
export function normalizeRoute(raw: string): Route | null {
  const map: Record<string, Route> = {
    'RR-BASIC': 'RR-Basic',
    'RR-AD': 'RR-AD',
    'DD-BASIC': 'DD-Basic',
    'DD-AD': 'DD-AD',
  };
  return map[raw.trim().toUpperCase()] ?? null;
}

/**
 * Parses a yes/no contact-consent value. Defaults to false (no consent) when
 * missing or ambiguous — the privacy-safe default.
 */
export function normalizeContactConsent(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return /^(y|yes|true|agree|allowed?|consent)/.test(s);
}
