import React, { useState } from 'react';
import { api } from '../services/api';
import type { Platform } from '@premiere-ai/shared';

interface Props {
  platform: Platform;
}

export default function ResearchPanel({ platform }: Props) {
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function research() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { research: text } = await api.research(topic.trim(), platform, niche.trim() || undefined);
      setResult(text);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ marginBottom: 6 }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="נושא מחקר... (למשל: טרנדים בעריכת TikTok, hooks שעובדים)"
            style={{ direction: 'rtl' }}
            onKeyDown={(e) => e.key === 'Enter' && research()}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="נישה (אופציונלי)... למשל: fitness, בישול, עסקים"
            style={{ direction: 'rtl', fontSize: 11 }}
          />
        </div>
        <button
          className="btn-primary"
          onClick={research}
          disabled={loading || !topic.trim()}
          style={{ width: '100%' }}
        >
          {loading ? 'מחקר בתהליך...' : '🔍 בצע מחקר'}
        </button>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 6 }}>{error}</div>
        )}
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        {!result && !loading && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 50, lineHeight: 2 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔬</div>
            <div>מחקר טרנדים ובסיס ידע</div>
            <div style={{ fontSize: 11, marginTop: 8 }}>
              מה עובד עכשיו · סגנונות עריכה · hook patterns
            </div>
          </div>
        )}

        {loading && (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 20, marginBottom: 12 }}>🧠</div>
            <div>Claude מחקר...</div>
          </div>
        )}

        {result && (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.8,
              color: 'var(--text-primary)',
              direction: 'rtl',
              whiteSpace: 'pre-wrap',
            }}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
