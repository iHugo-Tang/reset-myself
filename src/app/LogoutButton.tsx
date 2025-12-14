'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { signOut } from './auth/actions';

type Props = {
  className?: string;
  label?: string;
  pendingLabel?: string;
};

export const LogoutButton = ({
  className,
  label = 'Logout',
  pendingLabel = 'Logging out...',
}: Props) => {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (pathname === '/login') {
    return null;
  }

  const handleClick = () => {
    startTransition(async () => {
      await signOut();
      router.replace('/login');
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={[
        'rounded-2xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-sm font-semibold text-slate-100',
        'shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition hover:border-slate-700 hover:bg-slate-900',
        'disabled:cursor-not-allowed disabled:opacity-70',
        className ?? '',
      ].join(' ')}
    >
      {pending ? pendingLabel : label}
    </button>
  );
};
