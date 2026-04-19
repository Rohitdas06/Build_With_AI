import React, { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import gsap from 'gsap';
import { cn } from '../../lib/utils';
import { useGsapHoverLift } from '../../hooks/useGsapHoverLift';

export type ZoneStatus = 'safe' | 'warn' | 'critical';

export function ZoneTile({
  name,
  icon: Icon,
  status,
  hasActiveAlert,
}: {
  name: string;
  icon: LucideIcon;
  status: ZoneStatus;
  hasActiveAlert: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const alertRingRef = useRef<HTMLSpanElement>(null);

  useGsapHoverLift(btnRef, { y: -2, scale: 1.03 });

  useEffect(() => {
    const ring = alertRingRef.current;
    if (!ring || !hasActiveAlert) return;
    const ctx = gsap.context(() => {
      gsap.to(ring, {
        opacity: 0.35,
        boxShadow: '0 0 18px rgba(248, 113, 113, 0.45)',
        duration: 1.15,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, ring);
    return () => ctx.revert();
  }, [hasActiveAlert]);

  const ring =
    status === 'critical'
      ? 'border-red-500/50 shadow-[0_0_20px_-4px_rgba(239,68,68,0.55)]'
      : status === 'warn'
        ? 'border-amber-500/45 shadow-[0_0_16px_-4px_rgba(251,191,36,0.35)]'
        : 'border-emerald-500/30 shadow-[0_0_14px_-6px_rgba(52,211,153,0.25)]';

  const dot =
    status === 'critical' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]' : status === 'warn' ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <button
      ref={btnRef}
      type="button"
      className={cn(
        'relative flex flex-col items-start gap-2 rounded-xl border bg-slate-900/50 backdrop-blur-md p-3 text-left w-full will-change-transform',
        ring,
        hasActiveAlert && 'animate-pulse-border'
      )}
    >
      {hasActiveAlert && (
        <span
          ref={alertRingRef}
          className="absolute inset-0 rounded-xl border-2 border-red-500/60 pointer-events-none opacity-80"
        />
      )}
      <div className="flex w-full items-center justify-between gap-2">
        <Icon className="w-5 h-5 text-cyan-300/80" strokeWidth={1.5} />
        <span className={cn('h-2 w-2 rounded-full shrink-0', dot)} />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{name}</span>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
        {status === 'critical' ? 'Alert' : status === 'warn' ? 'Elevated' : 'Stable'}
      </span>
    </button>
  );
}
