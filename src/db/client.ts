import { drizzle } from 'drizzle-orm/d1';

import * as schema from '../../drizzle/schema';

export type EnvWithD1 = {
	reset_myself?: D1Database; // D1 绑定
};

export const getDb = (env: EnvWithD1) => {
	if (env.reset_myself) {
		return drizzle(env.reset_myself, { schema });
	}

	throw new Error('Database configuration missing: set D1 binding');
};
