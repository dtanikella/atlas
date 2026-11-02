require('@testing-library/jest-dom')

// Polyfill TextEncoder/TextDecoder for jsdom
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Default fetch mock so components that fetch don't
// crash the test process when a test file doesn't define its own fetch mock.
// Only installs when nothing has already set global.fetch (module-scope
// assignments like `global.fetch = jest.fn(...)` in a test file run before
// this, so they take precedence and are left alone).
beforeEach(() => {
  if (!global.fetch) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  }
});

// Mock d3 modules globally for all tests
jest.mock('d3-zoom', () => ({
  zoom: jest.fn(() => {
    const zoomBehavior = jest.fn();
    zoomBehavior.scaleExtent = jest.fn().mockReturnValue(zoomBehavior);
    zoomBehavior.on = jest.fn().mockReturnValue(zoomBehavior);
    return zoomBehavior;
  }),
  zoomIdentity: { toString: jest.fn().mockReturnValue('') },
}));

jest.mock('d3-selection', () => ({
  select: jest.fn(() => ({
    call: jest.fn(),
  })),
}));
