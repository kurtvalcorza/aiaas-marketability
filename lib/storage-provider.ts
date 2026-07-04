/**
 * Storage provider resolution
 * Decides which storage backend handles assessment submissions.
 */

export type StorageProvider = 'neon' | 'google_sheets';

export const STORAGE_PROVIDERS: readonly string[] = ['neon', 'google_sheets'];

export interface StorageProviderEnv {
  STORAGE_PROVIDER?: string;
  DATABASE_URL?: string;
  GOOGLE_SHEETS_WEBHOOK_URL?: string;
  [key: string]: string | undefined;
}

/**
 * Resolves the active storage provider.
 *
 * An explicit, valid STORAGE_PROVIDER always wins. Otherwise the provider
 * is inferred from which backend is actually configured, so upgrading a
 * Sheets-only deployment (no STORAGE_PROVIDER, no DATABASE_URL) keeps
 * writing to Google Sheets instead of silently discarding submissions.
 *
 * @param env - Environment to read from (defaults to process.env)
 * @returns The storage provider to use for this request
 */
export function resolveStorageProvider(env: StorageProviderEnv = process.env): StorageProvider {
  const raw = env.STORAGE_PROVIDER?.trim().toLowerCase();

  if (raw === 'neon' || raw === 'google_sheets') {
    return raw;
  }

  if (raw) {
    console.warn(
      `[storage] Unknown STORAGE_PROVIDER "${env.STORAGE_PROVIDER}" - expected one of: ${STORAGE_PROVIDERS.join(', ')}. Falling back to auto-detection.`
    );
  }

  if (env.DATABASE_URL) {
    return 'neon';
  }
  if (env.GOOGLE_SHEETS_WEBHOOK_URL) {
    return 'google_sheets';
  }

  // Nothing configured: route to the Sheets service, which reports
  // "webhook not configured" without failing (local dev without storage).
  return 'google_sheets';
}
