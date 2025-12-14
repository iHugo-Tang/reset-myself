'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { StreakBadge } from '@/app/timeline/StreakBadge';

const presetStreaks = [0, 1, 3, 7, 14, 30, 60, 120, 240, 365];
const sliderMax = 400;

export default function StreakPreviewPage() {
  const [previewValue, setPreviewValue] = useState(42);
  const [inputValue, setInputValue] = useState('42');

  const handlePreviewChange = (next: number) => {
    const clamped = Math.max(0, Math.min(sliderMax, Math.round(next)));
    setPreviewValue(clamped);
    setInputValue(String(clamped));
  };

  const liveLabel = useMemo(() => (previewValue === 1 ? 'day' : 'days'), [previewValue]);

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Streak Badge Preview</h1>
            <p className="text-sm text-slate-400">
              Experiment with live streak values and compare against preset tiers.
            </p>
          </div>
          <Link
            href="/timeline"
            className="text-sm font-semibold text-orange-300 transition hover:text-orange-200"
          >
            {'<-'} Back to timeline
          </Link>
        </header>

        <section className="space-y-4 rounded-3xl border border-slate-900/40 bg-slate-950/40 p-5 shadow-inner">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Live streak
              </p>
              <p className="text-4xl font-bold text-white">
                {previewValue}
                <span className="ml-2 text-base font-medium text-slate-400">{liveLabel}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-400" htmlFor="streak-input">
                Manual
                <input
                  id="streak-input"
                  type="number"
                  min={0}
                  max={sliderMax}
                  value={inputValue}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next)) {
                      setInputValue(event.target.value);
                      return;
                    }
                    handlePreviewChange(next);
                  }}
                  className="w-24 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-right text-slate-100"
                />
              </label>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={sliderMax}
            value={previewValue}
            onChange={(event) => handlePreviewChange(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-orange-400"
          />
          <div className="rounded-2xl border border-slate-900/40 bg-slate-950/70 p-4">
            <StreakBadge streak={previewValue} />
          </div>
        </section>

        <section>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Preset streaks
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {presetStreaks.map((value) => (
              <div
                key={value}
                className="rounded-2xl border border-slate-900/60 bg-slate-950/60 p-4 shadow-inner"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Streak: {value} {value === 1 ? 'day' : 'days'}
                </p>
                <StreakBadge streak={value} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
