'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { GoalWithStats } from '@/db/goals';

type Props = {
  goal: GoalWithStats;
  onSuccess: () => void;
  onCancel: () => void;
};

export function RetroactiveCheckInForm({ goal, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState('');
  const [count, setCount] = useState('1');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f1724] p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-100">
          Retroactive check-in
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Add a completion record for{' '}
          <span className="font-medium text-slate-200">{goal.title}</span>.
        </p>
      </div>

      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const trimmedDate = date.trim();
          if (!trimmedDate) {
            setError('Date is required');
            return;
          }
          const countNumber = Number(count);
          if (!Number.isFinite(countNumber) || countNumber <= 0) {
            setError('Count must be a positive number');
            return;
          }

          startTransition(async () => {
            const res = await fetch(`/api/goals/${goal.id}/completion`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                accept: 'application/json',
              },
              body: JSON.stringify({
                date: trimmedDate,
                count: Math.floor(countNumber),
              }),
            });

            if (!res.ok) {
              const json = (await res.json().catch(() => null)) as
                | { error?: string; message?: string }
                | null;
              setError(json?.message ?? json?.error ?? 'Check-in failed');
              return;
            }

            router.refresh();
            onSuccess();
          });
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded-lg border border-slate-700 bg-[#0b1017] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Count</span>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="rounded-lg border border-slate-700 bg-[#0b1017] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        {error ? (
          <p className="rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save check-in
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
