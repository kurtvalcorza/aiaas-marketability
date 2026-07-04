'use client';

import { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { hasConsentChoice } from '@/lib/consent';

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Consent banner component for privacy policy acceptance
 * Displays on first visit and stores user preference in localStorage
 */
export function ConsentBanner({ onAccept, onDecline }: ConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice (using consent utility)
    if (!hasConsentChoice()) {
      // Show banner after a short delay for better UX
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    setIsClosing(true);
    setTimeout(() => {
      onAccept();
      setIsVisible(false);
    }, 300);
  };

  const handleDecline = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDecline();
      setIsVisible(false);
    }, 300);
  };

  const handleClose = () => {
    // Closing without choosing counts as decline
    handleDecline();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Banner */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
          isClosing ? 'translate-y-full' : 'translate-y-0'
        }`}
        role="dialog"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
      >
        <div className="bg-white border-t-2 border-blue-500 shadow-2xl">
          <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-3">
                <h2
                  id="consent-title"
                  className="text-lg md:text-xl font-semibold text-gray-900"
                >
                  Your Privacy Matters
                </h2>
                <p
                  id="consent-description"
                  className="text-sm md:text-base text-gray-600 leading-relaxed"
                >
                  We collect your responses as market-research evidence for the AIaaS demand
                  study. Your answers are sanitized to remove personal information before storage,
                  and contact details are kept only if you choose to share them.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={handleDecline}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Accept & Continue
                </button>
              </div>
            </div>

            {/* Additional info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                By accepting, you agree to our data-collection practices. You can change your
                preference at any time. If you decline, your responses won't be saved to our
                database, but you can still download your summary.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
