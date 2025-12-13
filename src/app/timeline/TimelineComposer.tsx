'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { calculateEffectiveLength } from '@/utils/text';
import type { TimelineNoteCreateResponse } from '@/api/types';
import { getErrorMessage, readJson } from '@/utils/api';

const MAX_LEN = 280;

export default function TimelineComposer() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim();
  const remaining = MAX_LEN - calculateEffectiveLength(trimmed);
  const disabled = loading || !trimmed || remaining < 0;

  const handleSubmit = async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/timeline/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const json = await readJson<TimelineNoteCreateResponse>(res);
        setError(
          getErrorMessage(json) ?? 'Unable to save. Please try again soon.'
        );
        return;
      }

      setValue('');
      router.refresh();
    } catch (err) {
      console.error('timeline note submit error', err);
      setError('Request error. Please try again soon.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-900/70 bg-linear-to-br from-[#0d1520] via-[#0f1b2a] to-[#0c121a] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.45)] sm:p-5">
      <div className="flex gap-3">
        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-slate-200 ring-1 ring-slate-800">
          <UserRound className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1 space-y-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="What's on your mind: thoughts, status, or inspiration?"
            className="h-24 w-full resize-none rounded-2xl border border-slate-800 bg-[#0b1017] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:ring-2 focus:ring-sky-700/70 focus:outline-none"
            aria-label="Write your update"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-slate-500">
              <span
                className={
                  remaining < 0
                    ? 'text-red-500 font-semibold'
                    : remaining < 20
                      ? 'text-amber-300'
                      : ''
                }
              >
                {remaining}
              </span>{' '}
              / {MAX_LEN}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={handleSubmit}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${disabled
                  ? 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500'
                  : 'border border-sky-600/70 bg-sky-600/80 text-slate-50 shadow-[0_6px_25px_rgba(14,165,233,0.25)] hover:border-sky-400 hover:bg-sky-500/80 active:border-sky-300 active:bg-sky-500'
                  }`}
                aria-busy={loading}
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {error ? (
              <span className="text-sm text-amber-300">{error}</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
