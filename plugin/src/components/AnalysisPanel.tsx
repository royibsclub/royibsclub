import React, { useState } from 'react';
import { api } from '../services/api';
import type { TimelineState, Platform } from '@premiere-ai/shared';

interface Props {
  timeline: TimelineState | null;
  platform: Platform;
  creatorId: string;
}

export default function AnalysisPanel({ timeline, platform, creatorId }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    if (!timeline) {
      setError('אין טיימליין פעיל ב-Premiere Pro');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await api.analyze({
        timelineState: timeline,
        platform,
        creatorId,
      });
      setAnalysis(result.analysis);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            {timeline ? (
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                {timeline.sequenceName} · {timeline.duration.toFixed(0)}ש ·{' '}
                {timeline.tracks.reduce((s, t) => s + t.clips.length, 0)} קליפים
              </span>
            ) : (
              <span style={{ color: 'var(--danger)', fontSize: 11 }}>לא מחובר ל-Premiere</span>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={runAnalysis}
            disabled={loading || !timeline}
            style={{ fontSize: 11, padding: '5px 12px' }}
          >
            {loading ? 'מנתח...' : '▶ נתח'}
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 11, padding: '4px 0' }}>{error}</div>
        )}
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        {!analysis && !loading && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 50, lineHeight: 2 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
            <div>לחץ "נתח" לקבלת</div>
            <div>ניתוח מעמיק של הסרטון</div>
            <div style={{ fontSize: 11, marginTop: 12 }}>
              Hook · Retention · Pacing · Virality
            </div>
          </div>
        )}

        {loading && (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 20, marginBottom: 12 }}>⏳</div>
            <div>Claude מנתח את הסרטון...</div>
            <div style={{ fontSize: 11, marginTop: 6, color: 'var(--text-muted)' }}>
              עשוי לקחת 10–30 שניות
            </div>
          </div>
        )}

        {analysis && <AnalysisResult text={analysis} />}
      </div>
    </div>
  );
}

function AnalysisResult({ text }: { text: string }) {
  const sections = parseAnalysisSections(text);

  return (
    <div>
      {sections.map((section, i) => (
        <div key={i} className="card" style={{ marginBottom: 8 }}>
          {section.heading && (
            <div
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--accent)',
                marginBottom: 6,
                direction: 'rtl',
              }}
            >
              {section.heading}
            </div>
          )}
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--text-primary)',
              direction: 'rtl',
              whiteSpace: 'pre-wrap',
            }}
          >
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
}

function parseAnalysisSections(text: string): Array<{ heading?: string; content: string }> {
  const lines = text.split('\n');
  const sections: Array<{ heading?: string; content: string }> = [];
  let current: { heading?: string; lines: string[] } = { lines: [] };

  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('# ') || line.match(/^\*\*\d+\./)) {
      if (current.lines.join('').trim()) {
        sections.push({ heading: current.heading, content: current.lines.join('\n').trim() });
      }
      current = {
        heading: line.replace(/^#{1,3}\s/, '').replace(/\*\*/g, ''),
        lines: [],
      };
    } else {
      current.lines.push(line);
    }
  }

  if (current.lines.join('').trim()) {
    sections.push({ heading: current.heading, content: current.lines.join('\n').trim() });
  }

  return sections.filter((s) => s.content);
}
