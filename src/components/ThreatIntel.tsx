import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ThreatIntelReport } from '../types/shers';
import { cn } from '../lib/utils';

const riskBar = (score: number) =>
  cn('h-1.5 rounded-full transition-all', score >= 70 ? 'bg-critical' : score >= 40 ? 'bg-urgent' : 'bg-safe');

export function ThreatIntel({ report }: { report: ThreatIntelReport | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState<string | null>(null);

  if (!report) {
    return (
      <div className="rounded border border-panel-border bg-card/80 p-4 text-[10px] text-text-dim uppercase tracking-widest">
        {t('threat.loading', { defaultValue: 'Loading threat analysis…' })}
      </div>
    );
  }

  const overall = report.overallRiskLevel || 'low';
  const banner =
    overall === 'critical'
      ? 'bg-critical/20 border-critical text-critical'
      : overall === 'high'
        ? 'bg-urgent/20 border-urgent text-urgent'
        : overall === 'moderate'
          ? 'bg-info/15 border-info text-info'
          : 'bg-safe/10 border-safe text-safe';

  return (
    <div className="rounded border border-panel-border bg-card overflow-hidden flex flex-col min-h-0">
      <div className={cn('px-3 py-2 text-[10px] font-black uppercase tracking-widest border-b', banner)}>
        {t('threat.overall', { defaultValue: 'Overall risk' })}: {overall} —{' '}
        {report.predictions?.length
          ? t('threat.predictions', { defaultValue: 'Hot spots' })
          : t('threat.allClear', { defaultValue: 'All clear' })}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[140px]">
        {(report.predictions || [])
          .slice()
          .sort((a, b) => b.riskScore - a.riskScore)
          .map((p) => (
            <div key={p.location} className="rounded border border-panel-border/60 bg-bg/50 p-2">
              <button type="button" className="w-full text-left" onClick={() => setOpen(open === p.location ? null : p.location)}>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[11px] font-bold text-text-main truncate">{p.location}</span>
                  <span className="text-[10px] font-mono text-text-dim shrink-0">{p.riskScore}</span>
                </div>
                <div className="mt-1 w-full bg-panel-border/40 rounded-full overflow-hidden">
                  <div className={riskBar(p.riskScore)} style={{ width: `${Math.min(100, p.riskScore)}%` }} />
                </div>
              </button>
              {open === p.location && (
                <div className="mt-2 text-[9px] text-text-dim space-y-1 border-t border-panel-border/40 pt-2">
                  <div className="text-text-main font-bold">{p.primaryThreat}</div>
                  <div>{p.reasoning}</div>
                  <div className="flex flex-wrap gap-1">
                    {(p.contributingFactors || []).map((f) => (
                      <span key={f} className="px-1 py-0.5 rounded bg-panel-border/30 text-[8px] uppercase">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
      {(report.recommendedActions || []).length > 0 && (
        <div className="border-t border-panel-border px-2 py-1.5 text-[9px] text-text-dim bg-panel-border/10">
          <span className="font-bold text-text-main uppercase tracking-tighter">
            {t('threat.recommendations', { defaultValue: 'Recommendations' })}:{' '}
          </span>
          {report.recommendedActions.join(' · ')}
        </div>
      )}
      <div className="text-[8px] text-text-dim/60 px-2 py-1 text-right font-mono">
        {t('threat.updated', { defaultValue: 'Last updated' })}: {new Date(report.analysisTimestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
