import React, { useState } from 'react';
import { callFn } from '../premiere/bridge';

type Category = 'zooms' | 'titles' | 'sfx' | 'overlays' | 'screen' | 'utility';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'zooms', label: 'Zooms' },
  { id: 'titles', label: 'Titles' },
  { id: 'sfx', label: 'SFX' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'screen', label: 'Screen' },
  { id: 'utility', label: 'Utility' },
];

const TITLE_PRESETS = [
  {
    id: 'clean',
    name: 'Sunday Clean',
    desc: 'Simple white centered title, no background',
    format: (text: string) => `[Sunday Clean]\n${text}`,
  },
  {
    id: 'bold',
    name: 'Sunday Bold',
    desc: 'Large bold hook title, high contrast accent color',
    format: (text: string) => `[Sunday Bold — Hook]\n${text}`,
  },
  {
    id: 'demo',
    name: 'Sunday Demo',
    desc: 'Small label bar for screen recording / demo content',
    format: (text: string) => `[Sunday Demo Label]\n${text}`,
  },
  {
    id: 'cta',
    name: 'Sunday CTA',
    desc: 'Lower third call-to-action style',
    format: (text: string) => `[Sunday CTA]\n${text}`,
  },
];

const SFX_ITEMS = ['Impact Hit', 'Whoosh Fast', 'Glass Break', 'Notification Pop', 'Transition Boom', 'Text Appear'];
const OVERLAY_ITEMS = ['Cinematic Bar', 'Lower Third', 'Spotlight Ring', 'Arrow Point', 'Highlight Box', 'Text Reveal'];
const SCREEN_ITEMS = ['Screen Zoom In', 'Click Highlight', 'Cursor Spotlight', 'Demo Label Bar', 'App Window Frame'];

interface ActionResult {
  ok: boolean;
  value: string;
}

function PlaceholderCard({ name }: { name: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--text-primary)' }}>{name}</span>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 3 }}>
        coming soon
      </span>
    </div>
  );
}

