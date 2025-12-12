import { Flame } from 'lucide-react';

export function StreakBadge({ streak }: { streak: number }) {
  const isActive = streak > 0;
  const containerClass = isActive
    ? 'border-amber-500/40 bg-[#1e1a11] text-amber-100'
    : 'border-slate-800 bg-[#11161c] text-slate-200';
  const circleClass = isActive
    ? 'text-amber-200 ring-amber-500/30 bg-[#2a2110]'
    : 'text-slate-400 ring-slate-800 bg-[#0b1017]';

  return (
    <div
      className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.35)] ${containerClass}`}
      aria-live="polite"
      title={isActive ? `On a ${streak}-day streak` : 'Streak not started yet'}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ring-1 ${circleClass}`}
        aria-hidden
      >
        <Flame className={`h-5 w-5 ${isActive ? '' : 'opacity-70'}`} />
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
          Daily streak
        </p>
        <p className="text-sm font-semibold text-slate-50">
          {isActive ? `Current streak: ${streak} days` : 'No streak yet'}
        </p>
        <p className="text-xs text-slate-400">
          {isActive
            ? 'Keep the rhythm: complete all goals to count the day'
            : 'Finish all goals today to start your streak'}
        </p>
      </div>
    </div>
  );
}

