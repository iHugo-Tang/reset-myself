'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  COLOR_OPTIONS,
  DEFAULT_COLOR,
  DEFAULT_ICON,
  ICON_OPTIONS,
} from './iconOptions';

export function CreateGoalForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      title: formData.get('title'),
      dailyTargetCount: Number(formData.get('dailyTargetCount')),
      description: formData.get('description'),
      icon: formData.get('icon'),
      color: formData.get('color'),
    };

    startTransition(async () => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError('Failed to create goal');
        return;
      }

      router.refresh();
      // Reset form
      formRef.current?.reset();
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Create a goal</h2>
      <p className="mt-1 text-sm text-slate-600">
        Add the name, description, and daily target count.
      </p>
      <form
        ref={formRef}
        action={onSubmit}
        className="mt-4 grid gap-4 md:grid-cols-2"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Goal name</span>
          <input
            required
            name="title"
            placeholder="e.g., Daily reading"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            Daily target count
          </span>
          <input
            type="number"
            min={1}
            name="dailyTargetCount"
            defaultValue={1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            Description (optional)
          </span>
          <textarea
            name="description"
            placeholder="Add notes or context"
            className="min-h-[96px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
          />
        </label>

        <div className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            Choose an icon
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ICON_OPTIONS.map((opt) => {
              const Icon = opt.Icon;
              return (
                <label key={opt.value} className="group relative block">
                  <input
                    type="radio"
                    name="icon"
                    value={opt.value}
                    defaultChecked={opt.value === DEFAULT_ICON}
                    className="peer sr-only"
                  />
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition peer-checked:border-emerald-500 peer-checked:ring-1 peer-checked:ring-emerald-200 hover:border-emerald-300">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>{opt.label}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            Choose a color
          </span>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <label key={color} className="relative inline-flex">
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={color === DEFAULT_COLOR}
                  className="peer sr-only"
                />
                <span
                  className="h-10 w-10 rounded-full border-2 border-transparent shadow-inner transition peer-focus:outline-2 peer-focus:outline-offset-2 peer-focus:outline-emerald-300"
                  style={{ backgroundColor: color }}
                />
                <span className="absolute inset-0 hidden rounded-full border-2 border-white ring-2 ring-emerald-500 peer-checked:block" />
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 md:col-span-2">{error}</p>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create goal
          </button>
        </div>
      </form>
    </section>
  );
}
