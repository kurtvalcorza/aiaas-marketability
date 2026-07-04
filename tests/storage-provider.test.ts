/**
 * Tests for storage provider resolution
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveStorageProvider } from '@/lib/storage-provider';

describe('resolveStorageProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('honors an explicit neon provider', () => {
    expect(resolveStorageProvider({ STORAGE_PROVIDER: 'neon' })).toBe('neon');
  });

  it('honors an explicit google_sheets provider', () => {
    expect(resolveStorageProvider({ STORAGE_PROVIDER: 'google_sheets' })).toBe('google_sheets');
  });

  it('normalizes case and whitespace', () => {
    expect(resolveStorageProvider({ STORAGE_PROVIDER: ' NEON ' })).toBe('neon');
  });

  it('warns and falls back to auto-detection for unknown values', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const provider = resolveStorageProvider({
      STORAGE_PROVIDER: 'google-sheets',
      GOOGLE_SHEETS_WEBHOOK_URL: 'https://example.com/webhook',
    });

    expect(provider).toBe('google_sheets');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown STORAGE_PROVIDER'));
  });

  it('auto-detects neon when DATABASE_URL is set', () => {
    expect(resolveStorageProvider({ DATABASE_URL: 'postgresql://u:p@host/db' })).toBe('neon');
  });

  it('prefers neon when both backends are configured', () => {
    const provider = resolveStorageProvider({
      DATABASE_URL: 'postgresql://u:p@host/db',
      GOOGLE_SHEETS_WEBHOOK_URL: 'https://example.com/webhook',
    });
    expect(provider).toBe('neon');
  });

  it('auto-detects google_sheets when only the webhook is configured', () => {
    const provider = resolveStorageProvider({
      GOOGLE_SHEETS_WEBHOOK_URL: 'https://example.com/webhook',
    });
    expect(provider).toBe('google_sheets');
  });

  it('defaults to google_sheets (graceful no-op) when nothing is configured', () => {
    expect(resolveStorageProvider({})).toBe('google_sheets');
  });
});
