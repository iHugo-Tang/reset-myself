import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/supabase/config';

export const getUserIdFromRequest = async (
  req: NextRequest
): Promise<string | null> => {
  const { supabaseKey, supabaseUrl } = getSupabaseConfig();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(_name: string, _value: string, _options: CookieOptions) {
        // Route handlers do not need to persist refreshed auth cookies here.
      },
      remove(_name: string, _options: CookieOptions) {
        // Route handlers do not need to persist refreshed auth cookies here.
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user?.id ?? null;
};

export const requireUserIdFromRequest = async (req: NextRequest) => {
  const userId = await getUserIdFromRequest(req);
  if (!userId) throw new Error('unauthorized');
  return userId;
};

export const requireUserIdFromServer = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) throw new Error('unauthorized');
  return user.id;
};

