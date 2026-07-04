/**
 * Error alert component for displaying user-facing errors
 * Replaces alert() calls with accessible, styled UI
 */

import { AlertCircle, X } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onClose?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

const severityStyles = {
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-600',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: 'text-yellow-600',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'text-blue-600',
  },
};

export function ErrorAlert({ message, onClose, severity = 'error' }: ErrorAlertProps) {
  const styles = severityStyles[severity];

  return (
    <div
      className={`p-4 border rounded-lg ${styles.container} flex items-start gap-3`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={20} className={`flex-shrink-0 mt-0.5 ${styles.icon}`} aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${styles.icon} hover:opacity-70 transition`}
          aria-label="Close alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
