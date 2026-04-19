import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { useTranslation } from 'react-i18next';
import { GuestChatbot } from './GuestChatbot';
import { ThreatIntel } from './ThreatIntel';
import { NarrativeModal } from './NarrativeModal';
import { SensorFeed } from './SensorFeed';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import type { User, ThreatIntelReport, SensorEvent, TeamMember, Message, Incident, SensorAlertToast } from '../types/shers';
import { DashboardLayout } from './dashboard/DashboardLayout';
import { HeaderBar } from './dashboard/HeaderBar';
import { StatCard } from './dashboard/StatCard';
import { ZoneTile } from './dashboard/ZoneTile';
import { IncidentPanel } from './dashboard/IncidentPanel';
import { TeamRoster } from './dashboard/TeamRoster';
import { ChatPanel, type CommsChannel } from './dashboard/ChatPanel';
import { AnalyticsPanel } from './dashboard/AnalyticsPanel';
import { TACTICAL_ZONES, zoneStatusFor } from './dashboard/tacticalZones';
import { useGsapEntrance } from '../hooks/useGsapEntrance';
import { useGsapHoverLift } from '../hooks/useGsapHoverLift';

const COMMS_CHANNELS: CommsChannel[] = ['admin', 'staff', 'security'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseIncidentFromWs(raw: unknown): Incident | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  return raw as unknown as Incident;
}

function parseMessageFromWs(raw: unknown): Message | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.content !== 'string') return null;
  return raw as unknown as Message;
}

function parseSensorEvent(raw: unknown): SensorEvent | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  return raw as unknown as SensorEvent;
}

function toastId(): string {
  return crypto.randomUUID().slice(0, 10);
}

