import React, { useRef } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGsapEntrance } from '../../hooks/useGsapEntrance';
import { useGsapCounter } from '../../hooks/useGsapCounter';
import { useGsapHoverLift } from '../../hooks/useGsapHoverLift';

const accentMap = {
  red: {
    border: 'border-red-500/35',
    glow: 'shadow-[0_0_24px_-4px_rgba(239,68,68,0.45)]',
    text: 'text-red-300',
    bar: 'from-red-500/50 to-transparent',
  },
  cyan: {
    border: 'border-cyan-500/35',
    glow: 'shadow-[0_0_24px_-4px_rgba(34,211,238,0.4)]',
    text: 'text-cyan-200',
    bar: 'from-cyan-400/50 to-transparent',
  },
  green: {
    border: 'border-emerald-500/35',
    glow: 'shadow-[0_0_24px_-4px_rgba(52,211,153,0.4)]',
    text: 'text-emerald-200',
    bar: 'from-emerald-400/50 to-transparent',
  },
  amber: {
    border: 'border-amber-500/35',
    glow: 'shadow-[0_0_24px_-4px_rgba(251,191,36,0.35)]',
    text: 'text-amber-200',
    bar: 'from-amber-400/50 to-transparent',
  },
} as const;

export function StatCard({
  label,
  value,
  accent,
  trend,
  trendDir = 'flat',
  pulse = false,
  entranceIndex = 0,
}: {
  label: string;
  value: number;
  accent: keyof typeof accentMap;
  trend?: string;
  trendDir?: 'up' | 'down' | 'flat';
  pulse?: boolean;
  /** Stagger order for GSAP entrance (0 = first). */
  entranceIndex?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const a = accentMap[accent];
  const TrendIcon = trendDir === 'up' ? TrendingUp : trendDir === 'down' ? TrendingDown : Minus;

  useGsapEntrance(
    rootRef,
    [],
    {
      delay: entranceIndex * 0.08,
      duration: 0.48,
      from: { autoAlpha: 0, y: 20 },
    }
  );
  useGsapHoverLift(rootRef, { y: -4, scale: 1.02 });
  useGsapCounter(valueRef, value, { duration: 0.6 });

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative flex-1 min-w-[140px] rounded-xl border bg-slate-900/40 backdrop-blur-md p-4 overflow-hidden will-change-transform',
        a.border,
        pulse && 'ring-1 ring-red-500/30',
        a.glow
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r', a.bar)} />
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <span ref={valueRef} className={cn('text-3xl sm:text-4xl font-black tracking-tight tabular-nums', a.text)}>
          0
        </span>
        {trend != null && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-[10px] font-semibold mb-1',
              trendDir === 'up' && 'text-emerald-400/90',
              trendDir === 'down' && 'text-red-400/80',
              trendDir === 'flat' && 'text-slate-500'
            )}
          >
            <TrendIcon className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
