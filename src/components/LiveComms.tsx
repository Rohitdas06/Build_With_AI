import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { cn } from '../lib/utils';

export function LiveComms({ messages, username }: { messages: any[]; username: string }) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await api.sendMessage(input.trim(), 'general', 'staff');
      setInput('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2.5 flex flex-col-reverse gap-2">
        {messages.slice(0, 50).map((msg) => {
          const label = msg.sender_name || msg.sender || username;
          return (
            <div
              key={msg.id}
              className={cn(
                'pl-2 border-l-2 py-0.5',
                msg.msg_type === 'auto' || msg.msg_type === 'system'
                  ? 'border-critical bg-critical/5 px-2 rounded-r'
                  : 'border-panel-border'
              )}
            >
              <div className="text-[11px] font-bold text-text-dim uppercase mb-0.5 tracking-wider">{label}</div>
              <div className="text-xs text-text-main leading-snug">{msg.content}</div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="p-2 border-t border-panel-border flex gap-2 shrink-0 bg-[#0d1117]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('type_message')}
          className="flex-1 bg-transparent border border-panel-border rounded px-2 py-1 text-[11px] focus:border-info outline-none transition-all placeholder:text-text-dim/30"
        />
        <button
          type="submit"
          className="bg-info text-white px-2 py-1 rounded text-[10px] font-bold uppercase transition-all hover:bg-info/80"
        >
          {t('send')}
        </button>
      </form>
    </div>
  );
}
