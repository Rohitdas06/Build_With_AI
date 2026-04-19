import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import type { AnalyticsData } from '../types/shers';

const COLORS = ['#f85149', '#d29922', '#388bfd', '#8b949e', '#3fb950', '#a371f7'];

export function Analytics({ incidents }: { incidents: any[] }) {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);

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

  const heatGrid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    (data?.byHour || []).forEach((h) => {
      const d = Math.min(6, Math.max(0, h.day));
      const hr = Math.min(23, Math.max(0, h.hour));
      g[d][hr] += h.count;
    });
    const max = Math.max(1, ...g.flat());
    return { g, max };
  }, [data]);

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] text-text-dim uppercase tracking-widest">
        {t('analytics')}…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 overflow-y-auto min-h-0">
      <div className="grid grid-cols-2 gap-2 shrink-0" style={{ minHeight: 120 }}>
        <div className="rounded border border-panel-border bg-bg/40 p-1 min-h-[110px]">
          <div className="text-[8px] text-text-dim uppercase font-bold mb-1 px-1">{t('severity.critical', { defaultValue: 'By severity' })}</div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data.bySeverity}>
              <XAxis dataKey="severity" tick={{ fontSize: 8, fill: '#8b949e' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', fontSize: 10 }} />
              <Bar dataKey="count" fill="#f85149" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded border border-panel-border bg-bg/40 p-1 min-h-[110px]">
          <div className="text-[8px] text-text-dim uppercase font-bold mb-1 px-1">14d trend</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={data.byDay}>
              <XAxis dataKey="date" tick={{ fontSize: 7, fill: '#8b949e' }} interval="preserveStartEnd" />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', fontSize: 10 }} />
              <Line type="monotone" dataKey="count" stroke="#388bfd" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded border border-panel-border bg-bg/40 p-1 shrink-0" style={{ minHeight: 110 }}>
        <div className="text-[8px] text-text-dim uppercase font-bold mb-1 px-1">Locations</div>
        <ResponsiveContainer width="100%" height={90}>
          <PieChart>
            <Pie data={data.byLocation} dataKey="count" nameKey="location" cx="50%" cy="50%" outerRadius={36} label={false}>
              {data.byLocation.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded border border-panel-border bg-bg/40 p-1 flex-1 min-h-[72px] overflow-hidden">
        <div className="text-[8px] text-text-dim uppercase font-bold mb-1 px-1">Hour × day</div>
        <div className="flex flex-col gap-px max-h-[72px] overflow-hidden">
          {heatGrid.g.map((row, di) => (
            <div key={di} className="grid gap-px flex-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0,1fr))' }}>
              {row.map((v, hi) => (
                <div
                  key={`${di}-${hi}`}
                  className={cn('min-h-[6px] rounded-[1px]', v === 0 ? 'bg-panel-border/20' : '')}
                  style={
                    v > 0
                      ? {
                          background: `rgba(248, 81, 73, ${0.15 + (v / heatGrid.max) * 0.85})`,
                        }
                      : undefined
                  }
                  title={`d${di} h${hi}: ${v}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="text-[9px] text-text-dim border-t border-panel-border pt-1 flex justify-between font-bold uppercase shrink-0">
        <span>
          {t('total_incidents')}: {incidents.length}
        </span>
        <span>avg {data.avgResponseTimeMinutes}m</span>
        <span>done today {data.resolvedToday}</span>
      </div>
    </div>
  );
}
