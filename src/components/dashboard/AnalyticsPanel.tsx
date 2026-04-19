import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { api } from '../../api/client';
import type { AnalyticsData, Incident } from '../../types/shers';
import { useGsapEntrance } from '../../hooks/useGsapEntrance';

export function AnalyticsPanel({ incidents }: { incidents: Incident[] }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.getAnalytics();
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incidents.length]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el || data) return;
    const ctx = gsap.context(() => {
      gsap.to(el, { rotation: 360, duration: 0.85, repeat: -1, ease: 'none' });
    }, el);
    return () => ctx.revert();
  }, [data]);

  useGsapEntrance(panelRef, [data ? 'ready' : 'pending'], {
    from: { autoAlpha: 0, y: 12 },
    duration: 0.48,
    ease: 'power2.out',
  });

  const responseTrend = useMemo(() => {
    const days = data?.byDay?.slice(-7) || [];
    return days.map((d) => ({
      name: d.date?.slice(5) || '',
      count: d.count,
    }));
  }, [data]);

  if (!data) {
    return (
      <div className="flex flex-col h-full min-h-0 rounded-xl border border-white/[0.08] bg-slate-900/35 backdrop-blur-xl items-center justify-center p-4">
        <div
          ref={loaderRef}
          className="h-8 w-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 will-change-transform"
        />
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-3">Loading analytics</p>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="flex flex-col h-full min-h-0 rounded-xl border border-white/[0.08] bg-slate-900/35 backdrop-blur-xl overflow-hidden"
    >
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Analytics</h2>
        <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Performance & response</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 py-2">
            <p className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Avg resp</p>
            <p className="text-lg font-black text-emerald-200 tabular-nums">{data.avgResponseTimeMinutes}m</p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 py-2">
            <p className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Resolved</p>
            <p className="text-lg font-black text-amber-200 tabular-nums">{data.resolvedToday}</p>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 py-2">
            <p className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Total</p>
            <p className="text-lg font-black text-cyan-200 tabular-nums">{incidents.length}</p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 h-[120px]">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 px-1">Incident volume</p>
          <ResponsiveContainer width="100%" height="92%">
            <AreaChart data={responseTrend}>
              <defs>
                <linearGradient id="volCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8, fontSize: 11 }}
              />
              <Area type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} fill="url(#volCyan)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-2 h-[100px]">
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 px-1">By severity</p>
          <ResponsiveContainer width="100%" height="78%">
            <BarChart data={data.bySeverity}>
              <XAxis dataKey="severity" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(248,113,113,0.2)', fontSize: 11 }} />
              <Bar dataKey="count" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
