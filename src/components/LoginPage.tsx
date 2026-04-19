import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { cn } from '../lib/utils';
import type { User } from '../types/shers';

const DEMOS: { label: string; username: string; password: string }[] = [
  { label: 'admin / admin123', username: 'admin', password: 'admin123' },
  { label: 'staff / staff123', username: 'staff', password: 'staff123' },
  { label: 'security / security123', username: 'security', password: 'security123' },
];

export function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(username, password);
      onLogin(data.access_token || data.token, data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-panel-border rounded-lg p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-critical via-urgent to-info" />

        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="w-8 h-8 text-critical" />
            <span className="text-4xl font-black text-critical tracking-tighter">SHERS</span>
          </div>
          <div className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em] text-center leading-relaxed">
            {t('guest_assistant').split(' ')[0]} {t('system_active').split(' ')[0]}
            <br />
            {t('dashboard.title', { defaultValue: 'Emergency response' })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {DEMOS.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => {
                setUsername(d.username);
                setPassword(d.password);
              }}
              className="text-[9px] font-bold uppercase tracking-tight px-2 py-1 rounded-full border border-panel-border text-text-dim hover:border-info hover:text-info transition-colors"
            >
              {d.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">
              {t('auth.username', { defaultValue: 'Username' })}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0d1117] border border-panel-border text-text-main px-4 py-3 rounded text-sm focus:border-critical outline-none transition-all placeholder:text-text-dim/20"
              placeholder="operator_id"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">
              {t('auth.password', { defaultValue: 'Password' })}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-panel-border text-text-main px-4 py-3 rounded text-sm focus:border-critical outline-none transition-all placeholder:text-text-dim/20"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-critical/10 border border-critical/30 text-critical text-[10px] font-bold py-2 rounded text-center uppercase tracking-widest">
              {t('auth.denied', { defaultValue: 'Access denied' })}: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full bg-critical hover:bg-critical/90 text-white font-black py-3.5 rounded text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-critical/20 active:scale-[0.98] mt-2',
              loading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {loading ? t('auth.authorizing', { defaultValue: 'Authorizing…' }) : t('initialize')}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-panel-border/50">
          <div className="text-[9px] text-text-dim/40 font-bold uppercase tracking-[0.2em] text-center">SHERS v2 · PRD upgrade path</div>
        </div>
      </div>
    </div>
  );
}
