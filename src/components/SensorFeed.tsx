import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SensorEvent } from '../types/shers';
import { cn } from '../lib/utils';

export function SensorFeed({ events }: { events: SensorEvent[] }) {
  const { t } = useTranslation();
  const rows = events.slice(0, 20);

  return (
    <div className="flex flex-col min-h-0 border border-panel-border rounded bg-card overflow-hidden">
      <div className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-text-dim border-b border-panel-border bg-panel-border/20">
        {t('sensor.feed', { defaultValue: 'Live sensors' })}
      </div>
      <div className="flex-1 overflow-y-auto text-[9px] font-mono">
        {rows.length === 0 ? (
          <div className="p-3 text-text-dim text-center uppercase tracking-widest">
            {t('sensor.none', { defaultValue: 'No readings yet' })}
          </div>
        ) : (
          <table className="w-full text-left">
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-panel-border/40">
                  <td className="p-1.5 text-text-dim whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString()}</td>
                  <td className="p-1.5 text-text-main truncate max-w-[72px]">{e.location}</td>
                  <td className="p-1.5 text-text-dim">{e.sensor_type}</td>
                  <td className="p-1.5 text-right">
                    {e.value} {e.unit}
                  </td>
                  <td className="p-1.5">
                    <span
                      className={cn(
                        'px-1 rounded text-[8px] font-bold uppercase',
                        e.alert_level === 'critical' && 'bg-critical/20 text-critical',
                        e.alert_level === 'warning' && 'bg-urgent/15 text-urgent',
                        e.alert_level === 'normal' && 'bg-safe/10 text-safe'
                      )}
                    >
                      {e.alert_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
