import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement scrollIntoView; the chat auto-scroll hook calls it
// on mount. Stub it so component tests don't emit unhandled errors.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
