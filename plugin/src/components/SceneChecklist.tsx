import React, { useState, useEffect, useCallback } from 'react';
import { callFn } from '../premiere/bridge';

interface SceneItem {
  scene: number;
  voice?: string;
  timeRange?: string;
  hook?: string;
  broll?: string;
  sfx?: string;
  overlay?: string;
  caption?: string;
  note?: string;
  done: boolean;
}

const STORAGE_KEY = 'premiere-ai-scenes';

function parseJSON(raw: string): SceneItem[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item: Record<string, unknown>, i: number) => ({
      scene: typeof item.scene === 'number' ? item.scene : i + 1,
      voice: typeof item.voice === 'string' ? item.voice : undefined,
      timeRange: typeof item.timeRange === 'string' ? item.timeRange : undefined,
      hook: typeof item.hook === 'string' ? item.hook : undefined,
      broll: typeof item.broll === 'string' ? item.broll : undefined,
      sfx: typeof item.sfx === 'string' ? item.sfx : undefined,
      overlay: typeof item.overlay === 'string' ? item.overlay : undefined,
      caption: typeof item.caption === 'string' ? item.caption : undefined,
      note: typeof item.note === 'string' ? item.note : undefined,
      done: typeof item.done === 'boolean' ? item.done : false,
    }));
  } catch {
    return null;
  }
}

