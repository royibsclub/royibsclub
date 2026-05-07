import React, { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';

type PunctuationMode = 'remove' | 'keep' | 'auto';
type TitleStyle = 'clean' | 'bold' | 'demo' | 'cta';

const TITLE_STYLES: { id: TitleStyle; name: string; desc: string }[] = [
  { id: 'clean', name: 'Sunday Clean', desc: 'Simple white centered' },
  { id: 'bold', name: 'Sunday Bold', desc: 'Bold hook, high contrast' },
  { id: 'demo', name: 'Sunday Demo', desc: 'Label bar for demo content' },
  { id: 'cta', name: 'Sunday CTA', desc: 'Lower third, call-to-action' },
];

interface CaptionLine {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
}

interface Stats {
  totalLines: number;
  totalWords: number;
  estimatedDuration: number;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function TextCaptionsPanel() {
  // Hook Title Creator state
  const [titleText, setTitleText] = useState('');
  const [titleStyle, setTitleStyle] = useState<TitleStyle>('bold');
  const [titleCopied, setTitleCopied] = useState(false);

  // Caption Splitter state
  const [text, setText] = useState('');
  const [wordsPerLine, setWordsPerLine] = useState(3);
  const [maxChars, setMaxChars] = useState(28);
  const [punctuation, setPunctuation] = useState<PunctuationMode>('remove');
  const [wps, setWps] = useState(2.5);
  const [startOffset, setStartOffset] = useState(0);
  const [lines, setLines] = useState<CaptionLine[]>([]);
  const [srt, setSrt] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function copyTitle() {
    const t = titleText.trim() || '[title text]';
    const styleLabel = TITLE_STYLES.find((s) => s.id === titleStyle)?.name ?? titleStyle;
    const formatted = `[${styleLabel}]\n${t}`;
    navigator.clipboard.writeText(formatted).then(() => {
      setTitleCopied(true);
      setTimeout(() => setTitleCopied(false), 1500);
    });
  }

  const format = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await api.captionsFormat({
        text,
        wordsPerLine,
        maxCharsPerLine: maxChars,
        punctuationMode: punctuation,
        smartHebrew: true,
        wordsPerSecond: wps,
        startOffset,
      });
      setLines(result.lines);
      setSrt(result.srt);
      setStats(result.stats);
    } catch {
      // silent — user will see no results
    } finally {
      setLoading(false);
    }
  }, [text, wordsPerLine, maxChars, punctuation, wps, startOffset]);

  function copy(content: string, key: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const SectionLabel = ({ text: t, border = false }: { text: string; border?: boolean }) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '10px 10px 6px', borderTop: border ? '1px solid var(--border)' : undefined }}>
      {t}
    </div>
  );

  const ToggleBtn = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      style={{
        padding: '3px 9px',
        fontSize: 11,
        background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
        color: active ? '#fff' : 'var(--text-muted)',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Hook Title Creator ── */}
      <SectionLabel text="Hook Title Creator" />
      <div style={{ padding: '0 10px 10px', flexShrink: 0 }}>
        <input
          value={titleText}
          onChange={(e) => setTitleText(e.target.value)}
          placeholder="Enter title text..."
          dir="rtl"
          style={{ fontSize: 12, padding: '6px 10px', marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {TITLE_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setTitleStyle(s.id)}
              title={s.desc}
              style={{
                fontSize: 10,
                padding: '4px 10px',
                background: titleStyle === s.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: titleStyle === s.id ? '#fff' : 'var(--text-muted)',
                border: titleStyle === s.id ? 'none' : '1px solid var(--border)',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: titleStyle === s.id ? 600 : 400,
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
        {titleText && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px', marginBottom: 8, fontSize: 11, direction: 'rtl', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', direction: 'ltr', display: 'block', marginBottom: 2 }}>
              [{TITLE_STYLES.find((s) => s.id === titleStyle)?.name}]
            </span>
            {titleText}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-primary" onClick={copyTitle} style={{ flex: 1, fontSize: 11 }}>
            {titleCopied ? '✓ Copied' : 'Copy to Clipboard'}
          </button>
          <button
            className="btn-ghost"
            disabled
            title="Applying titles to timeline requires Premiere 25.6+ — coming soon"
            style={{ fontSize: 10, color: 'var(--text-muted)' }}
          >
            Apply to Timeline
          </button>
        </div>
      </div>

      {/* ── Caption Splitter ── */}
      <SectionLabel text="Caption Splitter" border />

      <div className="scrollable" style={{ flex: 1 }}>
        <div style={{ padding: '0 10px 8px' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="הדבק כאן טקסט עברית..."
            dir="rtl"
            rows={4}
            style={{ fontSize: 12, lineHeight: 1.6, padding: '7px 10px', marginBottom: 8 }}
          />
        </div>

        {/* Settings */}
        <div style={{ padding: '0 10px', borderTop: '1px solid var(--border)', paddingTop: 8, paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, direction: 'rtl' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 72 }}>מילים בשורה</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[2, 3, 4, 5].map((n) => (
                <ToggleBtn key={n} active={wordsPerLine === n} onClick={() => setWordsPerLine(n)} label={String(n)} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, direction: 'rtl' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 72 }}>פיסוק</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <ToggleBtn active={punctuation === 'remove'} onClick={() => setPunctuation('remove')} label="הסר" />
              <ToggleBtn active={punctuation === 'keep'} onClick={() => setPunctuation('keep')} label="שמור" />
              <ToggleBtn active={punctuation === 'auto'} onClick={() => setPunctuation('auto')} label="אוטו'" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', direction: 'rtl' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
              תווים מקס:
              <input type="number" value={maxChars} onChange={(e) => setMaxChars(+e.target.value)} min={15} max={50}
                style={{ width: 44, fontSize: 11, padding: '2px 4px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
              מ/שנ:
              <input type="number" value={wps} onChange={(e) => setWps(+e.target.value)} min={1} max={5} step={0.5}
                style={{ width: 44, fontSize: 11, padding: '2px 4px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
              התחלה:
              <input type="number" value={startOffset} onChange={(e) => setStartOffset(+e.target.value)} min={0} step={0.5}
                style={{ width: 44, fontSize: 11, padding: '2px 4px' }} />
            </label>
          </div>
        </div>

        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn-primary"
            onClick={format}
            disabled={loading || !text.trim()}
            style={{ width: '100%', fontSize: 12 }}
          >
            {loading ? '⏳ מעצב...' : 'עצב כתוביות'}
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ padding: '4px 10px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', direction: 'rtl' }}>
            {stats.totalLines} שורות · {stats.totalWords} מילים · {fmtTime(stats.estimatedDuration)}
          </div>
        )}

        {/* Lines preview */}
        {lines.length > 0 && (
          <div style={{ padding: '0 10px 4px' }}>
            {lines.map((line) => (
              <div
                key={line.index}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '3px 6px',
                  marginBottom: 1,
                  borderRadius: 3,
                  background: line.index % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 9, color: 'var(--text-muted)', minWidth: 20, textAlign: 'right', flexShrink: 0 }}>
                  {line.index}
                </span>
                <span style={{ fontSize: 12, direction: 'rtl', flex: 1 }}>{line.text}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {fmtTime(line.startTime)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {lines.length > 0 && (
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-ghost" onClick={() => copy(srt, 'srt')} style={{ flex: 1, fontSize: 10 }}>
                {copied === 'srt' ? '✓' : 'Copy SRT'}
              </button>
              <button className="btn-ghost" onClick={() => copy(lines.map((l) => l.text).join('\n'), 'text')} style={{ flex: 1, fontSize: 10 }}>
                {copied === 'text' ? '✓' : 'Copy Text'}
              </button>
              <button
                className="btn-ghost"
                disabled
                title="Applying captions to timeline via ExtendScript — coming soon"
                style={{ flex: 1, fontSize: 10, color: 'var(--text-muted)' }}
              >
                Apply to Timeline
              </button>
            </div>
          </div>
        )}

        {lines.length === 0 && !loading && !text.trim() && (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
            הדבק טקסט עברית ולחץ "עצב כתוביות"
          </div>
        )}
      </div>
    </div>
  );
}
