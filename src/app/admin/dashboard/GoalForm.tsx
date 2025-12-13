'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { GoalWithStats } from '@/db/goals';
import {
  COLOR_OPTIONS,
  DEFAULT_COLOR,
  DEFAULT_ICON,
  ICON_OPTIONS,
} from './iconOptions';

type Props = {
  initialData?: GoalWithStats;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function GoalForm({ initialData, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [dailyTargetCount, setDailyTargetCount] = useState(
    initialData?.dailyTargetCount ?? 1
  );
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [icon, setIcon] = useState(initialData?.icon ?? DEFAULT_ICON);
  const [color, setColor] = useState(initialData?.color ?? DEFAULT_COLOR);

  const isEditMode = !!initialData;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      title,
      dailyTargetCount: Number(dailyTargetCount),
      description,
      icon,
      color,
    };

    startTransition(async () => {
      let res;
      if (isEditMode && initialData) {
        res = await fetch(`/api/goals/${initialData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message || `Failed to ${isEditMode ? 'update' : 'create'} goal`);
        return;
      }

      router.refresh();
      if (onSuccess) onSuccess();
    });
  }

  async function onDelete() {
    if (!initialData || !confirm('Are you sure you want to delete this goal?')) return;

    startTransition(async () => {
      const res = await fetch(`/api/goals/${initialData.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        setError('Failed to delete goal');
        return;
      }

      router.refresh();
      if (onSuccess) onSuccess();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f1724] p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            {isEditMode ? 'Edit goal' : 'Create a goal'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isEditMode
              ? 'Update your goal details below.'
              : 'Add the name, description, and daily target count.'}
          </p>
        </div>
        {isEditMode && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-900/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-900/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Goal name</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Daily reading"
            className="rounded-lg border border-slate-700 bg-[#0b1017] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            Daily target count
          </span>
          <input
            type="number"
            min={1}
            value={dailyTargetCount}
            onChange={(e) => setDailyTargetCount(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-[#0b1017] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-300">
            Description (optional)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes or context"
            className="min-h-[96px] rounded-lg border border-slate-700 bg-[#0b1017] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <div className="grid gap-3 md:col-span-2">
          <span className="text-sm font-medium text-slate-300">
            Choose an icon
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {ICON_OPTIONS.map((opt) => {
              const Icon = opt.Icon;
              const isSelected = icon === opt.value;
              return (
                <label key={opt.value} className="cursor-pointer group relative block">
                  <input
                    type="radio"
                    name="icon"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => setIcon(opt.value)}
                    className="peer sr-only"
                  />
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition
                      ${isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 bg-[#0b1017] text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{opt.label}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:col-span-2">
          <span className="text-sm font-medium text-slate-300">
            Choose a color
          </span>
          <div className="flex flex-wrap gap-3">
            {COLOR_OPTIONS.map((c) => {
              const isSelected = color === c;
              return (
                <label key={c} className="relative inline-flex cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c}
                    checked={isSelected}
                    onChange={() => setColor(c)}
                    className="peer sr-only"
                  />
                  <span
                    className={`h-10 w-10 rounded-full border-2 transition hover:opacity-90
                      ${isSelected ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-900/20 px-3 py-2 text-sm text-red-400 md:col-span-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditMode ? 'Save changes' : 'Create goal'}
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
