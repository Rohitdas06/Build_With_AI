import React, { useMemo, useRef } from 'react';
import { Shield, Flame, Stethoscope, DoorOpen, ConciergeBell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TeamMember } from '../../types/shers';
import { useGsapEntrance } from '../../hooks/useGsapEntrance';

type RosterDef = { id: string; label: string; icon: LucideIcon; match: (m: TeamMember) => boolean };

const ROSTER: RosterDef[] = [
  { id: 'sec', label: 'Security', icon: Shield, match: (m) => /security/i.test(m.department) || /security/i.test(m.role) },
  { id: 'fire', label: 'Fire safety', icon: Flame, match: (m) => /fire/i.test(m.department) || /fire/i.test(m.role) },
  { id: 'med', label: 'Doctor', icon: Stethoscope, match: (m) => /med|doctor|health/i.test(m.department) || /med|doctor/i.test(m.role) },
  { id: 'evac', label: 'Evacuation crew', icon: DoorOpen, match: (m) => /evac|safety|emergency/i.test(m.department) },
  { id: 'front', label: 'Front desk', icon: ConciergeBell, match: (m) => /front|desk|lobby|reception/i.test(m.department) },
];

function onlineCount(members: TeamMember[]) {
  return members.filter((m) => m.status === 'available' || m.status === 'responding').length;
}

export function TeamRoster({ team }: { team: TeamMember[] }) {
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return ROSTER.map((r) => {
      const members = team.filter(r.match);
      const online = onlineCount(members);
      const total = members.length;
      const active = total > 0 && online > 0;
      return { ...r, online, total, active };
    });
  }, [team]);

  useGsapEntrance(listRef, [], { staggerChildren: true, childStagger: 0.05, from: { autoAlpha: 0, x: -10 }, duration: 0.4 });

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-white/[0.08] bg-slate-900/35 backdrop-blur-xl overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Team roster</h2>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.04] hover:border-cyan-500/15 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Icon className="w-4 h-4 text-cyan-300/70 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{row.label}</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-500">
                  {row.total ? `${row.online}/${row.total} online` : 'Pool standby'}
                </p>
              </div>
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {row.active ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  </>
                ) : (
                  <span className="rounded-full h-2.5 w-2.5 bg-slate-600" />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
