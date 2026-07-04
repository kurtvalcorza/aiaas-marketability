/**
 * Chat header component with branding
 */

import { LineChart } from 'lucide-react';

export function ChatHeader() {
  return (
    <header
      className="bg-white border-b border-gray-200 p-4 shadow-sm flex items-center gap-3 z-10"
      role="banner"
    >
      <div className="bg-blue-600 p-2 rounded-lg text-white" aria-hidden="true">
        <LineChart size={24} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-800">AIaaS Market Study</h1>
        <p className="text-xs text-gray-500">Demand Viability Index</p>
      </div>
    </header>
  );
}
