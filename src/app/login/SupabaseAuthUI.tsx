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
    <div className="panel-card mx-auto w-full max-w-md p-8">
      <Auth
        supabaseClient={supabase}
        view="sign_in"
        dark
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#34d399',
                brandAccent: '#10b981',
                inputBackground: 'rgba(255, 255, 255, 0.06)',
                inputBorder: 'rgba(148, 163, 184, 0.24)',
                inputBorderHover: 'rgba(148, 163, 184, 0.38)',
                inputBorderFocus: 'rgba(52, 211, 153, 0.75)',
                inputText: 'rgba(241, 245, 249, 0.96)',
                inputPlaceholder: 'rgba(148, 163, 184, 0.75)',
                inputLabelText: 'rgba(226, 232, 240, 0.88)',
                anchorTextColor: 'rgba(226, 232, 240, 0.78)',
                anchorTextHoverColor: 'rgba(226, 232, 240, 0.96)',
              },
              radii: {
                inputBorderRadius: '0.85rem',
                buttonBorderRadius: '0.85rem',
              },
            },
          },
          style: {
            container: { background: 'transparent', padding: 0 },
          },
        }}
        providers={[]}
        showLinks
        redirectTo={redirectTo || '/'}
      />
    </div>
  );
};
