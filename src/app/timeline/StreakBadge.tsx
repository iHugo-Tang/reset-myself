'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

import ElectricBorder from '@/components/ElectricBorder';

const getStreakTier = (streak: number) => {
  if (streak === 0) return 0;
  if (streak < 7) return 1;
  if (streak < 30) return 2;
  return 3;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
    : normalized.padEnd(6, '0');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const mixHexColors = (from: string, to: string, weight: number) => {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const clampWeight = clamp(weight, 0, 1);
  const mix = {
    r: Math.round(start.r + (end.r - start.r) * clampWeight),
    g: Math.round(start.g + (end.g - start.g) * clampWeight),
    b: Math.round(start.b + (end.b - start.b) * clampWeight),
  };
  return `#${mix.r.toString(16).padStart(2, '0')}${mix.g
    .toString(16)
    .padStart(2, '0')}${mix.b.toString(16).padStart(2, '0')}`;
};

type ElectricPalette = {
  start: string;
  end: string;
};

type StreakVisual = {
  wrapper: string;
  iconBox: string;
  glow?: string;
  icon: ReactNode;
  electric: ElectricPalette | null;
};

const streakStyles: Record<number, StreakVisual> = {
  0: {
    wrapper: 'border-slate-800 bg-[#0b1017] text-slate-400',
    iconBox: 'bg-slate-900 text-slate-600 ring-slate-800',
    glow: '',
    icon: <Flame className="h-5 w-5 opacity-50" />,
    electric: null,
  },
  1: {
    wrapper: 'border-orange-900/30 bg-[#1a120b] text-orange-200',
    iconBox: 'bg-orange-950/50 text-orange-500 ring-orange-900/50',
    glow: '',
    icon: <Flame className="h-5 w-5" />,
    electric: {
      start: '#f97316',
      end: '#fdba74',
    },
  },
  2: {
    wrapper:
      'border-orange-500/30 bg-gradient-to-br from-[#2a1b0e] to-[#1a120b] text-orange-100',
    iconBox:
      'bg-orange-500/20 text-orange-400 ring-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
    glow: 'shadow-[0_0_15px_-3px_rgba(249,115,22,0.15)]',
    icon: <Flame className="h-5 w-5 animate-pulse" />,
    electric: {
      start: '#fb923c',
      end: '#facc15',
    },
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
    electric: {
      start: '#fcd34d',
      end: '#fef08a',
    },
  },
};

export function StreakBadge({ streak }: { streak: number }) {
  const tier = getStreakTier(streak);
  const styles = streakStyles[tier];
  const [electricMode, setElectricMode] = useState<'full' | 'lite'>('lite');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setElectricMode(media.matches ? 'full' : 'lite');
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const palette = streak > 0 ? styles.electric : null;
  const electricIntensity = palette ? clamp(Math.log10(streak + 1) / Math.log10(365), 0.15, 1) : 0;

  const electricProps = palette
    ? {
      color: mixHexColors(palette.start, palette.end, electricIntensity),
      speed: 0.9 + electricIntensity * 2.6,
      chaos: 0.4 + electricIntensity * 1.8,
      thickness: 1.4 + electricIntensity * 3.6,
    }
    : null;

  const badge = (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${styles.wrapper} ${styles.glow ?? ''
        }`}
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
            <span className="text-sm font-normal opacity-80">{streak === 1 ? 'day' : 'days'}</span>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div data-testid="streak-badge" className="w-full">
      {electricProps ? (
        <ElectricBorder
          data-testid="streak-electric"
          className="block w-full rounded-2xl"
          mode={electricMode}
          color={electricProps.color}
          speed={electricProps.speed}
          chaos={electricProps.chaos}
          thickness={electricProps.thickness}
        >
          {badge}
        </ElectricBorder>
      ) : (
        badge
      )}
    </div>
  );
}
