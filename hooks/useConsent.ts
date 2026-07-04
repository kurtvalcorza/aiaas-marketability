/**
 * Custom hook for managing user consent state
 * 
 * Handles consent banner visibility and user choice persistence via localStorage.
 * Returns current consent state and actions to accept or decline consent.
 * 
 * @returns Tuple of [ConsentState, ConsentActions]
 * 
 * @example
 * ```tsx
 * const [consentState, consentActions] = useConsent();
 * 
 * if (consentState.showBanner) {
 *   return <ConsentBanner onAccept={consentActions.accept} onDecline={consentActions.decline} />;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { setConsent, hasConsentChoice, hasAcceptedConsent } from '@/lib/consent';

export interface ConsentState {
  /** Whether the consent banner should be displayed */
  showBanner: boolean;
  /** User's consent choice: true (accepted), false (declined), null (no choice yet) */
  hasAccepted: boolean | null;
}

export interface ConsentActions {
  /** Accept consent and hide banner */
  accept: () => void;
  /** Decline consent and hide banner */
  decline: () => void;
}

export function useConsent(): [ConsentState, ConsentActions] {
  const [showBanner, setShowBanner] = useState(false);
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  // Check localStorage on mount
  useEffect(() => {
    if (!hasConsentChoice()) {
      setShowBanner(true);
      setHasAccepted(null);
    } else {
      setShowBanner(false);
      setHasAccepted(hasAcceptedConsent());
    }
  }, []);

  const accept = () => {
    setConsent(true);
    setShowBanner(false);
    setHasAccepted(true);
  };

  const decline = () => {
    setConsent(false);
    setShowBanner(false);
    setHasAccepted(false);
  };

  return [
    { showBanner, hasAccepted },
    { accept, decline },
  ];
}
