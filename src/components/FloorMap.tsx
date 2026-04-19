import React from 'react';
import { cn } from '../lib/utils';

export function FloorMap({
  activeIncidents,
  riskByLocation = {},
  heatmapEnabled = false,
}: {
  activeIncidents: any[];
  riskByLocation?: Record<string, number>;
  heatmapEnabled?: boolean;
}) {
  const zones = [
    { id: 'Gym', label: 'GYM' },
    { id: 'Pool', label: 'POOL' },
    { id: 'Kitchen', label: 'KITCHEN' },
    { id: 'Restaurant', label: 'RESTAURANT' },
    { id: 'Floor 2', label: 'FLOOR 2' },
    { id: 'Floor 3', label: 'FLOOR 3' },
    { id: 'Floor 4', label: 'FLOOR 4' },
    { id: 'Floor 5', label: 'FLOOR 5' },
    { id: 'Lobby', label: 'LOBBY' },
    { id: 'Floor 6', label: 'FLOOR 6' },
    { id: 'Floor 7', label: 'FLOOR 7' },
    { id: 'Floor 8', label: 'FLOOR 8' },
  ];

  const riskForZone = (zoneId: string) => {
    if (riskByLocation[zoneId] != null) return riskByLocation[zoneId];
    const k = Object.keys(riskByLocation).find((loc) => loc.includes(zoneId) || zoneId.includes(loc));
    return k ? riskByLocation[k] : 0;
  };

  const getZoneStatus = (zoneId: string) => {
    const incident = activeIncidents.find((inc) => inc.location === zoneId);
    if (!incident) return 'safe';
    if (incident.severity === 'critical') return 'danger';
    if (incident.severity === 'urgent') return 'warn';
    return 'evac';
  };

  return (
    <div className="w-full h-full p-1 bg-[#0d1117] grid grid-cols-4 grid-rows-3 gap-1">
      {zones.map((zone) => {
        const status = getZoneStatus(zone.id);
        const activeIncident = activeIncidents.find((inc) => inc.location === zone.id);
        const rs = heatmapEnabled ? riskForZone(zone.id) : 0;
        const heatGlow =
          heatmapEnabled && rs >= 70
            ? 'ring-2 ring-critical shadow-[0_0_14px_rgba(248,81,73,0.45)]'
            : heatmapEnabled && rs >= 40
              ? 'ring-2 ring-urgent shadow-[0_0_10px_rgba(210,153,34,0.35)]'
              : heatmapEnabled && rs > 0
                ? 'ring-1 ring-safe/40'
                : '';

        return (
          <div
            key={zone.id}
            className={cn(
              'border flex flex-col items-center justify-center p-2 text-center transition-all duration-300 relative',
              status === 'safe' && 'border-panel-border bg-[#eaf3de]/5 text-text-dim',
              status === 'danger' && 'bg-critical/15 border-critical text-critical font-bold pulse-danger',
              status === 'warn' && 'bg-urgent/10 border-urgent text-urgent',
              status === 'evac' && 'bg-info/10 border-info text-info',
              heatGlow
            )}
          >
            {heatmapEnabled && rs > 0 && (
              <div
                className={cn(
                  'absolute inset-0 rounded pointer-events-none opacity-25',
                  rs >= 70 ? 'bg-critical' : rs >= 40 ? 'bg-urgent' : 'bg-safe'
                )}
              />
            )}
            <div className="text-[10px] uppercase tracking-widest leading-none mb-1 opacity-70 relative z-[1]">{zone.label}</div>
            {activeIncident && (
              <div className="text-[8px] uppercase tracking-tight leading-tight relative z-[1]">
                {(activeIncident.title || '').split(':')[1]?.trim() || activeIncident.title}
              </div>
            )}
            {heatmapEnabled && rs > 0 && (
              <div className="text-[8px] font-mono text-text-dim mt-0.5 relative z-[1]">R:{Math.round(rs)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
