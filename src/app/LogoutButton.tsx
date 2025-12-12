'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { signOut } from './auth/actions';

type Props = {
  className?: string;
};

export const LogoutButton = ({ className }: Props) => {
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
      className={`rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-600 ${className ?? ''}`}
    >
      {pending ? 'Signing out...' : 'Sign out'}
    </button>
  );
};
