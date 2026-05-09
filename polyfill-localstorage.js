// Global localStorage polyfill for server side - fixes Electron runtime conflict
if (typeof globalThis !== 'undefined' && !('localStorage' in globalThis)) {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null
  };
}

if (typeof global !== 'undefined' && !('localStorage' in global)) {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null
  };
}