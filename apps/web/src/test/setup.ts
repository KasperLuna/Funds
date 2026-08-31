// vitest setup — runs once before all test files. Stub the jsdom bits that
// radix + vaul need but jsdom doesn't ship. Skip in node-environment tests
// (the lib/* and server/* suites use vitest's default node env).
if (typeof window !== "undefined") {
  stubDom();
  stubLocalStorage();
}

function stubDom() {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
  }

  const elementProto = Element.prototype as unknown as Record<string, unknown>;
  if (typeof elementProto.scrollIntoView !== "function") {
    elementProto.scrollIntoView = function () {};
  }
  if (typeof elementProto.hasPointerCapture !== "function") {
    elementProto.hasPointerCapture = function () {
      return false;
    };
  }
  if (typeof elementProto.setPointerCapture !== "function") {
    elementProto.setPointerCapture = function () {};
  }
  if (typeof elementProto.releasePointerCapture !== "function") {
    elementProto.releasePointerCapture = function () {};
  }

  // cavetail: jsdom lacks matchMedia. shadcn Sheet (apps/web/src/components/ui/sheet.tsx)
  // uses it to choose mobile drawer vs desktop dialog. Default to "not desktop"
  // so tests render the vaul drawer (the existing path).
  if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  // cavetail: vaul calls .match() on style.transform during pointerup. jsdom
  // returns undefined for transform; the fallback chain in vaul reads
  // webkitTransform/mozTransform next and crashes when both are undefined.
  // Wrap getComputedStyle in a Proxy that returns safe values for the three
  // transform properties and delegates everything else.
  const origGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = ((element: Element, pseudoElt?: string | null) => {
    const style = origGetComputedStyle(element, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (
          prop === "transform" ||
          prop === "webkitTransform" ||
          prop === "mozTransform"
        ) {
          const v = Reflect.get(target, prop, receiver);
          return typeof v === "string" ? v : "";
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }) as typeof window.getComputedStyle;
}

// cavetail: jsdom doesn't ship localStorage. zustand persist middleware
// (used by usePrivacyStore) reads it at import time; stubbing here before
// any test module loads prevents "Cannot read properties of undefined".
function stubLocalStorage() {
  if (typeof globalThis.localStorage !== "undefined") return;
  let store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (i: number) => Object.keys(store)[i] ?? null,
    },
    writable: true,
    configurable: true,
  });
}
