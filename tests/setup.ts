import { afterEach, beforeEach, vi } from 'vitest';

vi.stubEnv('NODE_ENV', 'test');

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.resetModules();
});
