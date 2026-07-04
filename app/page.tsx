'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatInput } from '@/components/ChatInput';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChatErrorBoundary } from '@/components/ChatErrorBoundary';
import { ConsentBanner } from '@/components/ConsentBanner';
import { ChatMessageList } from '@/components/ChatMessageList';
import { InterviewForm } from '@/components/InterviewForm';
import { useConsent } from '@/hooks/useConsent';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useInterviewFlow } from '@/hooks/useInterviewFlow';

/**
 * AIaaS Demand Viability Index instrument: a structured form, then a short
 * reconciling chat.
 */
export default function Chat() {
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [consentState, consentActions] = useConsent();
  const flow = useInterviewFlow();

  useChatScroll(messagesEndRef, flow.isSubmitting);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isLoading = flow.isSubmitting;
  const handleStartNew = () => window.location.reload();

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
        <ChatHeader />

        {flow.phase === 'form' ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <InterviewForm onSubmit={flow.startChat} />
          </div>
        ) : (
          <ChatErrorBoundary onReset={handleStartNew}>
            <ChatMessageList
              messages={flow.messages}
              isLoading={isLoading}
              error={flow.error}
              isComplete={flow.isComplete}
              report={flow.report}
              core={flow.core}
              submissionError={flow.submissionError}
              onRerate={flow.rerate}
              onStartNew={handleStartNew}
              onClearError={flow.clearError}
              messagesEndRef={messagesEndRef}
            />
          </ChatErrorBoundary>
        )}

        {flow.phase === 'chat' && (
          <footer className="bg-white border-t border-gray-200 p-4 z-10" role="contentinfo">
            {flow.isComplete ? (
              <div className="max-w-3xl mx-auto text-center p-4 bg-gray-100 rounded-xl">
                <p className="text-gray-600 font-medium">
                  The interview is complete. Please download your summary or start a new session above.
                </p>
              </div>
            ) : (
              <ErrorBoundary
                fallback={
                  <div className="max-w-3xl mx-auto text-center p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600">Chat input error. Please refresh the page to continue.</p>
                  </div>
                }
              >
                <ChatInput
                  onSubmit={(text) => flow.handleSendMessage(text)}
                  isLoading={isLoading}
                  disabled={flow.isComplete}
                />
              </ErrorBoundary>
            )}
          </footer>
        )}

        {consentState.showBanner && (
          <ConsentBanner onAccept={consentActions.accept} onDecline={consentActions.decline} />
        )}
      </div>
    </ErrorBoundary>
  );
}
