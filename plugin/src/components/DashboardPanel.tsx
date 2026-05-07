import React, { useState, useEffect } from 'react';
import { callFn } from '../premiere/bridge';

interface SeqState {
  name: string;
  playhead: string;
  trackCount: string;
  clipCount: string;
}

interface LogEntry {
  ts: string;
  label: string;
  ok: boolean;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function nowStr() {
  return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DashboardPanel() {
  const [seq, setSeq] = useState<SeqState | null>(null);
  const [markerLabel, setMarkerLabel] = useState('Mark');
  const [scaleVal, setScaleVal] = useState(110);
  const [punchVal, setPunchVal] = useState(115);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function addLog(label: string, ok: boolean) {
    setLog((prev) => [{ ts: nowStr(), label, ok }, ...prev].slice(0, 8));
  }

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const [name, playhead, tracks, clips] = await Promise.all([
          callFn('getSequenceName'),
          callFn('getPlayheadTime'),
          callFn('getVideoTrackCount'),
          callFn('getV1ClipCount'),
        ]);
        if (!alive) return;
        if (!name.startsWith('error') && !name.startsWith('EvalScript')) {
          const t = parseFloat(playhead);
          setSeq({
            name: name === 'none' ? '—' : name,
            playhead: isNaN(t) ? '—' : fmtTime(t),
            trackCount: tracks.startsWith('error') ? '—' : tracks,
            clipCount: clips.startsWith('error') ? '—' : clips,
          });
        } else {
          setSeq(null);
        }
      } catch {
        if (alive) setSeq(null);
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  async function act(key: string, fn: () => Promise<string>, label: string) {
    setBusy(key);
    try {
      const r = await fn();
      addLog(label, r.startsWith('ok:'));
    } catch {
      addLog(label, false);
    }
    setBusy(null);
  }

  const SectionLabel = ({ text }: { text: string }) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '12px 0 6px' }}>
      {text}
    </div>
  );

  return (
    <div className="scrollable" style={{ padding: '8px 10px' }}>

      <SectionLabel text="Sequence" />
      <div className="card" style={{ margin: 0 }}>
        {seq ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
            {[
              { label: 'NAME', value: seq.name },
              { label: 'PLAYHEAD', value: seq.playhead, mono: true },
              { label: 'VIDEO TRACKS', value: seq.trackCount },
              { label: 'V1 CLIPS', value: seq.clipCount },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, fontFamily: mono ? 'monospace' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0' }}>
            No active sequence — open Premiere and load a project
          </div>
        )}
      </div>

      <SectionLabel text="Quick Actions" />

      {/* Marker */}
      <div className="card" style={{ margin: '0 0 6px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Add Marker at Playhead</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={markerLabel}
            onChange={(e) => setMarkerLabel(e.target.value)}
            style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
          />
          <button
            className="btn-primary"
            disabled={!!busy}
            onClick={() => act('marker', () => callFn('addMarkerAtPlayhead', markerLabel), `Marker: ${markerLabel}`)}
            style={{ fontSize: 10, whiteSpace: 'nowrap' }}
          >
            {busy === 'marker' ? '…' : 'Add'}
          </button>
        </div>
      </div>

      {/* Scale + Zoom side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
        <div className="card" style={{ margin: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Scale</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number"
              value={scaleVal}
              onChange={(e) => setScaleVal(+e.target.value)}
              min={50}
              max={200}
              style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>%</span>
          </div>
          <button
            className="btn-primary"
            disabled={!!busy}
            onClick={() => act('scale', () => callFn('setClipScaleAtPlayhead', scaleVal), `Scale: ${scaleVal}%`)}
            style={{ fontSize: 10, width: '100%', marginTop: 6 }}
          >
            {busy === 'scale' ? '…' : 'Set Scale'}
          </button>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Zoom Punch</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number"
              value={punchVal}
              onChange={(e) => setPunchVal(+e.target.value)}
              min={100}
              max={200}
              style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>%</span>
          </div>
          <button
            className="btn-primary"
            disabled={!!busy}
            onClick={() => act('punch', () => callFn('addZoomPunchAtPlayhead', punchVal), `Zoom Punch: ${punchVal}%`)}
            style={{ fontSize: 10, width: '100%', marginTop: 6 }}
          >
            {busy === 'punch' ? '…' : 'Zoom Punch'}
          </button>
        </div>
      </div>

      {/* Activity log */}
      {log.length > 0 && (
        <>
          <SectionLabel text="Recent Activity" />
          <div className="card" style={{ margin: 0, padding: '4px 8px' }}>
            {log.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  borderBottom: i < log.length - 1 ? '1px solid var(--border)' : undefined,
                  fontSize: 10,
                }}
              >
                <span style={{ color: entry.ok ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
                  {entry.ok ? '✓' : '✗'}
                </span>
                <span style={{ flex: 1, color: 'var(--text-primary)' }}>{entry.label}</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0, fontSize: 9 }}>
                  {entry.ts}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
