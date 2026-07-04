/**
 * Loading indicator for chat streaming
 */

import { Bot } from 'lucide-react';

export function LoadingIndicator() {
  return (
    <div className="flex gap-4" role="status" aria-live="polite" aria-label="Assistant is typing">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"
        aria-hidden="true"
      >
        <Bot size={16} />
      </div>
      <div className="p-4 bg-white border border-blue-100 rounded-2xl rounded-tl-sm shadow-sm">
        <div className="flex space-x-1">
          <div 
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: '75ms' }}
          />
          <div 
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
        </div>
        <span className="sr-only">Assistant is typing</span>
      </div>
    </div>
  );
}
