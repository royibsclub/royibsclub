import React, { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { addCaptionsBulk } from '../premiere/captions';

type PunctuationMode = 'remove' | 'keep' | 'auto';

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

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function CaptionsPanel() {
  const [text, setText] = useState('');
  const [wordsPerLine, setWordsPerLine] = useState(3);
  const [maxChars, setMaxChars] = useState(28);
  const [punctuation, setPunctuation] = useState<PunctuationMode>('remove');
  const [smartHebrew, setSmartHebrew] = useState(true);
  const [wps, setWps] = useState(2.5);
  const [startOffset, setStartOffset] = useState(0);

  const [lines, setLines] = useState<CaptionLine[]>([]);
  const [srt, setSrt] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const format = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await api.captionsFormat({
        text,
        wordsPerLine,
        maxCharsPerLine: maxChars,
        punctuationMode: punctuation,
        smartHebrew,
        wordsPerSecond: wps,
        startOffset,
      });
      setLines(result.lines);
      setSrt(result.srt);
      setStats(result.stats);
    } finally {
      setLoading(false);
    }
  }, [text, wordsPerLine, maxChars, punctuation, smartHebrew, wps, startOffset]);

  const transcribe = useCallback(async (file: File) => {
    setTranscribing(true);
    setTranscribeError('');
    try {
      const result = await api.captionsTranscribe(file);
      setText(result.text);
    } catch (err) {
      setTranscribeError(err instanceof Error ? err.message : 'שגיאה בזיהוי קול');
    } finally {
      setTranscribing(false);
    }
  }, []);

  const applyToTimeline = useCallback(() => {
    if (lines.length === 0) return;
    setApplying(true);
    setApplyResult(null);
    try {
      const result = addCaptionsBulk(lines);
      const total = result.applied + result.failed;
      if (result.applied > 0) {
        setApplyResult({
          ok: true,
          msg: `✓ ${result.applied}/${total} כתוביות הוחלו בהצלחה${result.failed > 0 ? ` (${result.failed} נכשלו)` : ''}`,
        });
      } else {
        setApplyResult({
          ok: false,
          msg: 'שגיאה — וודא שיש Sequence פעיל בפרמייר.',
        });
      }
    } catch (e) {
      setApplyResult({ ok: false, msg: e instanceof Error ? e.message : 'שגיאה' });
    } finally {
      setApplying(false);
    }
  }, [lines]);

  function copy(content: string, key: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const ToggleBtn = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Transcription */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.mp4,.m4a,.webm,.ogg"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) transcribe(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn-ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={transcribing}
            style={{ fontSize: 11, flex: 1 }}
          >
            {transcribing ? '⏳ מזהה דיבור...' : '🎙️ זהה קול (Whisper)'}
          </button>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', direction: 'rtl' }}>
            mp3 / wav / mp4 / m4a
          </span>
        </div>
        {transcribeError && (
          <div style={{ marginTop: 5, fontSize: 10, color: '#ef4444', direction: 'rtl' }}>
            ⚠ {transcribeError}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="הדבק כאן טקסט עברית — תסריט, שורות, כל טקסט..."
          dir="rtl"
          rows={5}
          style={{
            width: '100%',
            resize: 'vertical',
            fontSize: 12,
            lineHeight: 1.7,
            padding: '8px 10px',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Settings */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>

        {/* Words per line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, direction: 'rtl' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 80 }}>מילים בשורה</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[2, 3, 4, 5].map((n) => (
              <ToggleBtn key={n} active={wordsPerLine === n} onClick={() => setWordsPerLine(n)} label={String(n)} />
            ))}
          </div>
        </div>

        {/* Punctuation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, direction: 'rtl' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 80 }}>פיסוק</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <ToggleBtn active={punctuation === 'remove'} onClick={() => setPunctuation('remove')} label="הסר" />
            <ToggleBtn active={punctuation === 'keep'} onClick={() => setPunctuation('keep')} label="שמור" />
            <ToggleBtn active={punctuation === 'auto'} onClick={() => setPunctuation('auto')} label="אוטו'" />
          </div>
        </div>

        {/* Smart Hebrew + max chars + wps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, direction: 'rtl', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={smartHebrew} onChange={(e) => setSmartHebrew(e.target.checked)} />
            עברית חכמה
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
            תווים מקס:
            <input
              type="number"
              value={maxChars}
              onChange={(e) => setMaxChars(+e.target.value)}
              min={15}
              max={50}
              style={{ width: 44, fontSize: 11, padding: '2px 4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3 }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
            מ/שנ:
            <input
              type="number"
              value={wps}
              onChange={(e) => setWps(+e.target.value)}
              min={1}
              max={5}
              step={0.5}
              style={{ width: 44, fontSize: 11, padding: '2px 4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3 }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
            התחלה (שנ):
            <input
              type="number"
              value={startOffset}
              onChange={(e) => setStartOffset(+e.target.value)}
              min={0}
              step={0.5}
              style={{ width: 44, fontSize: 11, padding: '2px 4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3 }}
            />
          </label>
        </div>
      </div>

      {/* Format button */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          className="btn-primary"
          onClick={format}
          disabled={loading || !text.trim()}
          style={{ width: '100%', fontSize: 12 }}
        >
          {loading ? '⏳ מעצב...' : '✨ עצב כתוביות'}
        </button>
      </div>

      {/* Preview */}
      {lines.length > 0 && (
        <>
          {/* Stats */}
          {stats && (
            <div style={{ padding: '5px 10px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0, direction: 'rtl' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {stats.totalLines} שורות · {stats.totalWords} מילים · {formatTime(stats.estimatedDuration)} דקות
              </span>
            </div>
          )}

          {/* Lines preview */}
          <div className="scrollable" style={{ flex: 1, padding: 8 }}>
            {lines.map((line) => (
              <div
                key={line.index}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '4px 6px',
                  marginBottom: 2,
                  borderRadius: 4,
                  background: line.index % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 9, color: 'var(--text-muted)', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>
                  {line.index}
                </span>
                <span style={{ fontSize: 12, direction: 'rtl', flex: 1, lineHeight: 1.5 }}>
                  {line.text}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'monospace' }}>
                  {formatTime(line.startTime)}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {applyResult && (
              <div style={{
                marginBottom: 6,
                padding: '6px 10px',
                borderRadius: 5,
                fontSize: 10,
                direction: 'rtl',
                background: applyResult.ok ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                color: applyResult.ok ? 'var(--success)' : '#ef4444',
                border: `1px solid ${applyResult.ok ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {applyResult.msg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn-ghost"
                onClick={() => copy(srt, 'srt')}
                style={{ flex: 1, fontSize: 10 }}
              >
                {copied === 'srt' ? '✓' : '📋 SRT'}
              </button>
              <button
                className="btn-ghost"
                onClick={() => copy(lines.map((l) => l.text).join('\n'), 'text')}
                style={{ flex: 1, fontSize: 10 }}
              >
                {copied === 'text' ? '✓' : '📋 טקסט'}
              </button>
              <button
                className="btn-primary"
                onClick={applyToTimeline}
                disabled={applying || lines.length === 0}
                style={{ flex: 2, fontSize: 11 }}
              >
                {applying ? '⏳...' : '▶ שלח לפרמייר'}
              </button>
            </div>
          </div>
        </>
      )}

      {lines.length === 0 && !loading && text.trim() === '' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 28 }}>✏️</span>
          הדבק טקסט עברית ולחץ "עצב כתוביות"
        </div>
      )}
    </div>
  );
}
