import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./test/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			lines: 100,
			functions: 100,
			branches: 100,
			statements: 100,
			include: ['src/db/goals.ts', 'src/utils/time.ts', 'src/app/api/**/*.ts'],
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
});