export default function EffectsPanel() {
  const [cat, setCat] = useState<Category>('zooms');

  const [zoomScale, setZoomScale] = useState(115);
  const [zoomResult, setZoomResult] = useState<ActionResult | null>(null);
  const [zoomBusy, setZoomBusy] = useState(false);

  const [titleText, setTitleText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const [markerLabel, setMarkerLabel] = useState('Mark');
  const [scaleVal, setScaleVal] = useState(110);
  const [utilResults, setUtilResults] = useState<Record<string, ActionResult | null>>({});
  const [utilBusy, setUtilBusy] = useState<string | null>(null);

  async function doZoom() {
    setZoomBusy(true);
    const r = await callFn('addZoomPunchAtPlayhead', zoomScale);
    setZoomResult({ ok: r.startsWith('ok:'), value: r });
    setZoomBusy(false);
  }

  function copyTitle(presetId: string, fmt: (t: string) => string) {
    const text = titleText.trim() || '[title text]';
    navigator.clipboard.writeText(fmt(text)).then(() => {
      setCopied(presetId);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  async function utilAct(key: string, fn: () => Promise<string>) {
    setUtilBusy(key);
    const r = await fn();
    setUtilResults((prev) => ({ ...prev, [key]: { ok: r.startsWith('ok:'), value: r } }));
    setUtilBusy(null);
  }

  const ResultLine = ({ r }: { r: ActionResult | null }) =>
    r ? (
      <div style={{ fontSize: 10, color: r.ok ? 'var(--success)' : 'var(--danger)', marginTop: 4, direction: 'ltr' }}>
        {r.ok ? '✓' : '✗'} {r.value}
      </div>
    ) : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Category tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            style={{
              flex: 1,
              background: 'transparent',
              color: cat === c.id ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: cat === c.id ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '7px 2px',
              fontSize: 10,
              fontWeight: cat === c.id ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="scrollable" style={{ flex: 1, padding: '10px 10px' }}>

        {/* ZOOMS */}
        {cat === 'zooms' && (
          <>
            <div className="card" style={{ margin: 0, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Zoom Punch</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                Scale keyframes: ramp up at playhead, hold 0.5s, ramp back to 100%
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Scale</span>
                <input
                  type="number"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(+e.target.value)}
                  min={100}
                  max={200}
                  style={{ width: 64, fontSize: 11, padding: '4px 6px' }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>%</span>
                <button
                  className="btn-primary"
                  disabled={zoomBusy}
                  onClick={doZoom}
                  style={{ fontSize: 10, flex: 1 }}
                >
                  {zoomBusy ? '…' : 'Apply at Playhead'}
                </button>
              </div>
              <ResultLine r={zoomResult} />
            </div>
            <PlaceholderCard name="Smooth Zoom In (ramp over N frames)" />
            <PlaceholderCard name="Zoom Out Reset" />
          </>
        )}

        {/* TITLES */}
        {cat === 'titles' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 }}>Title text (optional)</div>
              <input
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                placeholder="Enter title text..."
                style={{ fontSize: 11, padding: '6px 8px', marginBottom: 0 }}
              />
            </div>
            {TITLE_PRESETS.map((p) => (
              <div
                key={p.id}
                className="card"
                style={{ margin: '0 0 6px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.desc}</div>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => copyTitle(p.id, p.format)}
                    style={{ fontSize: 10, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {copied === p.id ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              Copies style name + text to clipboard. Apply via Premiere text tool.
            </div>
          </>
        )}

        {/* SFX */}
        {cat === 'sfx' && (
          <>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              Native SFX library — coming in next phase
            </div>
            {SFX_ITEMS.map((name) => <PlaceholderCard key={name} name={name} />)}
          </>
        )}

        {/* OVERLAYS */}
        {cat === 'overlays' && (
          <>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              Overlay library — coming in next phase
            </div>
            {OVERLAY_ITEMS.map((name) => <PlaceholderCard key={name} name={name} />)}
          </>
        )}

        {/* SCREEN */}
        {cat === 'screen' && (
          <>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              Screen / demo recording effects — coming in next phase
            </div>
            {SCREEN_ITEMS.map((name) => <PlaceholderCard key={name} name={name} />)}
          </>
        )}

        {/* UTILITY */}
        {cat === 'utility' && (
          <>
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
                  disabled={!!utilBusy}
                  onClick={() => utilAct('marker', () => callFn('addMarkerAtPlayhead', markerLabel))}
                  style={{ fontSize: 10 }}
                >
                  {utilBusy === 'marker' ? '…' : 'Add'}
                </button>
              </div>
              <ResultLine r={utilResults['marker'] ?? null} />
            </div>

            <div className="card" style={{ margin: '0 0 6px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Scale Clip at Playhead</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  value={scaleVal}
                  onChange={(e) => setScaleVal(+e.target.value)}
                  min={50}
                  max={200}
                  style={{ width: 64, fontSize: 11, padding: '4px 6px' }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>%</span>
                <button
                  className="btn-primary"
                  disabled={!!utilBusy}
                  onClick={() => utilAct('scale', () => callFn('setClipScaleAtPlayhead', scaleVal))}
                  style={{ fontSize: 10, flex: 1 }}
                >
                  {utilBusy === 'scale' ? '…' : 'Set Scale'}
                </button>
              </div>
              <ResultLine r={utilResults['scale'] ?? null} />
            </div>

            <div className="card" style={{ margin: '0 0 6px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Zoom Punch at Playhead</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(+e.target.value)}
                  min={100}
                  max={200}
                  style={{ width: 64, fontSize: 11, padding: '4px 6px' }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>%</span>
                <button
                  className="btn-primary"
                  disabled={!!utilBusy}
                  onClick={() => utilAct('zpunch', () => callFn('addZoomPunchAtPlayhead', zoomScale))}
                  style={{ fontSize: 10, flex: 1 }}
                >
                  {utilBusy === 'zpunch' ? '…' : 'Zoom Punch'}
                </button>
              </div>
              <ResultLine r={utilResults['zpunch'] ?? null} />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
