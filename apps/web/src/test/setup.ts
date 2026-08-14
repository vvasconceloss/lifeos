import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import { server } from './server';
import '../i18n';

// Routes are code-split (React.lazy) and pages fetch on mount — give async queries
// enough time, especially when many test files run in parallel.
configure({ asyncUtilTimeout: 5000 });

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  configurable: true,
});
Object.defineProperty(window, 'localStorage', {
  value: memoryStorage,
  configurable: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia,
});

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = ResizeObserverMock as unknown as typeof window.ResizeObserver;
}

class IntersectionObserverMock {
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
}

if (typeof window.scrollTo === 'undefined') {
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
