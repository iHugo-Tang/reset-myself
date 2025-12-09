import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

import { getSupabaseConfig } from './config';

type CookieSetter = (params: { name: string; value: string } & CookieOptions) => void;

const getCookieSetter = (cookieStore: Awaited<ReturnType<typeof cookies>>): CookieSetter | null => {
	// cookies() is writable in Server Actions; read-only in Server Components. Make it tolerant.
	const storeWithSet = cookieStore as unknown as { set?: CookieSetter };
	return storeWithSet.set ?? null;
};

export const createSupabaseServerClient = async () => {
	const { supabaseKey, supabaseUrl } = getSupabaseConfig();
	const cookieStore = await cookies();
	const setCookie = getCookieSetter(cookieStore);

	return createServerClient(supabaseUrl, supabaseKey, {
		cookies: {
			get(name: string) {
				return cookieStore.get(name)?.value;
			},
			set(name: string, value: string, options: CookieOptions) {
				try {
					setCookie?.({ name, value, ...options });
				} catch (error) {
					console.error('Failed to set Supabase cookie', error);
				}
			},
			remove(name: string, options: CookieOptions) {
				try {
					setCookie?.({ name, value: '', ...options, maxAge: 0 });
				} catch (error) {
					console.error('Failed to clear Supabase cookie', error);
				}
			},
		},
	});
};
