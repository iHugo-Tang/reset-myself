import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseConfig } from './config';

export const createSupabaseBrowserClient = () => {
  const { supabaseKey, supabaseUrl } = getSupabaseConfig();

  return createBrowserClient(supabaseUrl, supabaseKey);
};
