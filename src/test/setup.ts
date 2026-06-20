import "@testing-library/jest-dom";

// Mock ResizeObserver which is not implemented in jsdom by default
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;