function sensorToastFromEvent(ev: Record<string, unknown>): SensorAlertToast {
  const sev = ev.severity;
  const severity: SensorAlertToast['severity'] =
    sev === 'critical' ? 'critical' : sev === 'urgent' ? 'urgent' : 'info';
  return {
    id: toastId(),
    sensor: typeof ev.sensor === 'string' ? ev.sensor : undefined,
    title: typeof ev.title === 'string' ? ev.title : 'Sensor alert',
    location: typeof ev.location === 'string' ? ev.location : '',
    severity,
  };
}

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [commsChannel, setCommsChannel] = useState<CommsChannel>('staff');
  const [commsMessages, setCommsMessages] = useState<Message[]>([]);
  const [sensorEvents, setSensorEvents] = useState<SensorEvent[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [threatReport, setThreatReport] = useState<ThreatIntelReport | null>(null);
  const [toasts, setToasts] = useState<SensorAlertToast[]>([]);
  const [narrativeIncidentId, setNarrativeIncidentId] = useState<string | null>(null);
  const { lastEvent, status: wsStatus } = useWebSocket();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const threatWrapRef = useRef<HTMLDivElement>(null);
  const floorPanelRef = useRef<HTMLDivElement>(null);
  const incidentWrapRef = useRef<HTMLDivElement>(null);
  const sensorStripRef = useRef<HTMLDivElement>(null);
  const bottomGridRef = useRef<HTMLDivElement>(null);
  const demoBtnRef = useRef<HTMLButtonElement>(null);
  const guestBtnRef = useRef<HTMLButtonElement>(null);

  useGsapEntrance(threatWrapRef, [], { from: { autoAlpha: 0, y: -8 }, duration: 0.4, delay: 0.04 });
  useGsapEntrance(floorPanelRef, [], { from: { autoAlpha: 0, y: 14 }, duration: 0.5, delay: 0.08 });
  useGsapEntrance(incidentWrapRef, [], { from: { autoAlpha: 0, x: 18 }, duration: 0.5, delay: 0.12 });
  useGsapEntrance(sensorStripRef, [], { from: { autoAlpha: 0, y: 8 }, duration: 0.4, delay: 0.14 });
  useGsapEntrance(bottomGridRef, [], { staggerChildren: true, childStagger: 0.06, from: { autoAlpha: 0, y: 12 }, duration: 0.42, delay: 0.16 });

  useGsapHoverLift(demoBtnRef, { y: -3, scale: 1.05 });
  useGsapHoverLift(guestBtnRef, { scale: 1.06, y: -2 });

  const refreshTeam = useCallback(async () => {
    try {
      const tdata = await api.getTeam();
      setTeam(tdata || []);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshComms = useCallback(async () => {
    try {
      const rows = await api.getMessages(commsChannel);
      setCommsMessages(rows || []);
    } catch {
      setCommsMessages([]);
    }
  }, [commsChannel]);

  useEffect(() => {
    const init = async () => {
      try {
        const [inc, sens] = await Promise.all([api.getIncidents(), api.getRecentSensors()]);
        setIncidents(inc || []);
        setSensorEvents(sens || []);
        await refreshTeam();
        try {
          const tr = await api.getLatestThreatIntel();
          setThreatReport(tr);
        } catch {
          setThreatReport(null);
        }
      } catch (err) {
        console.error('Initial fetch failed:', err);
      }
    };
    void init();
  }, [refreshTeam]);

  useEffect(() => {
    void refreshComms();
  }, [refreshComms]);

  useEffect(() => {
    if (!lastEvent || typeof lastEvent !== 'object') return;
    const ev = lastEvent as Record<string, unknown>;

    if (ev.type === 'INCIDENT_NEW' || ev.event === 'new_incident') {
      const raw = ev.payload ?? ev.incident;
      const inc = parseIncidentFromWs(raw);
      if (!inc) return;
      setIncidents((prev) => {
        if (prev.some((i) => i.id === inc.id)) return prev;
        return [inc, ...prev];
      });
    } else if (ev.type === 'INCIDENT_UPDATED' || ev.event === 'incident_resolved') {
      const payload = isRecord(ev.payload) ? ev.payload : null;
      const id = typeof payload?.id === 'string' ? payload.id : typeof ev.incident_id === 'string' ? ev.incident_id : undefined;
      const full = payload && typeof payload.id === 'string' ? parseIncidentFromWs(payload) : null;
      if (full) {
        setIncidents((prev) => prev.map((i) => (i.id === full.id ? { ...i, ...full } : i)));
      } else if (id) {
        setIncidents((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: 'resolved' as const, resolved_at: new Date().toISOString() } : i))
        );
      }
    } else if (ev.type === 'NEW_MESSAGE' || ev.event === 'new_message') {
      const raw = ev.payload ?? ev.message;
      const msg = parseMessageFromWs(raw);
      if (!msg) return;
      const ch = typeof msg.channel === 'string' && msg.channel.length > 0 ? msg.channel : 'general';
      if (COMMS_CHANNELS.includes(ch as CommsChannel) && ch === commsChannel) {
        setCommsMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [msg, ...prev.slice(0, 99)];
        });
      }
    } else if (ev.type === 'SENSOR_UPDATE') {
      const se = parseSensorEvent(ev.payload);
      if (!se) return;
      setSensorEvents((prev) => [se, ...prev].slice(0, 50));
    } else if (ev.event === 'sensor_alert' && isRecord(ev)) {
      addToast(sensorToastFromEvent(ev));
    } else if (ev.type === 'THREAT_UPDATE') {
      const tr = ev.payload as ThreatIntelReport;
      setThreatReport(tr);
      if (tr?.overallRiskLevel === 'critical' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('SHERS', { body: 'Critical threat assessment update' });
      }
    } else if (ev.type === 'TEAM_STATUS_UPDATE') {
      void refreshTeam();
    }
  }, [lastEvent, refreshTeam, commsChannel]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  const addToast = (toast: SensorAlertToast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== toast.id));
    }, 5000);
  };

  const resolveIncident = async (id: string) => {
    try {
      await api.patch(`/api/incidents/${id}/resolve`, {});
    } catch (err) {
      console.error(err);
    }
  };

  const activeIncidents = useMemo(() => incidents.filter((i) => i.status === 'active' || i.status === 'responding'), [incidents]);

  const primaryIncident = activeIncidents[0] ?? null;

  const staffOnline = useMemo(
    () => team.filter((m) => m.status === 'available' || m.status === 'responding').length,
    [team]
  );

  const avgResponseMin = useMemo(() => {
    const resolved = incidents.filter((i) => i.status === 'resolved' && i.response_time_seconds);
    if (!resolved.length) return 0;
    return Math.round(resolved.reduce((a, i) => a + (i.response_time_seconds || 0), 0) / resolved.length / 60);
  }, [incidents]);

  const riskByLocation = useMemo(() => {
    const m: Record<string, number> = {};
    (threatReport?.predictions || []).forEach((p) => {
      m[p.location] = Math.max(m[p.location] || 0, p.riskScore);
    });
    return m;
  }, [threatReport]);

  const aiRec = useMemo(() => {
    const first = threatReport?.recommendedActions?.[0];
    return first || null;
  }, [threatReport]);

  const pulseDemo = () => {
    const el = demoBtnRef.current;
    if (!el) return;
    gsap.fromTo(el, { scale: 1 }, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' });
  };

  const pulseGuest = () => {
    const el = guestBtnRef.current;
    if (!el) return;
    gsap.fromTo(el, { scale: 1 }, { scale: 0.92, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' });
  };

  const runDemo = async () => {
    const ch: CommsChannel = 'staff';
    const post = (sender: string, content: string, msg_type = 'staff') =>
      api.post('/api/messages', { sender, content, msg_type, channel: ch });
    const fire = await api.createIncident({ type: 'Fire detected', location: 'Kitchen', severity: 'critical' });
    setTimeout(() => void post('SHERS AI', 'Smoke confirmed in Kitchen. Confidence 97%.', 'auto'), 2000);
    setTimeout(() => void post('Fire Safety Team', 'Responding now. En route.', 'staff'), 4000);
    setTimeout(() => void post('Auto-dispatch', 'Fire dept notified. ETA 4 min.', 'auto'), 6000);
    setTimeout(() => void api.createIncident({ type: 'Medical standby', location: 'Lobby', severity: 'urgent' }), 9000);
    setTimeout(() => void post('Front Desk', 'Guests being directed to assembly point.', 'staff'), 14000);
    setTimeout(() => void resolveIncident(fire.id), 20000);
  };

  return (
    <DashboardLayout>
      <HeaderBar user={user} onLogout={onLogout} wsStatus={wsStatus} />

      <div ref={threatWrapRef} className="shrink-0 px-4 sm:px-6 pt-3">
        <ThreatIntel report={threatReport} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 sm:px-6 py-4">
        <StatCard
          label="Active alerts"
          value={activeIncidents.length}
          accent="red"
          trend={activeIncidents.length ? 'Live' : 'Clear'}
          trendDir={activeIncidents.length ? 'up' : 'flat'}
          pulse={activeIncidents.length > 0}
          entranceIndex={0}
        />
        <StatCard label="Avg response (min)" value={avgResponseMin} accent="cyan" trend="Rolling" trendDir="flat" entranceIndex={1} />
        <StatCard
          label="Staff online"
          value={staffOnline}
          accent="green"
          trend={team.length ? `of ${team.length}` : '—'}
          trendDir="flat"
          entranceIndex={2}
        />
        <StatCard label="Total incidents" value={incidents.length} accent="amber" trend="Log" trendDir="flat" entranceIndex={3} />
      </div>

      <div className="flex-1 min-h-0 px-4 sm:px-6 pb-3 flex flex-col gap-3 overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-3 flex-1 min-h-0">
          <div
            ref={floorPanelRef}
            className="flex flex-col min-h-0 rounded-xl border border-white/[0.08] bg-slate-900/30 backdrop-blur-xl overflow-hidden"
          >
            <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Tactical floor map</h2>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">Zones</span>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 overflow-y-auto min-h-[220px]">
              {TACTICAL_ZONES.map((zone) => {
                const { status, hasActiveAlert } = zoneStatusFor(zone, activeIncidents, riskByLocation);
                return (
                  <div key={zone.id}>
                    <ZoneTile name={zone.name} icon={zone.icon} status={status} hasActiveAlert={hasActiveAlert} />
                  </div>
                );
              })}
            </div>
          </div>

          <div ref={incidentWrapRef} className="min-h-[280px] xl:min-h-0">
            <IncidentPanel
              incident={primaryIncident}
              aiRecommendation={aiRec}
              onResolve={resolveIncident}
              onAiReport={(id) => setNarrativeIncidentId(id)}
            />
          </div>
        </div>

        <div ref={sensorStripRef} className="shrink-0 rounded-xl border border-white/[0.06] overflow-hidden bg-slate-950/40">
          <SensorFeed events={sensorEvents} />
        </div>

        <div ref={bottomGridRef} className="grid grid-cols-1 lg:grid-cols-[minmax(200px,260px)_1fr_minmax(240px,300px)] gap-3 flex-1 min-h-[320px] max-h-[420px] lg:max-h-none lg:flex-1">
          <TeamRoster team={team} />
          <ChatPanel
            username={user.username}
            channel={commsChannel}
            onChannelChange={setCommsChannel}
            messages={commsMessages}
            onMessagesRefresh={() => void refreshComms()}
          />
          <AnalyticsPanel incidents={incidents} />
        </div>
      </div>

      <button
        ref={demoBtnRef}
        type="button"
        onClick={() => {
          pulseDemo();
          void runDemo();
        }}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-red-500/50 bg-gradient-to-r from-red-600/90 to-red-700/90 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_0_28px_-4px_rgba(239,68,68,0.65)] hover:shadow-[0_0_36px_-2px_rgba(239,68,68,0.85)] will-change-transform"
      >
        {t('demo_mode', { defaultValue: 'Run live demo scenario' })}
      </button>

      <GuestChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      <button
        ref={guestBtnRef}
        type="button"
        onClick={() => {
          pulseGuest();
          setIsChatOpen(true);
        }}
        className="fixed bottom-5 right-[13.5rem] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/40 bg-slate-900/90 text-cyan-200 shadow-[0_0_20px_-4px_rgba(34,211,238,0.45)] hover:bg-slate-800 transition-colors will-change-transform"
        aria-label="Guest assist"
      >
        <BellRing className="w-5 h-5" />
      </button>

      <NarrativeModal incidentId={narrativeIncidentId} onClose={() => setNarrativeIncidentId(null)} />

      <div className="fixed top-[72px] right-4 z-50 flex flex-col gap-2 max-w-[min(100vw-2rem,20rem)]">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className={cn(
                'w-full bg-slate-900/95 backdrop-blur-xl border p-3 shadow-2xl rounded-lg flex flex-col gap-1',
                toast.severity === 'critical'
                  ? 'border-red-500/50 ring-1 ring-red-500/20'
                  : toast.severity === 'urgent'
                    ? 'border-amber-500/45 ring-1 ring-amber-500/15'
                    : 'border-emerald-500/30 ring-1 ring-emerald-500/10'
              )}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{toast.sensor ?? 'Sensor'} signal</span>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== toast.id))}
                  className="text-slate-500 hover:text-white leading-none"
                >
                  ×
                </button>
              </div>
              <div className="font-bold text-xs text-slate-100">{toast.title}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{toast.location}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
