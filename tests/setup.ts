import { afterEach, beforeEach, vi } from 'vitest';

(process.env as any).NODE_ENV = 'test';

beforeEach(() => {
	vi.useRealTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.clearAllMocks();
	vi.resetModules();
});
