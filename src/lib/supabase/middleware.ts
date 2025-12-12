import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

import { getSupabaseConfig } from './config';

export const createSupabaseMiddlewareClient = (
	req: NextRequest,
	res: NextResponse
) => {
	const { supabaseKey, supabaseUrl } = getSupabaseConfig();

	return createServerClient(supabaseUrl, supabaseKey, {
		cookies: {
			get(name: string) {
				return req.cookies.get(name)?.value;
			},
			set(name: string, value: string, options: CookieOptions) {
				res.cookies.set({ name, value, ...options });
			},
			remove(name: string, options: CookieOptions) {
				res.cookies.set({ name, value: '', ...options, maxAge: 0 });
			},
		},
	});
};
