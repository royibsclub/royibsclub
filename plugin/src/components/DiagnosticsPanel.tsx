import React, { useState } from 'react';
import {
  testCSInterface,
  testAppAvailable,
  testProjectName,
  testSequenceName,
  testPlayheadTime,
  testVideoTrackCount,
  testV1ClipCount,
  testQEDOM,
  testServerHealth,
  runAddMarker,
  runSetScale,
  runZoomPunch,
  type DiagResult,
} from '../premiere/diagnostics';

interface Row {
  label: string;
  result: DiagResult | null;
  loading: boolean;
}

const CHECKS: { key: string; label: string; fn: () => Promise<DiagResult> }[] = [
  { key: 'server',    label: 'Server (3333)',    fn: testServerHealth },
  { key: 'csi',      label: 'CSInterface',       fn: testCSInterface },
  { key: 'app',      label: 'app global',        fn: testAppAvailable },
  { key: 'project',  label: 'Project name',      fn: testProjectName },
  { key: 'seq',      label: 'Sequence name',     fn: testSequenceName },
  { key: 'playhead', label: 'Playhead (sec)',     fn: testPlayheadTime },
  { key: 'vtracks',  label: 'Video tracks',      fn: testVideoTrackCount },
  { key: 'clips',    label: 'V1 clip count',     fn: testV1ClipCount },
  { key: 'qe',       label: 'QE DOM',            fn: testQEDOM },
];

function Badge({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>—</span>;
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 600,
      padding: '1px 5px',
      borderRadius: 3,
      background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      color: ok ? '#22c55e' : '#ef4444',
    }}>
      {ok ? 'OK' : 'FAIL'}
    </span>
  );
}

export default function DiagnosticsPanel() {
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(CHECKS.map((c) => [c.key, { label: c.label, result: null, loading: false }]))
  );
  const [runningAll, setRunningAll] = useState(false);

  const [markerLabel, setMarkerLabel] = useState('MVP Test');
  const [markerResult, setMarkerResult] = useState<DiagResult | null>(null);
  const [markerLoading, setMarkerLoading] = useState(false);

  const [scaleValue, setScaleValue] = useState(110);
  const [scaleResult, setScaleResult] = useState<DiagResult | null>(null);
  const [scaleLoading, setScaleLoading] = useState(false);

  const [punchScale, setPunchScale] = useState(115);
  const [punchResult, setPunchResult] = useState<DiagResult | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);

  async function runOne(key: string, fn: () => Promise<DiagResult>) {
    setRows((r) => ({ ...r, [key]: { ...r[key], loading: true } }));
    const result = await fn();
    setRows((r) => ({ ...r, [key]: { ...r[key], result, loading: false } }));
  }

  async function runAll() {
    setRunningAll(true);
    for (const c of CHECKS) {
      await runOne(c.key, c.fn);
    }
    setRunningAll(false);
  }

  async function doMarker() {
    setMarkerLoading(true);
    setMarkerResult(await runAddMarker(markerLabel));
    setMarkerLoading(false);
  }

  async function doScale() {
    setScaleLoading(true);
    setScaleResult(await runSetScale(scaleValue));
    setScaleLoading(false);
  }

  async function doPunch() {
    setPunchLoading(true);
    setPunchResult(await runZoomPunch(punchScale));
    setPunchLoading(false);
  }

  const sectionHead = (label: string) => (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '10px 0 4px' }}>
      {label}
    </div>
  );

  const resultLine = (r: DiagResult | null) => r ? (
    <div style={{ fontSize: 10, color: r.ok ? '#22c55e' : '#ef4444', marginTop: 3, direction: 'ltr' }}>
      {r.ok ? '✓' : '✗'} {r.value}
    </div>
  ) : null;

  return (
    <div className="scrollable" style={{ height: '100%', padding: '8px 10px' }}>

      {/* Run All */}
      <button
        className="btn-primary"
        onClick={runAll}
        disabled={runningAll}
        style={{ width: '100%', fontSize: 12, marginBottom: 6 }}
      >
        {runningAll ? '⏳ Running...' : '▶ Run All Tests'}
      </button>

      {/* Status table */}
      {sectionHead('Connection & Runtime')}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {CHECKS.map((c, i) => {
          const row = rows[c.key];
          return (
            <div
              key={c.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '5px 8px',
                borderBottom: i < CHECKS.length - 1 ? '1px solid var(--border)' : undefined,
                gap: 6,
              }}
            >
              <span style={{ flex: 1, fontSize: 11, color: 'var(--text-primary)' }}>{c.label}</span>
              {row.loading ? (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>…</span>
              ) : (
                <>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>
                    {row.result?.value ?? ''}
                  </span>
                  <Badge ok={row.result?.ok ?? null} />
                </>
              )}
              <button
                onClick={() => runOne(c.key, c.fn)}
                disabled={row.loading}
                style={{ fontSize: 9, padding: '2px 6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
              >
                test
              </button>
            </div>
          );
        })}
      </div>

      {/* Test Actions */}
      {sectionHead('Test Actions')}

      {/* Add Marker */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 5, padding: '8px 10px', marginBottom: 6, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 5 }}>Add Marker at Playhead</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <input
            value={markerLabel}
            onChange={(e) => setMarkerLabel(e.target.value)}
            style={{ flex: 1, fontSize: 11, padding: '3px 6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3 }}
          />
          <button
            className="btn-primary"
            onClick={doMarker}
            disabled={markerLoading}
            style={{ fontSize: 10, whiteSpace: 'nowrap' }}
          >
            {markerLoading ? '…' : 'Add Marker'}
          </button>
        </div>
        {resultLine(markerResult)}
      </div>

      {/* Set Scale */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 5, padding: '8px 10px', marginBottom: 6, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 5 }}>Scale Clip at Playhead</div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <input
            type="number"
            value={scaleValue}
            onChange={(e) => setScaleValue(+e.target.value)}
            min={50}
            max={200}
            style={{ width: 64, fontSize: 11, padding: '3px 6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3 }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>%</span>
          <button
            className="btn-primary"
            onClick={doScale}
            disabled={scaleLoading}
            style={{ fontSize: 10, flex: 1 }}
          >
            {scaleLoading ? '…' : 'Set Scale'}
          </button>
        </div>
        {resultLine(scaleResult)}
      </div>

      {/* Zoom Punch */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 5, padding: '8px 10px', marginBottom: 6, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 5 }}>Zoom Punch at Playhead</div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <input
            type="number"
            value={punchScale}
            onChange={(e) => setPunchScale(+e.target.value)}
            min={100}
            max={200}
            style={{ width: 64, fontSize: 11, padding: '3px 6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3 }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>%</span>
          <button
            className="btn-primary"
            onClick={doPunch}
            disabled={punchLoading}
            style={{ fontSize: 10, flex: 1 }}
          >
            {punchLoading ? '…' : 'Zoom Punch'}
          </button>
        </div>
        {resultLine(punchResult)}
      </div>

    </div>
  );
}
