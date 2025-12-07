import { drizzle } from 'drizzle-orm/d1';

import * as schema from '../../drizzle/schema';

export type EnvWithD1 = {
  reset_myself: unknown; // D1Database binding
};

export const getDb = (env: EnvWithD1) =>
  drizzle(env.reset_myself as any, { schema });