function parseMarkdown(raw: string): SceneItem[] | null {
  const scenes: SceneItem[] = [];
  const blocks = raw.split(/(?=^#{1,2} Scene \d+)/m).filter(Boolean);
  if (blocks.length === 0) return null;

  for (const block of blocks) {
    const headerMatch = block.match(/^#{1,2} Scene (\d+)(?:\s*\(([^)]+)\))?/m);
    if (!headerMatch) continue;
    const item: SceneItem = { scene: parseInt(headerMatch[1]), done: false };
    if (headerMatch[2]) item.timeRange = headerMatch[2].trim();

    const field = (key: string) => {
      const re = new RegExp(`[-*]\\s+\\*{0,2}${key}\\*{0,2}:?\\s*(.+)`, 'im');
      const m = block.match(re);
      return m ? m[1].replace(/^["']|["']$/g, '').trim() : undefined;
    };

    item.voice = field('voice') ?? field('VO') ?? field('voice over');
    item.hook = field('hook') ?? field('title');
    item.broll = field('broll') ?? field('b.roll') ?? field('b-roll') ?? field('b roll');
    item.sfx = field('sfx') ?? field('sound effect') ?? field('sound');
    item.overlay = field('overlay');
    item.caption = field('caption') ?? field('subtitle');
    item.note = field('note') ?? field('editing note') ?? field('edit note');

    scenes.push(item);
  }
  return scenes.length > 0 ? scenes : null;
}

function parse(raw: string): SceneItem[] | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) return parseJSON(trimmed);
  return parseMarkdown(trimmed);
}

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  hook:    { bg: 'rgba(123,97,255,0.2)', color: '#9b87ff' },
  broll:   { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  sfx:     { bg: 'rgba(251,146,60,0.2)', color: '#fb923c' },
  overlay: { bg: 'rgba(56,189,248,0.2)', color: '#38bdf8' },
  caption: { bg: 'rgba(250,204,21,0.2)', color: '#facc15' },
  note:    { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
};

function Tag({ label, value }: { label: string; value: string }) {
  const c = TAG_COLORS[label] ?? TAG_COLORS['note'];
  return (
    <span
      title={`${label}: ${value}`}
      style={{
        fontSize: 9,
        fontWeight: 600,
        padding: '1px 5px',
        borderRadius: 3,
        background: c.bg,
        color: c.color,
        marginRight: 3,
        cursor: 'default',
      }}
    >
      {label.toUpperCase()}
    </span>
  );
}

export default function SceneChecklist() {
  const [raw, setRaw] = useState('');
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [parseError, setParseError] = useState('');
  const [markerBusy, setMarkerBusy] = useState<number | null>(null);
  const [markerResults, setMarkerResults] = useState<Record<number, boolean>>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setScenes(JSON.parse(saved));
    } catch {}
  }, []);

  // Persist scenes
  useEffect(() => {
    if (scenes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
    }
  }, [scenes]);

  function handleParse() {
    setParseError('');
    const result = parse(raw);
    if (!result) {
      setParseError('Could not parse. Paste a JSON array or Markdown with "## Scene N" headers.');
      return;
    }
    setScenes(result);
    setRaw('');
  }

  function toggleDone(sceneNum: number) {
    setScenes((prev) =>
      prev.map((s) => (s.scene === sceneNum ? { ...s, done: !s.done } : s))
    );
  }

  function clearAll() {
    setScenes([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  async function addMarker(sceneNum: number, timeRange?: string) {
    setMarkerBusy(sceneNum);
    const label = timeRange ? `Scene ${sceneNum} (${timeRange})` : `Scene ${sceneNum}`;
    const r = await callFn('addMarkerAtPlayhead', label);
    setMarkerResults((prev) => ({ ...prev, [sceneNum]: r.startsWith('ok:') }));
    setMarkerBusy(null);
  }

  const doneCount = scenes.filter((s) => s.done).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {scenes.length === 0 ? (
        /* Input view */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            Paste Production Plan
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={`Paste JSON array or Markdown:\n\n## Scene 1 (0:00-0:03)\n- Voice: "..."\n- Hook: Sunday Bold\n- B-roll: ...\n- SFX: Impact Hit\n- Note: ...\n\n## Scene 2 (0:03-0:07)\n...`}
            style={{ flex: 1, fontSize: 11, lineHeight: 1.6, resize: 'none', minHeight: 200, padding: '8px 10px', fontFamily: 'monospace' }}
          />
          {parseError && (
            <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 6, padding: '5px 8px', background: 'rgba(244,67,54,0.1)', borderRadius: 4 }}>
              {parseError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              className="btn-primary"
              onClick={handleParse}
              disabled={!raw.trim()}
              style={{ flex: 1, fontSize: 12 }}
            >
              Parse Plan
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setRaw(text);
                } catch {}
              }}
              style={{ fontSize: 11 }}
            >
              Paste
            </button>
          </div>
        </div>
      ) : (
        /* Checklist view */
        <>
          {/* Header */}
          <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{doneCount}/{scenes.length}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>scenes done</span>
              {doneCount > 0 && (
                <div
                  style={{
                    display: 'inline-block',
                    marginLeft: 8,
                    height: 4,
                    width: 60,
                    background: 'var(--border)',
                    borderRadius: 2,
                    verticalAlign: 'middle',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(doneCount / scenes.length) * 100}%`,
                      background: 'var(--success)',
                      borderRadius: 2,
                    }}
                  />
                </div>
              )}
            </div>
            <button className="btn-ghost" onClick={clearAll} style={{ fontSize: 10 }}>Clear</button>
            <button className="btn-ghost" onClick={() => setScenes([])} style={{ fontSize: 10 }}>Edit</button>
          </div>

          {/* Scene cards */}
          <div className="scrollable" style={{ flex: 1, padding: '6px 8px' }}>
            {scenes.map((scene) => (
              <div
                key={scene.scene}
                style={{
                  background: scene.done ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                  border: `1px solid ${scene.done ? 'rgba(76,175,80,0.25)' : 'var(--border)'}`,
                  borderRadius: 6,
                  marginBottom: 8,
                  overflow: 'hidden',
                  opacity: scene.done ? 0.65 : 1,
                }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', borderBottom: '1px solid var(--border)', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={scene.done}
                    onChange={() => toggleDone(scene.scene)}
                    style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Scene {scene.scene}</span>
                  {scene.timeRange && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {scene.timeRange}
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => addMarker(scene.scene, scene.timeRange)}
                    disabled={markerBusy === scene.scene}
                    title="Add marker at current playhead position"
                    style={{
                      fontSize: 9,
                      padding: '2px 7px',
                      background: markerResults[scene.scene] === true
                        ? 'rgba(76,175,80,0.2)'
                        : markerResults[scene.scene] === false
                        ? 'rgba(244,67,54,0.15)'
                        : 'var(--bg-tertiary)',
                      color: markerResults[scene.scene] === true
                        ? 'var(--success)'
                        : markerResults[scene.scene] === false
                        ? 'var(--danger)'
                        : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                  >
                    {markerBusy === scene.scene ? '…' : markerResults[scene.scene] === true ? '✓ Marked' : '+ Marker'}
                  </button>
                </div>

                {/* Card body */}
                <div style={{ padding: '8px 10px' }}>
                  {/* Voice line */}
                  {scene.voice && (
                    <div style={{ fontSize: 12, direction: 'rtl', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 6, fontStyle: 'italic' }}>
                      "{scene.voice}"
                    </div>
                  )}

                  {/* Tags */}
                  <div style={{ marginBottom: scene.note ? 6 : 0 }}>
                    {scene.hook && <Tag label="hook" value={scene.hook} />}
                    {scene.broll && <Tag label="broll" value={scene.broll} />}
                    {scene.sfx && <Tag label="sfx" value={scene.sfx} />}
                    {scene.overlay && <Tag label="overlay" value={scene.overlay} />}
                    {scene.caption && <Tag label="caption" value={scene.caption} />}
                  </div>

                  {/* Details on hover / expanded */}
                  {(scene.hook || scene.broll || scene.sfx || scene.overlay || scene.caption) && (
                    <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {[
                        { label: 'Hook', value: scene.hook },
                        { label: 'B-roll', value: scene.broll },
                        { label: 'SFX', value: scene.sfx },
                        { label: 'Overlay', value: scene.overlay },
                        { label: 'Caption', value: scene.caption },
                      ]
                        .filter((f) => f.value)
                        .map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', gap: 6, fontSize: 10 }}>
                            <span style={{ color: 'var(--text-muted)', minWidth: 46, flexShrink: 0 }}>{label}:</span>
                            <span style={{ color: 'var(--text-secondary)', direction: 'rtl', flex: 1 }}>{value}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Note */}
                  {scene.note && (
                    <div style={{ marginTop: 6, fontSize: 10, color: 'var(--warning)', direction: 'rtl', background: 'rgba(255,152,0,0.08)', borderRadius: 3, padding: '4px 6px' }}>
                      Note: {scene.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
