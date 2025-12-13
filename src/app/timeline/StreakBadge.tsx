import { Flame } from 'lucide-react';

const getStreakTier = (streak: number) => {
  if (streak === 0) return 0;
  if (streak < 7) return 1;
  if (streak < 30) return 2;
  return 3;
};

export function StreakBadge({ streak }: { streak: number }) {
  const tier = getStreakTier(streak);

  const styles = {
    0: {
      wrapper: 'border-slate-800 bg-[#0b1017] text-slate-400',
      iconBox: 'bg-slate-900 text-slate-600 ring-slate-800',
      glow: '',
      icon: <Flame className="h-5 w-5 opacity-50" />,
    },
    1: {
      wrapper: 'border-orange-900/30 bg-[#1a120b] text-orange-200',
      iconBox: 'bg-orange-950/50 text-orange-500 ring-orange-900/50',
      glow: '',
      icon: <Flame className="h-5 w-5" />,
    },
    2: {
      wrapper:
        'border-orange-500/30 bg-gradient-to-br from-[#2a1b0e] to-[#1a120b] text-orange-100',
      iconBox:
        'bg-orange-500/20 text-orange-400 ring-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
      glow: 'shadow-[0_0_15px_-3px_rgba(249,115,22,0.15)]',
      icon: <Flame className="h-5 w-5 animate-pulse" />,
    },
    3: {
      wrapper:
        'border-amber-500/50 bg-gradient-to-br from-[#3d2610] to-[#2a1b0e] text-amber-50',
      iconBox:
        'bg-amber-500/20 text-amber-300 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]',
      glow: 'shadow-[0_0_25px_-5px_rgba(251,191,36,0.3)] border-amber-400/50',
      icon: (
        <Flame className="h-5 w-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      ),
    },
  }[tier];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${styles.wrapper} ${styles.glow}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-all duration-300 ${styles.iconBox}`}
        >
          {styles.icon}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
            Daily Streak
          </span>
          <span className="text-lg font-bold tabular-nums leading-tight">
            {streak}{' '}
            <span className="text-sm font-normal opacity-80">days</span>
          </span>
        </div>
      </div>
    </div>
  );
}
