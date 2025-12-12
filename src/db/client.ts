import { drizzle } from 'drizzle-orm/d1';

import * as schema from '../../drizzle/schema';

export type EnvWithD1 = {
  reset_myself?: D1Database; // D1 binding
};

export const getDb = (env: EnvWithD1) => {
  if (env.reset_myself) {
    return drizzle(env.reset_myself, { schema });
  }

  console.error(
    '[getDb] D1 binding missing. Available env keys:',
    Object.keys(env)
  );
  throw new Error('Database configuration missing: set D1 binding');
};
