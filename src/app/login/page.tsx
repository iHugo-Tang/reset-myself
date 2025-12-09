import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SupabaseAuthUI } from './SupabaseAuthUI';

type PageProps = {
	searchParams?: Promise<{ redirectTo?: string }>;
};

const sanitizeRedirect = (redirectTo?: string) => {
	if (!redirectTo) return '/';
	if (!redirectTo.startsWith('/')) return '/';
	return redirectTo;
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: PageProps) {
	const supabase = await createSupabaseServerClient();
	const resolvedSearchParams = await searchParams;
	const {
		data: { session },
	} = await supabase.auth.getSession();

	const redirectTo = sanitizeRedirect(resolvedSearchParams?.redirectTo);

	if (session) {
		redirect(redirectTo);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
			<section className="flex w-full max-w-4xl flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
				<SupabaseAuthUI redirectTo={redirectTo} />
			</section>
		</main>
	);
}
