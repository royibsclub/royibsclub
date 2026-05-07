import React, { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { Platform } from '@premiere-ai/shared';

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'youtube', label: 'YouTube' },
];

const HOOK_EMOJIS = ['🔥', '⚡', '💡', '🎯', '🚀'];

export default function HookPanel() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram_reels');
  const [character, setCharacter] = useState('');
  const [niche, setNiche] = useState('');
  const [hooks, setHooks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.generateHooks({
        topic: topic.trim(),
        platform,
        character: character.trim() || undefined,
        niche: niche.trim() || undefined,
      });
      setHooks(result.hooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הוקים');
    } finally {
      setLoading(false);
    }
  }, [topic, platform, character, niche]);

  function copy(text: string, index: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(index);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Form */}
      <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>

        {/* Topic */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', direction: 'rtl', display: 'block', marginBottom: 4 }}>
            נושא הסרטון
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder="למשל: 3 טעויות נפוצות בפרמייר, איך להרוויח יותר, טיפ על TikTok..."
            dir="rtl"
            style={{
              width: '100%',
              fontSize: 12,
              padding: '8px 10px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Platform + Character row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', direction: 'rtl', display: 'block', marginBottom: 4 }}>
              פלטפורמה
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              style={{
                width: '100%',
                fontSize: 11,
                padding: '6px 8px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
              }}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', direction: 'rtl', display: 'block', marginBottom: 4 }}>
              דמות (אופציונלי)
            </label>
            <input
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              placeholder="שם הדמות..."
              dir="rtl"
              style={{
                width: '100%',
                fontSize: 11,
                padding: '6px 8px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Niche */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', direction: 'rtl', display: 'block', marginBottom: 4 }}>
            נישה (אופציונלי)
          </label>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="למשל: עריכת וידאו, כסף ושקעות, בריאות..."
            dir="rtl"
            style={{
              width: '100%',
              fontSize: 11,
              padding: '6px 8px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Generate button */}
        <button
          className="btn-primary"
          onClick={generate}
          disabled={loading || !topic.trim()}
          style={{ width: '100%', fontSize: 12, marginBottom: 10 }}
        >
          {loading ? '⏳ מייצר הוקים...' : '✨ צור 5 הוקים ויראליים'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: '0 10px 8px',
          padding: '8px 10px',
          fontSize: 11,
          direction: 'rtl',
          background: 'rgba(239,68,68,0.1)',
          color: '#ef4444',
          borderRadius: 6,
          border: '1px solid rgba(239,68,68,0.3)',
          flexShrink: 0,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Empty state */}
      {hooks.length === 0 && !loading && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          gap: 8,
          padding: 20,
        }}>
          <span style={{ fontSize: 32 }}>🎣</span>
          <div style={{ fontSize: 12, direction: 'rtl', textAlign: 'center', lineHeight: 1.6 }}>
            הכנס נושא ולחץ "צור הוקים"
            <br />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>
              הוק חזק = 80% מהסיכוי להיות ויראלי
            </span>
          </div>
        </div>
      )}

      {/* Hooks list */}
      {hooks.length > 0 && (
        <div className="scrollable" style={{ flex: 1, padding: '0 10px 10px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', direction: 'rtl', marginBottom: 8 }}>
            לחץ "📋 העתק" להעתקת ההוק לאחר בחירה:
          </div>

          {hooks.map((hook, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 8,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{HOOK_EMOJIS[i]}</span>

              <div style={{ flex: 1, direction: 'rtl' }}>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  {hook}
                </div>
              </div>

              <button
                onClick={() => copy(hook, i)}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  background: copied === i ? 'rgba(52,211,153,0.15)' : 'var(--bg-primary)',
                  color: copied === i ? 'var(--success)' : 'var(--text-muted)',
                  border: `1px solid ${copied === i ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                  borderRadius: 5,
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontWeight: copied === i ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {copied === i ? '✓' : '📋'}
              </button>
            </div>
          ))}

          {/* Regenerate */}
          <button
            className="btn-ghost"
            onClick={generate}
            disabled={loading}
            style={{ width: '100%', fontSize: 11, marginTop: 4 }}
          >
            {loading ? '⏳ מייצר...' : '🔄 צור 5 הוקים נוספים'}
          </button>
        </div>
      )}
    </div>
  );
}
