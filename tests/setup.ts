import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement scrollIntoView; the chat auto-scroll hook calls it
// on mount. Stub it so component tests don't emit unhandled errors.
// Guarded with typeof so this setup also runs under the Node test environment
// (used by non-DOM suites), where `Element` is undefined.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
