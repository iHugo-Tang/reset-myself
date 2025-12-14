import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FishBackground } from './FishBackground';
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070a] px-4 py-10 text-slate-100">
      <FishBackground />
      <div className="pointer-events-none absolute inset-0 bg-radial-[at_50%_35%] from-emerald-300/12 via-transparent to-black/70" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.22),rgba(0,0,0,0.82))]" />

      <section className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:gap-12">
        <div className="flex w-full flex-col justify-center gap-5 text-center lg:w-1/2 lg:text-left">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Reset yourself, one small win at a time
          </h1>
          <p className="text-pretty text-base leading-relaxed text-slate-200/80">
            Track goals, log reflections, and keep momentum. Sign in to continue
            your timeline.
          </p>
        </div>
        <SupabaseAuthUI redirectTo={redirectTo} />
      </section>
    </main>
  );
}
