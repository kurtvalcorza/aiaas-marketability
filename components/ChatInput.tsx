/**
 * Chat input component with validation and auto-resize
 */

import { Send } from 'lucide-react';
import { useState, useRef, useEffect, FormEvent, KeyboardEvent, ChangeEvent } from 'react';
import { MAX_INPUT_LENGTH } from '@/lib/constants';
import { validateMessageContent } from '@/lib/validation';
import { ErrorAlert } from './ErrorAlert';

interface ChatInputProps {
  onSubmit: (message: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, isLoading, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate input
    if (!input.trim()) return;

    // Check input length
    if (input.length > MAX_INPUT_LENGTH) {
      setInputError(
        `Message is too long. Please limit your response to ${MAX_INPUT_LENGTH} characters.`
      );
      return;
    }

    try {
      // Validate content
      validateMessageContent(input);
      setInputError('');
      const value = input;
      setInput('');
      await onSubmit(value);
    } catch (error: any) {
      setInputError(error.message || 'Invalid input detected');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    if (e.key === 'Escape') {
      setInput('');
      setInputError('');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setInputError('');
  };

  const isDisabled = isLoading || disabled || !input?.trim() || input.length > MAX_INPUT_LENGTH;

  const getPlaceholder = () => {
    if (isLoading) {
      return 'Waiting for response...';
    }
    return 'Type your answer...';
  };

  const getLoadingMessage = () => {
    return 'Waiting for response...';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-2">
      {inputError && <ErrorAlert message={inputError} onClose={() => setInputError('')} />}
      
      {/* Loading indicator for input area */}
      {isLoading && (
        <div className="text-center text-sm text-gray-500 py-2">
          <span className="inline-flex items-center space-x-2">
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span>{getLoadingMessage()}</span>
          </span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2 items-end" aria-label="Send message">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[48px] max-h-[200px] transition-colors duration-200 ${
              isLoading 
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-50 border-gray-300'
            }`}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            autoFocus={!isLoading}
            rows={1}
            maxLength={MAX_INPUT_LENGTH}
            disabled={disabled || isLoading}
            aria-label="Type your answer here. Press Enter to send, Shift+Enter for new line, Escape to clear"
            style={{
              overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden',
            }}
          />
          <div className="absolute bottom-1 right-2 text-xs text-gray-400">
            {input.length}/{MAX_INPUT_LENGTH}
          </div>
        </div>
        <button
          type="submit"
          className={`p-3 rounded-xl transition-all duration-200 flex-shrink-0 ${
            isDisabled 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          disabled={isDisabled}
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={20} aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
}
