/**
 * Consent management utilities
 * Handles user privacy consent preferences
 */

const CONSENT_KEY = 'ai-assessment-consent';
// Bumped to 1.1 when assessment storage moved from the Google Sheets webhook
// to Neon PostgreSQL, so returning users are re-prompted under the new terms.
const CONSENT_VERSION = '1.1';

export interface ConsentData {
  accepted: boolean;
  version: string;
  timestamp: string;
}

/**
 * Gets the current consent status from localStorage
 * @returns ConsentData if consent has been given, null otherwise
 */
export function getConsent(): ConsentData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;

    const data: ConsentData = JSON.parse(stored);

    // Check if consent version matches current version
    if (data.version !== CONSENT_VERSION) {
      // Version mismatch - clear old consent and ask again
      clearConsent();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading consent:', error);
    return null;
  }
}

/**
 * Stores user consent preference
 * @param accepted - Whether user accepted or declined
 */
export function setConsent(accepted: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    const data: ConsentData = {
      accepted,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error storing consent:', error);
  }
}

/**
 * Clears stored consent (for testing or version updates)
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch (error) {
    console.error('Error clearing consent:', error);
  }
}

/**
 * Checks if user has accepted data collection
 * @returns true if user has explicitly accepted
 */
export function hasAcceptedConsent(): boolean {
  const consent = getConsent();
  return consent?.accepted === true;
}

/**
 * Checks if user has made any consent choice
 * @returns true if user has either accepted or declined
 */
export function hasConsentChoice(): boolean {
  return getConsent() !== null;
}
