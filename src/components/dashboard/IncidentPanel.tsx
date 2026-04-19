import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { Activity, Bot, MapPin, UserCircle, Sparkles } from 'lucide-react';
import type { Incident } from '../../types/shers';
import { cn } from '../../lib/utils';
import { useGsapHoverLift } from '../../hooks/useGsapHoverLift';

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === 'active' || s === 'responding'
      ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
      : s === 'resolved'
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
        : 'border-slate-500/40 bg-slate-500/10 text-slate-300';
  return (
    <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border', cls)}>
      {status}
    </span>
  );
}

export function IncidentPanel({
  incident,
  aiRecommendation,
  onResolve,
  onAiReport,
}: {
  incident: Incident | null;
  aiRecommendation: string | null;
  onResolve?: (id: string) => void;
  onAiReport?: (id: string) => void;
}) {
  const hasIncident = Boolean(incident);
  const timelineRef = useRef<HTMLUListElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const resolveBtnRef = useRef<HTMLButtonElement>(null);
  const reportBtnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const ul = timelineRef.current;
    if (!ul || !incident) return;
    const items = gsap.utils.toArray<HTMLElement>(ul.querySelectorAll('li'));
    if (items.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.from(items, {
        autoAlpha: 0,
        x: 10,
        stagger: 0.09,
        duration: 0.38,
        ease: 'power2.out',
        delay: 0.12,
      });
    }, ul);
    return () => ctx.revert();
  }, [incident?.id]);

  useEffect(() => {
    const el = scanRef.current;
    if (!el || hasIncident) return;
    const ctx = gsap.context(() => {
      gsap.to(el, { y: 10, duration: 2.6, ease: 'none', repeat: -1, yoyo: true });
    }, el);
    return () => ctx.revert();
  }, [hasIncident]);

  useGsapHoverLift(resolveBtnRef, { scale: 1.02, y: -1 });
  useGsapHoverLift(reportBtnRef, { scale: 1.02, y: -1 });

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-white/[0.08] bg-slate-900/35 backdrop-blur-xl overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-400/90" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Incident control</h2>
        </div>
        {hasIncident && incident && <StatusBadge status={incident.status} />}
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!hasIncident ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            >
              <div
                ref={scanRef}
                className="absolute inset-0 opacity-30 will-change-transform"
                style={{
                  background:
                    'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(34,211,238,0.06) 8px, rgba(34,211,238,0.06) 9px)',
                }}
              />
              <Sparkles className="w-10 h-10 text-cyan-400/40 mb-4 relative z-10" />
              <p className="text-sm font-semibold text-slate-300 relative z-10">All monitored zones stable</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2 relative z-10">No active command events</p>
            </motion.div>
          ) : (
            incident && (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 overflow-y-auto p-4 space-y-4"
              >
                <div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Current event</p>
                    <p className="text-lg font-bold text-slate-100 leading-tight">{incident.type || incident.title || 'Incident'}</p>
                    <p className="text-xs text-slate-400 mt-1 capitalize">Severity: {incident.severity}</p>
                  </div>

                  {onResolve && onAiReport && incident.status !== 'resolved' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        ref={reportBtnRef}
                        type="button"
                        onClick={() => onAiReport(incident.id)}
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 will-change-transform"
                      >
                        AI report
                      </button>
                      <button
                        ref={resolveBtnRef}
                        type="button"
                        onClick={() => onResolve(incident.id)}
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 will-change-transform"
                      >
                        Resolve
                      </button>
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Affected zone</p>
                      <p className="text-sm font-semibold text-slate-200">{incident.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <UserCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Assigned</p>
                      <p className="text-sm font-semibold text-slate-200">{incident.assigned_to_name || incident.assigned_to || 'Unassigned'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Timeline</p>
                    <ul ref={timelineRef} className="space-y-2 border-l border-cyan-500/25 pl-3 ml-1">
                      {(incident.created_at || incident.detected_at) && (
                        <li className="text-xs text-slate-400">
                          <span className="text-cyan-400/90 font-semibold">Detected</span> —{' '}
                          {new Date(incident.created_at || incident.detected_at!).toLocaleString()}
                        </li>
                      )}
                      {incident.status === 'responding' && (
                        <li className="text-xs text-slate-400">
                          <span className="text-amber-400/90 font-semibold">Response</span> — team engaged
                        </li>
                      )}
                      {incident.resolved_at && (
                        <li className="text-xs text-slate-400">
                          <span className="text-emerald-400/90 font-semibold">Resolved</span> — {new Date(incident.resolved_at).toLocaleString()}
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-cyan-300" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-200/90">AI recommendation</p>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiRecommendation || incident.ai_narrative || 'Awaiting narrative — generate an AI report for deeper guidance.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
