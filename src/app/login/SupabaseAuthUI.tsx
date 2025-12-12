'use client';

import { useEffect, useMemo } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useRouter } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Props = {
	redirectTo: string;
};

export const SupabaseAuthUI = ({ redirectTo }: Props) => {
	const supabase = useMemo(() => createSupabaseBrowserClient(), []);
	const router = useRouter();

	useEffect(() => {
		const { data: authListener } = supabase.auth.onAuthStateChange(
			(event, session) => {
				if (event === 'SIGNED_IN' && session) {
					router.replace(redirectTo || '/');
					router.refresh();
				}
			}
		);

		return () => {
			authListener?.subscription?.unsubscribe();
		};
	}, [redirectTo, router, supabase]);

	return (
		<div className="mx-auto w-full max-w-md rounded border border-gray-200 bg-white p-6 shadow-sm">
			<Auth
				supabaseClient={supabase}
				view="sign_in"
				appearance={{ theme: ThemeSupa }}
				providers={[]}
				showLinks
				redirectTo={redirectTo || '/'}
			/>
		</div>
	);
};
