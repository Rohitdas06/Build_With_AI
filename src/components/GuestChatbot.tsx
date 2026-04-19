import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { cn } from '../lib/utils';

type ChatLine = { role: 'user' | 'model'; text: string; time: Date };

export function GuestChatbot({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [input, setInput] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useMemo(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), []);

  useEffect(() => {
    if (isOpen && lines.length === 0) {
      setLines([
        {
          role: 'model',
          text: t('chatbot.greeting', { defaultValue: 'I am ARIA. How can I help you stay safe today?' }),
          time: new Date(),
        },
      ]);
    }
  }, [isOpen, lines.length, t]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, loading]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    const prefix = room.trim() ? `[Room ${room.trim()}] ` : '';
    const outgoing = prefix + msg.trim();
    const historyPayload = lines.map((l) => ({ role: l.role, content: l.text }));
    setLines((prev) => [...prev, { role: 'user', text: outgoing, time: new Date() }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendGuestMessage(outgoing, sessionId, historyPayload);
      setLines((prev) => [
        ...prev,
        {
          role: 'model',
          text: res.reply + (res.escalated ? '\n\n' + t('chatbot.escalated', { defaultValue: 'Staff have been notified.' }) : ''),
          time: new Date(),
        },
      ]);
    } catch {
      setLines((prev) => [
        ...prev,
        { role: 'model', text: t('chatbot.error', { defaultValue: 'Unable to reach assistant. Try again.' }), time: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    t('emergency_dial', { defaultValue: 'In emergency, dial 0' }).split(',')[0],
    t('floor_map', { defaultValue: 'Floor map' }).split(':')[0],
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, x: 20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.95, opacity: 0, x: 20 }}
            className="fixed right-6 top-6 bottom-6 w-full max-w-sm bg-[#0a0d11] border border-panel-border/50 z-[70] flex flex-col shadow-2xl overflow-hidden rounded-sm ring-1 ring-text-dim/10"
          >
            <div className="p-3 bg-[#010409] border-b border-panel-border/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-info opacity-80" />
                <div>
                  <div className="text-[10px] font-black tracking-[0.2em] text-text-main">ARIA · Guest SOS</div>
                  <div className="text-[8px] text-text-dim uppercase font-bold tracking-widest">SHERS</div>
                </div>
              </div>
              <button type="button" onClick={onClose} className="text-text-dim hover:text-critical transition-colors p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 border-b border-panel-border/30 shrink-0 flex items-center gap-2">
              <span className="text-[9px] font-bold text-text-dim uppercase shrink-0">{t('chatbot.room', { defaultValue: 'Room (opt)' })}</span>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="flex-1 bg-transparent border border-panel-border/40 rounded px-2 py-1 text-[11px] text-text-main outline-none"
                placeholder="—"
              />
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm relative bg-[#0a0d11]">
              {lines.map((m, i) => (
                <div key={i} className={cn(m.role === 'user' ? 'text-text-dim' : 'text-text-main')}>
                  <div className="text-[9px] uppercase text-text-dim/60 mb-0.5">{m.role === 'user' ? 'You' : 'ARIA'}</div>
                  <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
              {loading && <div className="text-[10px] text-text-dim animate-pulse">{t('chatbot.thinking', { defaultValue: 'Thinking…' })}</div>}
            </div>

            <div className="p-3 border-t border-panel-border/30 bg-[#0d1117]/80 shrink-0 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => void handleSend(p)}
                    className="px-2 py-1 border border-panel-border/40 rounded text-[9px] font-bold uppercase text-text-dim hover:border-info hover:text-info"
                  >
                    {p}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
                className="flex gap-2 items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-[#010409] border border-panel-border rounded px-2 py-2 text-xs text-text-main outline-none focus:border-info"
                  placeholder={t('chatbot.placeholder', { defaultValue: 'Type a message…' })}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-info text-white p-2 rounded hover:bg-info/90 disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
