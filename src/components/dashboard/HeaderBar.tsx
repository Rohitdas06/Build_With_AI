import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Radio, Shield, Wifi, WifiOff, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import type { User } from '../../types/shers';
import { getNormalizedLanguage, LOCALE_LABELS, SUPPORTED_LOCALES } from '../../i18n';
import { cn } from '../../lib/utils';
import { useGsapEntrance } from '../../hooks/useGsapEntrance';
import { useGsapHoverLift } from '../../hooks/useGsapHoverLift';

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-sm sm:text-base text-cyan-100/90 tabular-nums tracking-tight">
        {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </span>
      <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500">{tz}</span>
    </div>
  );
}

export function HeaderBar({
  user,
  onLogout,
  wsStatus,
}: {
  user: User;
  onLogout: () => void;
  wsStatus: 'connecting' | 'open' | 'closed';
}) {
  const { i18n } = useTranslation();
  const headerRef = useRef<HTMLElement>(null);
  const logoutRef = useRef<HTMLButtonElement>(null);
  const systemDotRef = useRef<HTMLSpanElement>(null);

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const roleTone =
    user.role === 'admin'
      ? 'border-violet-500/40 text-violet-200 bg-violet-500/10'
      : user.role === 'security'
        ? 'border-amber-500/40 text-amber-200 bg-amber-500/10'
        : 'border-cyan-500/35 text-cyan-100 bg-cyan-500/10';

  useGsapEntrance(headerRef, [], { from: { autoAlpha: 0, y: -16 }, duration: 0.55, ease: 'power3.out' });

  useGsapHoverLift(logoutRef, { y: -1, scale: 1.03 });

  useEffect(() => {
    const dot = systemDotRef.current;
    if (!dot) return;
    const ctx = gsap.context(() => {
      gsap.to(dot, {
        scale: 1.22,
        opacity: 0.88,
        duration: 0.85,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, dot);
    return () => ctx.revert();
  }, []);

  return (
    <header ref={headerRef} className="shrink-0 border-b border-white/[0.08] bg-slate-950/40 backdrop-blur-xl px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-lg sm:text-xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-300">
                SHERS
              </span>
              <div className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span
                  ref={systemDotRef}
                  className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] origin-center"
                />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/90">System active</span>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 hidden md:block" />

          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={getNormalizedLanguage()}
              onChange={(e) => void i18n.changeLanguage(e.target.value)}
              className="bg-transparent text-[10px] font-semibold text-slate-300 outline-none cursor-pointer uppercase tracking-tight"
            >
              {SUPPORTED_LOCALES.map((code) => (
                <option key={code} value={code} className="bg-slate-900">
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 flex justify-center order-last md:order-none w-full md:w-auto">
          <LiveClock />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className={cn('hidden sm:inline text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border', roleTone)}>
            {roleLabel}
          </span>

          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <span
              className={cn(
                'flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider',
                wsStatus === 'open' ? 'text-emerald-300' : 'text-amber-400/90'
              )}
              title="Command link"
            >
              {wsStatus === 'open' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{wsStatus === 'open' ? 'Net' : 'Net'}</span>
            </span>
            <span className="flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-300/90">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sec</span>
            </span>
            <span className="flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <Radio className="w-3.5 h-3.5" />
            </span>
          </div>

          <button
            ref={logoutRef}
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-200 hover:bg-red-500/20 hover:border-red-400/50 transition-colors will-change-transform"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="sm:hidden mt-2 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/90">System active</span>
      </div>
    </header>
  );
}
