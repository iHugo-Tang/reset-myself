import { Flame } from 'lucide-react';

export function StreakBadge({ streak }: { streak: number }) {
  const isActive = streak > 0;
  // Use panel-card for background/border base, but allow overrides for text color
  // active state might still want a specific border color to highlight?
  // User asked for "same background", but didn't say lose the streak highlight.
  // I will keep the text color difference. I will try to use the unified background.
  // If active, maybe I'll keep the amber border if it looks good, or just stick to the unified style.
  // Given "unify in one place", I'll stick to the unified card style for the box itself mostly.
  // But the active state distinctiveness is important.

  const textClass = isActive ? 'text-amber-100' : 'text-slate-200';
  const borderClass = isActive ? 'border-amber-500/40' : ''; // Optional: override border if active?

  const circleClass = isActive
    ? 'text-amber-200 ring-amber-500/30 bg-[#2a2110]'
    : 'text-slate-400 ring-slate-800 bg-[#0b1017]';

  return (
    <div
      className={`panel-card flex w-full items-center gap-4 px-4 py-3 ${textClass} ${borderClass}`}
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
