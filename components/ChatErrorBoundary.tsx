/**
 * Specialized Error Boundary for chat interface
 */

import { ErrorBoundary } from './ErrorBoundary';
import { ReactNode } from 'react';
import { MessageCircleX, RefreshCw } from 'lucide-react';

interface ChatErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

export function ChatErrorBoundary({ children, onReset }: ChatErrorBoundaryProps) {
  const handleReset = () => {
    onReset?.();
    // Reload the page to get fresh state
    window.location.reload();
  };

  const chatErrorFallback = (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
        <div className="flex justify-center mb-4">
          <MessageCircleX className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="text-xl font-semibold text-orange-800 mb-2">
          Chat Error
        </h2>
        <p className="text-orange-600 mb-4">
          The chat interface encountered an error. This might be due to a network issue or a problem with the AI service.
        </p>
        <div className="space-y-2 text-sm text-orange-700 mb-4">
          <p>• Check your internet connection</p>
          <p>• Try starting a new assessment</p>
          <p>• If the problem persists, please try again later</p>
        </div>
        <button
          onClick={handleReset}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition flex items-center gap-2 mx-auto"
          aria-label="Start new assessment"
        >
          <RefreshCw size={16} />
          Start New Assessment
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={chatErrorFallback}
      onError={(error, errorInfo) => {
        // Log chat-specific errors
        console.error('Chat Error:', {
          error: error.message,
          component: 'ChatInterface',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}