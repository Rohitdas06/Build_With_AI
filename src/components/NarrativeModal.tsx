import React, { useState, useEffect } from 'react';
import { X, Copy, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { cn } from '../lib/utils';

export function NarrativeModal({
  incidentId,
  onClose,
}: {
  incidentId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadExisting = async () => {
    if (!incidentId) return;
    setError('');
    try {
      const data = await api.getNarrative(incidentId);
      if (data.narrative) {
        setText(data.narrative);
        setGeneratedAt(data.generated_at);
      } else {
        setText('');
        setGeneratedAt(null);
      }
    } catch {
      setText('');
      setGeneratedAt(null);
    }
  };

  useEffect(() => {
    void loadExisting();
  }, [incidentId]);

  const generate = async () => {
    if (!incidentId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.generateNarrative(incidentId);
      setText(data.narrative);
      setGeneratedAt(data.generated_at);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!incidentId) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85vh] bg-card border border-panel-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
          <h2 className="text-xs font-black uppercase tracking-widest text-text-main">
            {t('incidents.aiReport', { defaultValue: 'AI incident report' })}
          </h2>
          <button type="button" onClick={onClose} className="text-text-dim hover:text-text-main p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-2 text-[9px] text-text-dim border-b border-panel-border/50">
          {generatedAt
            ? `${t('incidents.generatedAt', { defaultValue: 'Generated at' })} ${new Date(generatedAt).toLocaleString()}`
            : t('incidents.noNarrativeYet', { defaultValue: 'No report generated yet.' })}
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm text-text-main whitespace-pre-wrap font-sans leading-relaxed">
          {loading ? (
            <div className="text-[10px] uppercase tracking-widest text-text-dim animate-pulse">
              {t('incidents.generating', { defaultValue: 'Generating narrative…' })}
            </div>
          ) : error ? (
            <div className="text-critical text-xs">{error}</div>
          ) : (
            text || t('incidents.clickGenerate', { defaultValue: 'Click Generate to create an AI incident report.' })
          )}
        </div>
        <div className="flex gap-2 p-3 border-t border-panel-border bg-bg/80">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(text)}
            disabled={!text}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded border border-panel-border text-[10px] font-bold uppercase disabled:opacity-30"
          >
            <Copy className="w-3 h-3" /> {t('incidents.copy', { defaultValue: 'Copy' })}
          </button>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded bg-info text-white text-[10px] font-bold uppercase disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            {text ? t('incidents.regenerate', { defaultValue: 'Regenerate' }) : t('incidents.generate', { defaultValue: 'Generate' })}
          </button>
        </div>
      </div>
    </div>
  );
}
