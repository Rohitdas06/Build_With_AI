import React from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export function IncidentLog({
  incidents,
  onResolve,
  onAiReport,
}: {
  incidents: any[];
  onResolve: (id: string) => void;
  onAiReport?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const activeOnly = incidents.filter((i) => i.status === 'active' || i.status === 'responding');

  return (
    <div className="flex-1 flex flex-col">
      {activeOnly.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-dim gap-2 p-8 text-center">
          <CheckCircle2 className="w-8 h-8 opacity-20" />
          <div className="text-[10px] uppercase tracking-widest font-bold">{t('status_clear')}</div>
        </div>
      ) : (
        <div className="divide-y divide-panel-border">
          {activeOnly.map((inc) => (
            <div key={inc.id} className="p-[10px_12px] flex items-center gap-2.5 group">
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  inc.severity === 'critical'
                    ? 'bg-critical shadow-[0_0_5px_var(--color-critical)]'
                    : inc.severity === 'urgent'
                      ? 'bg-urgent'
                      : 'bg-info'
                )}
              />

              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-text-main truncate uppercase tracking-tight">
                  {inc.title}: {inc.location}
                </div>
                <div className="text-[11px] text-text-dim mt-0.5">
                  Severity: <span className="uppercase">{inc.severity}</span> | Detected:{' '}
                  {formatDistanceToNow(new Date(inc.detected_at || inc.created_at))} ago
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                {onAiReport && (
                  <button
                    type="button"
                    onClick={() => onAiReport(inc.id)}
                    className="flex items-center gap-1 bg-info/10 border border-info/40 text-info text-[9px] px-2 py-1 rounded font-bold uppercase tracking-tight hover:bg-info/20"
                  >
                    <FileText className="w-3 h-3" />
                    {t('incidents.aiReport', { defaultValue: 'AI Report' })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onResolve(inc.id)}
                  className="bg-transparent border border-panel-border text-text-main text-[10px] p-[4px_8px] hover:bg-panel-border transition-colors rounded"
                >
                  {t('resolve')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
