'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';
import type { GoalWithStats } from '@/db/goals';
import { runGoalAction } from './goalActions';

type Props = {
  goal: GoalWithStats;
  onEdit?: (goal: GoalWithStats) => void;
  onRetroactiveCheckIn?: (goal: GoalWithStats) => void;
};

export function GoalActionsMenu({ goal, onEdit, onRetroactiveCheckIn }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isOpen]);

  const handleDelete = async () => {
    const ok = window.confirm('Delete this goal? This cannot be undone.');
    if (!ok) return;

    setIsOpen(false);
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        window.alert('Delete failed');
        return;
      }
      router.refresh();
    });
  };

  const itemClass =
    'flex w-full select-none items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-[#0b1017] text-slate-400 shadow-sm transition-colors duration-150 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Goal actions"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[1000] mt-2 w-48 overflow-hidden rounded-xl border border-slate-800 bg-[#0c121a] p-1 shadow-2xl ring-1 ring-white/5"
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              runGoalAction({
                action: 'edit',
                goal,
                onEdit,
                onRetroactiveCheckIn,
                routerPush: (href) => router.push(href),
              });
            }}
            className={`${itemClass} text-slate-200 hover:bg-slate-800`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              runGoalAction({
                action: 'checkin',
                goal,
                onEdit,
                onRetroactiveCheckIn,
                routerPush: (href) => router.push(href),
              });
            }}
            className={`${itemClass} text-slate-200 hover:bg-slate-800`}
          >
            Retroactive check-in
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className={`${itemClass} text-rose-400 hover:bg-rose-500/10 disabled:opacity-60`}
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </span>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
