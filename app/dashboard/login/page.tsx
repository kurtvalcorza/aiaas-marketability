import type { Metadata } from 'next';
import { Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard Login — AIaaS Market Study',
  robots: { index: false, follow: false },
};

/**
 * Researcher-dashboard login. A plain (no-JS) password form that POSTs to
 * /api/dashboard/login, which validates the shared password and sets the
 * session cookie. Kept CSP-friendly: no inline scripts, no client bundle.
 */
export default async function DashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 text-gray-900">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-xl bg-blue-600 p-3 text-white" aria-hidden="true">
            <Lock size={22} />
          </div>
          <h1 className="text-lg font-bold text-gray-800">Researcher Dashboard</h1>
          <p className="mt-1 text-xs text-gray-500">AIaaS Market Study · Demand Viability Index</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            Incorrect password. Please try again.
          </div>
        )}

        <form method="POST" action="/api/dashboard/login" className="flex flex-col gap-3">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Access is restricted to study researchers.
        </p>
      </div>
    </div>
  );
}
