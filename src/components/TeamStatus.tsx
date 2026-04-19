import React from 'react';
import { cn } from '../lib/utils';
import type { TeamMember } from '../types/shers';

const STATUS_OPTIONS: TeamMember['status'][] = ['available', 'responding', 'off_duty', 'break'];

export function TeamStatus({
  team = [],
  currentUserId,
  userRole,
  onStatusChange,
}: {
  team?: TeamMember[];
  activeIncidents: any[];
  currentUserId?: string;
  userRole?: string;
  onStatusChange?: (userId: string, status: string, location?: string) => void;
}) {

  if (!team.length) {
    return (
      <div className="p-3 text-[10px] text-text-dim text-center uppercase tracking-widest">
        Team roster loads after login.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {team.map((m) => {
        const status = m.status || 'available';
        const canEdit = Boolean(onStatusChange && currentUserId && (currentUserId === m.id || userRole === 'admin'));
        return (
          <div key={m.id} className="flex flex-col gap-1 p-1.5 text-xs border-b border-panel-border/40 last:border-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-panel-border/30 border border-panel-border flex items-center justify-center text-[10px] font-bold text-text-dim shrink-0">
                {m.full_name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text-main font-bold truncate tracking-tight">{m.full_name}</div>
                <div className="text-[10px] text-text-dim uppercase">{m.role}</div>
                <div className="text-[9px] text-text-dim/80">{m.current_location || '—'}</div>
              </div>
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  status === 'responding' ? 'bg-urgent ring-2 ring-urgent/20' : 'bg-safe ring-2 ring-safe/20'
                )}
              />
            </div>
            {canEdit && onStatusChange && (
              <select
                className="bg-bg border border-panel-border text-[9px] rounded px-1 py-0.5 text-text-main"
                value={m.status}
                onChange={(e) => onStatusChange(m.id, e.target.value, m.current_location)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
