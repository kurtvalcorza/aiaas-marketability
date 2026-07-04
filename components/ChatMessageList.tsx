/**
 * Renders the chat-phase message list with loading, errors, the re-rate control,
 * and the completion summary.
 */

import { RefObject } from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { ErrorAlert } from '@/components/ErrorAlert';
import { AssessmentComplete } from '@/components/AssessmentComplete';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UIMessage } from '@/lib/types';
import { InterviewCore } from '@/lib/questions';
import { RerateComponent } from '@/lib/constants/parsing';

export interface ChatMessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  error?: Error;
  isComplete: boolean;
  report: string;
  core: InterviewCore | null;
  submissionError: string;
  onRerate: (component: RerateComponent, value: number) => void;
  onStartNew: () => void;
  onClearError: () => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function ChatMessageList({
  messages,
  isLoading,
  error,
  isComplete,
  report,
  core,
  submissionError,
  onRerate,
  onStartNew,
  onClearError,
  messagesEndRef,
}: ChatMessageListProps) {
  return (
    <main
      className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full"
      role="main"
      aria-label="Chat conversation"
    >
      {/* The form-context system message is internal — never shown. */}
      {messages
        .filter((m) => m.role !== 'system')
        .map((m) => (
          <ChatMessage key={m.id} message={m} onRerate={onRerate} />
        ))}

      {isLoading && <LoadingIndicator />}

      {error && <ErrorAlert message={`Error: ${error.message}`} severity="error" />}

      {submissionError && (
        <ErrorAlert message={submissionError} severity="warning" onClose={onClearError} />
      )}

      {isComplete && (
        <ErrorBoundary
          fallback={
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-yellow-800">Error loading the summary. Please refresh the page.</p>
            </div>
          }
        >
          <AssessmentComplete report={report} core={core} onStartNew={onStartNew} />
        </ErrorBoundary>
      )}

      <div ref={messagesEndRef} />
    </main>
  );
}
