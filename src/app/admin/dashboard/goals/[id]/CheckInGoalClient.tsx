'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { GoalWithStats } from '@/db/goals';
import { RetroactiveCheckInForm } from '../../RetroactiveCheckInForm';

type Props = {
  goal: GoalWithStats;
};

export function CheckInGoalClient({ goal }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="mx-auto w-full max-w-xl px-4 py-8 lg:px-8">
        <Link
          href="/admin/dashboard"
          className="inline-flex text-sm font-medium text-slate-400 transition hover:text-slate-200"
        >
          ← Back to goals
        </Link>

        <div className="mt-6">
          <RetroactiveCheckInForm
            goal={goal}
            onSuccess={() => {
              router.push('/admin/dashboard');
            }}
            onCancel={() => router.push('/admin/dashboard')}
          />
        </div>
      </div>
    </div>
  );
}
