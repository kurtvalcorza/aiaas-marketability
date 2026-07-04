// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  verifyPassword,
  DASHBOARD_SESSION_MAX_AGE_S,
} from '@/lib/dashboard-auth';

const SECRET = 'correct-horse-battery-staple';

describe('verifyPassword', () => {
  it('accepts the correct password', async () => {
    expect(await verifyPassword('hunter2', 'hunter2')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    expect(await verifyPassword('wrong', 'hunter2')).toBe(false);
  });

  it('rejects when the submitted password is a prefix of the real one', async () => {
    expect(await verifyPassword('hunter', 'hunter2')).toBe(false);
  });

  it('rejects against an empty configured secret', async () => {
    expect(await verifyPassword('anything', '')).toBe(false);
  });
});

describe('session token round-trip', () => {
  it('creates a token that verifies with the same secret', async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe(true);
  });

  it('rejects a token verified with a different secret', async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, 'other-secret')).toBe(false);
  });

  it('rejects a tampered signature', async () => {
    const token = await createSessionToken(SECRET);
    const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
    expect(await verifySessionToken(tampered, SECRET)).toBe(false);
  });

  it('rejects a tampered issued-at (signature no longer matches)', async () => {
    const token = await createSessionToken(SECRET, 1_000);
    const sig = token.slice(token.indexOf('.') + 1);
    expect(await verifySessionToken(`9999999999999.${sig}`, SECRET)).toBe(false);
  });
});

describe('session token expiry', () => {
  it('accepts a token within the max age', async () => {
    const token = await createSessionToken(SECRET, 0);
    const withinWindow = DASHBOARD_SESSION_MAX_AGE_S * 1000 - 1;
    expect(await verifySessionToken(token, SECRET, withinWindow)).toBe(true);
  });

  it('rejects a token past the max age', async () => {
    const token = await createSessionToken(SECRET, 0);
    const pastWindow = DASHBOARD_SESSION_MAX_AGE_S * 1000 + 1;
    expect(await verifySessionToken(token, SECRET, pastWindow)).toBe(false);
  });

  it('rejects a token issued in the future (negative age)', async () => {
    const token = await createSessionToken(SECRET, 10_000);
    expect(await verifySessionToken(token, SECRET, 5_000)).toBe(false);
  });
});

describe('malformed tokens', () => {
  it.each([
    ['empty string', ''],
    ['no dot', 'abcdef'],
    ['leading dot', '.abcdef'],
    ['trailing dot', '123.'],
    ['non-numeric issued-at', 'abc.def'],
  ])('rejects %s', async (_label, token) => {
    expect(await verifySessionToken(token, SECRET)).toBe(false);
  });

  it('rejects when no token is present', async () => {
    expect(await verifySessionToken(undefined, SECRET)).toBe(false);
    expect(await verifySessionToken(null, SECRET)).toBe(false);
  });

  it('rejects when no secret is configured', async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, undefined)).toBe(false);
    expect(await verifySessionToken(token, '')).toBe(false);
  });
});
