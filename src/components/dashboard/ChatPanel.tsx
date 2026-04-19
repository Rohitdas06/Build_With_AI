import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Send } from 'lucide-react';
import { api } from '../../api/client';
import type { Message } from '../../types/shers';
import { cn } from '../../lib/utils';
import { useGsapHoverLift } from '../../hooks/useGsapHoverLift';
import { useGsapEntrance } from '../../hooks/useGsapEntrance';

export type CommsChannel = 'admin' | 'staff' | 'security';

const TABS: { id: CommsChannel; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'staff', label: 'Staff' },
  { id: 'security', label: 'Security' },
];

export function ChatPanel({
  username,
  channel,
  onChannelChange,
  messages,
  onMessagesRefresh,
}: {
  username: string;
  channel: CommsChannel;
  onChannelChange: (c: CommsChannel) => void;
  messages: Message[];
  onMessagesRefresh: () => void;
}) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const typingRef = useRef<HTMLDivElement>(null);
  const prevHeadId = useRef<string | undefined>(undefined);

  useEffect(() => {
    prevHeadId.current = undefined;
  }, [channel]);

  const rootRef = useRef<HTMLDivElement>(null);
  useGsapEntrance(rootRef, [], { from: { autoAlpha: 0, y: 10 }, duration: 0.4, delay: 0.05 });

  useGsapHoverLift(sendBtnRef, { scale: 1.06, y: -1 });

  useLayoutEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const active = bar.querySelector<HTMLElement>('[data-active-tab="true"]');
    if (!active) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(active, { scale: 0.96, autoAlpha: 0.88 }, { scale: 1, autoAlpha: 1, duration: 0.26, ease: 'power2.out' });
    }, bar);
    return () => ctx.revert();
  }, [channel]);

  useEffect(() => {
    const head = messages[0]?.id;
    if (!head || head === prevHeadId.current) return;
    prevHeadId.current = head;
    const row = scrollRef.current?.querySelector<HTMLElement>(`[data-msg-id="${head}"]`);
    if (!row) return;
    const ctx = gsap.context(() => {
      gsap.from(row, { autoAlpha: 0, y: 10, duration: 0.32, ease: 'power2.out' });
    }, row);
    return () => ctx.revert();
  }, [messages]);

  useEffect(() => {
    const wrap = typingRef.current;
    if (!wrap || !sending) return;
    const dots = wrap.querySelectorAll<HTMLElement>('.typing-dot');
    if (dots.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.to(dots, {
        y: -3,
        opacity: 0.35,
        duration: 0.45,
        stagger: 0.12,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, wrap);
    return () => ctx.revert();
  }, [sending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [messages, channel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const msgType = 'staff';
      await api.sendMessage(input.trim(), channel, msgType);
      setInput('');
      onMessagesRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const bubbleStyle = (msg: Message) => {
    const t = msg.msg_type || 'staff';
    if (t === 'auto' || t === 'system')
      return 'border-red-500/30 bg-red-500/10 text-red-100/95 ml-4 border-l-2 border-l-red-400';
    if (channel === 'security' || /security/i.test(msg.sender || '') || /security/i.test(msg.sender_name || ''))
      return 'border-amber-500/25 bg-amber-500/10 text-amber-50 mr-4';
    return 'border-cyan-500/20 bg-cyan-500/5 text-slate-100 mr-4';
  };

  return (
    <div ref={rootRef} className="flex flex-col h-full min-h-0 rounded-xl border border-white/[0.08] bg-slate-900/35 backdrop-blur-xl overflow-hidden">
      <div className="shrink-0 px-2 pt-2 pb-0 border-b border-white/[0.06]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 pb-2">Live communications</p>
        <div ref={tabBarRef} className="flex gap-1 p-1 rounded-lg bg-black/25 border border-white/[0.06]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              data-active-tab={channel === t.id ? 'true' : 'false'}
              onClick={() => onChannelChange(t.id)}
              className={cn(
                'flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-colors duration-200',
                channel === t.id
                  ? 'bg-cyan-500/20 text-cyan-100 shadow-[0_0_12px_-4px_rgba(34,211,238,0.5)]'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 flex flex-col-reverse gap-2 min-h-0">
        {sending && (
          <div ref={typingRef} className="flex gap-1.5 px-2 py-1 justify-end">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400/80 will-change-transform" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400/80 will-change-transform" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-cyan-400/80 will-change-transform" />
          </div>
        )}
        {messages.slice(0, 80).map((msg) => {
          const label = msg.sender_name || msg.sender || username;
          return (
            <div key={msg.id} data-msg-id={msg.id} className={cn('rounded-lg border px-3 py-2 text-left', bubbleStyle(msg))}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
              <div className="text-xs leading-snug">{msg.content}</div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => void handleSend(e)} className="shrink-0 p-2 border-t border-white/[0.06] flex gap-2 bg-black/20">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${channel}…`}
          className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
        />
        <button
          ref={sendBtnRef}
          type="submit"
          disabled={sending}
          className="shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-cyan-100 hover:bg-cyan-500/25 transition-colors disabled:opacity-50 will-change-transform"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
