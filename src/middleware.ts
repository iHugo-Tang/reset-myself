import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = ['/login', '/auth/callback'];

const isPublicPath = (pathname: string) =>
	PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const applyNoIndexHeaders = (res: NextResponse) => {
	res.headers.set('X-Robots-Tag', 'noindex, nofollow, noai, noimageai');
	return res;
};

export async function middleware(req: NextRequest) {
	const { pathname, search } = req.nextUrl;

	if (isPublicPath(pathname)) {
		return applyNoIndexHeaders(NextResponse.next());
	}

	const requestHeaders = new Headers(req.headers);
	const res = applyNoIndexHeaders(
		NextResponse.next({ request: { headers: requestHeaders } }),
	);
	res.headers.set('x-middleware-cache', 'no-cache');

	try {
		const supabase = createSupabaseMiddlewareClient(req, res);
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (user) {
			return res;
		}
	} catch (error) {
		console.error('Supabase auth check failed in middleware', error);
	}

	const redirectUrl = req.nextUrl.clone();
	redirectUrl.pathname = '/login';
	redirectUrl.searchParams.set('redirectTo', pathname === '/' ? '/' : `${pathname}${search}`);
	return applyNoIndexHeaders(NextResponse.redirect(redirectUrl));
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image).*)',
	],
};
