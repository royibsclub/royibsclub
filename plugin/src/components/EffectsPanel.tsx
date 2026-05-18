import React, { useState } from 'react';
import { callFn } from '../premiere/bridge';

type Category = 'zooms' | 'titles' | 'color' | 'voice' | 'sfx' | 'overlays' | 'screen' | 'utility';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'zooms',    label: 'Zooms' },
  { id: 'titles',   label: 'Titles' },
  { id: 'color',    label: 'Color' },
  { id: 'voice',    label: 'Voice' },
  { id: 'sfx',      label: 'SFX' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'screen',   label: 'Screen' },
  { id: 'utility',  label: 'Utility' },
];

interface LumetriPreset {
  id: string;
  name: string;
  desc: string;
  tag: string;
  values: Partial<Record<'temperature'|'tint'|'exposure'|'contrast'|'highlights'|'shadows'|'whites'|'blacks'|'saturation', number>>;
}

const COLOR_PRESETS: LumetriPreset[] = [
  {
    id: 'iphone-fix',
    name: 'iPhone Fix',
    desc: 'Neutral warm-up and shadow lift — corrects the slightly cool and flat look of standard iPhone 16 footage.',
    tag: 'Standard iPhone · Any scene',
    values: { temperature: 8, highlights: -15, shadows: 10, saturation: -5 },
  },
  {
    id: 'cinematic-warm',
    name: 'Cinematic Warm',
    desc: 'Warm, filmic look with lifted shadows and crushed blacks. Gives the "YouTube talking head" feel.',
    tag: 'Interview · Lifestyle · Vlog',
    values: { temperature: 20, contrast: 25, highlights: -20, shadows: 15, whites: -5, blacks: -10, saturation: -15 },
  },
  {
    id: 'cool-modern',
    name: 'Cool & Modern',
    desc: 'Cold, slightly desaturated with higher contrast. Clean, professional social-media look.',
    tag: 'Tech · Business · SaaS Demo',
    values: { temperature: -12, contrast: 15, highlights: -10, shadows: 5, saturation: -8 },
  },
  {
    id: 'documentary',
    name: 'Documentary',
    desc: 'Natural, grounded and desaturated. Minimal processing — looks like it was recorded, not produced.',
    tag: 'Documentary · Educational · Serious',
    values: { contrast: 10, highlights: -15, shadows: 15, saturation: -22 },
  },
  {
    id: 'sunny-airy',
    name: 'Sunny & Airy',
    desc: 'Bright, high-key lifestyle look. Lifts shadows strongly, pulls highlights down for balance.',
    tag: 'Outdoor · Lifestyle · Reels',
    values: { exposure: 0.3, highlights: -25, shadows: 20, whites: 10, temperature: 12, saturation: -10 },
  },
  {
    id: 'apple-log',
    name: 'Apple Log Fix',
    desc: 'Base correction for iPhone 16 Pro Apple Log / ProRes clips. Lifts the flat log image to a usable starting point.',
    tag: 'iPhone 16 Pro · Apple Log · ProRes only',
    values: { exposure: 0.5, contrast: 50, highlights: -35, shadows: 40, whites: 10, blacks: -5, saturation: 25, temperature: 15 },
  },
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

  const [voiceResult, setVoiceResult] = useState<ActionResult | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const [colorResults, setColorResults] = useState<Record<string, ActionResult | null>>({});
  const [colorBusy, setColorBusy] = useState<string | null>(null);

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

  async function applyColor(preset: LumetriPreset) {
    setColorBusy(preset.id);
    setColorResults((prev) => ({ ...prev, [preset.id]: null }));
    const r = await callFn('applyLumetriPreset', JSON.stringify(preset.values));
    const ok = r.startsWith('ok:');
    const manual = r.startsWith('manual:');
    setColorResults((prev) => ({ ...prev, [preset.id]: { ok, value: r } }));
    setColorBusy(null);
  }

  async function doVoicePreset() {
    setVoiceBusy(true);
    setVoiceResult(null);
    const r = await callFn('applyAIVoicePreset');
    const isOk = r.startsWith('ok:');
    const isManual = r.startsWith('manual:');
    setVoiceResult({ ok: isOk, value: r });
    if (isManual) setShowManual(true);
    setVoiceBusy(false);
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
      {/* Category tabs — scrollable so any number of tabs fits */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)', overflowX: 'auto' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            style={{
              flexShrink: 0,
              background: 'transparent',
              color: cat === c.id ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: cat === c.id ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '7px 10px',
              fontSize: 10,
              fontWeight: cat === c.id ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
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

        {/* COLOR */}
        {cat === 'color' && (
          <>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
              Lumetri Color presets tuned for iPhone 16 footage. Applies to the video clip at the current playhead.
            </div>

            {COLOR_PRESETS.map((preset) => {
              const res = colorResults[preset.id] ?? null;
              const busy = colorBusy === preset.id;
              const isManual = res?.value.startsWith('manual:');

              // Build adjustment bars
              const bars = Object.entries(preset.values)
                .filter(([, v]) => v !== undefined)
                .map(([key, val]) => ({ key, val: val as number }));

              return (
                <div key={preset.id} className="card" style={{ margin: '0 0 8px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{preset.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--accent)', marginTop: 1 }}>{preset.tag}</div>
                    </div>
                    <button
                      className="btn-primary"
                      disabled={!!colorBusy}
                      onClick={() => applyColor(preset)}
                      style={{ fontSize: 9, padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {busy ? '…' : 'Apply'}
                    </button>
                  </div>

                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                    {preset.desc}
                  </div>

                  {/* Adjustment bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px' }}>
                    {bars.map(({ key, val }) => {
                      const pct = Math.abs(val) / (key === 'exposure' ? 5 : 100) * 100;
                      const clamped = Math.min(pct, 100);
                      const pos = val >= 0;
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 8, color: 'var(--text-muted)', width: 52, textAlign: 'right', flexShrink: 0, textTransform: 'capitalize' }}>
                            {key}
                          </span>
                          <div style={{ flex: 1, height: 3, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${clamped}%`,
                              background: pos ? '#6366f1' : '#38bdf8',
                              marginLeft: pos ? 0 : `${100 - clamped}%`,
                              borderRadius: 2,
                            }} />
                          </div>
                          <span style={{ fontSize: 8, color: pos ? '#6366f1' : '#38bdf8', width: 26, flexShrink: 0, fontFamily: 'monospace' }}>
                            {val > 0 ? '+' : ''}{val}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Result */}
                  {res && (
                    <div style={{
                      marginTop: 6,
                      fontSize: 10,
                      padding: '5px 8px',
                      borderRadius: 4,
                      background: res.ok ? 'rgba(76,175,80,0.1)' : isManual ? 'rgba(255,152,0,0.1)' : 'rgba(244,67,54,0.1)',
                      color: res.ok ? 'var(--success)' : isManual ? 'var(--warning)' : 'var(--danger)',
                    }}>
                      {res.ok && `✓ ${res.value.replace('ok:', '').replace(/_/g, ' ')}`}
                      {isManual && '⚠ Add Lumetri Color to the clip first — Effects > Video Effects > Color Correction > Lumetri Color — then apply again.'}
                      {!res.ok && !isManual && `✗ ${res.value}`}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.6, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              After applying, fine-tune in Premiere's Lumetri Color panel (Color workspace). Save as a new preset there to reuse across projects.
            </div>
          </>
        )}

        {/* VOICE */}
        {cat === 'voice' && (
          <>
            {/* Header */}
            <div className="card" style={{ margin: '0 0 8px', borderColor: 'rgba(123,97,255,0.3)', background: 'rgba(123,97,255,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>ElevenLabs Humanizer</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Processing chain that makes AI voiceover sound natural — reduces the characteristic ElevenLabs brightness and adds room warmth.
              </div>
            </div>

            {/* Processing chain */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Processing Chain
            </div>

            {[
              {
                step: '1',
                name: 'High-Pass Filter',
                desc: 'Cutoff 80 Hz · 12 dB/oct',
                detail: 'Remove low-frequency rumble. AI voices have no natural floor noise — this cleans the sub-bass.',
                color: '#38bdf8',
              },
              {
                step: '2',
                name: 'Parametric EQ',
                desc: '4 bands',
                detail: [
                  '↑ 150 Hz  +1.5 dB  — body & warmth',
                  '↓ 450 Hz  −1.5 dB  — remove boxiness',
                  '↑ 3000 Hz +1.0 dB  — presence',
                  '↓ 10 kHz  −2.5 dB  — reduce AI brightness',
                ].join('\n'),
                color: '#a78bfa',
                mono: true,
              },
              {
                step: '3',
                name: 'Compressor / Dynamics',
                desc: 'Threshold −18 dB · Ratio 3:1 · Attack 8 ms · Release 80 ms · Makeup +2 dB',
                detail: 'Adds natural level variation. ElevenLabs has perfectly consistent dynamics — compression makes it feel like a real voice.',
                color: '#4ade80',
              },
              {
                step: '4',
                name: 'Studio Reverb',
                desc: 'Room Size 15% · Mix 8% · Pre-delay 3 ms',
                detail: 'Subtle room tone. Without reverb, AI voice sounds like it was recorded in a void. 8% mix is almost imperceptible but adds life.',
                color: '#fb923c',
              },
              {
                step: '5',
                name: 'Hard Limiter',
                desc: 'Max −1 dBFS',
                detail: 'Safety ceiling. Prevents clipping after EQ boost and makeup gain.',
                color: '#f87171',
              },
            ].map((s) => (
              <div key={s.step} className="card" style={{ margin: '0 0 6px', padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, background: s.color + '22',
                    color: s.color, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                  }}>
                    {s.step}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.desc}</span>
                </div>
                <div style={{
                  fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.6,
                  fontFamily: s.mono ? 'monospace' : undefined,
                  whiteSpace: s.mono ? 'pre' : undefined,
                }}>
                  {s.detail}
                </div>
              </div>
            ))}

            {/* Apply button */}
            <div style={{ marginTop: 10 }}>
              <button
                className="btn-primary"
                onClick={doVoicePreset}
                disabled={voiceBusy}
                style={{ width: '100%', fontSize: 11, marginBottom: 6 }}
              >
                {voiceBusy ? '⏳ Applying…' : 'Apply Preset to Audio Clip at Playhead'}
              </button>

              {voiceResult && (
                <div style={{
                  padding: '7px 10px',
                  borderRadius: 5,
                  fontSize: 10,
                  marginBottom: 6,
                  background: voiceResult.ok
                    ? 'rgba(76,175,80,0.1)'
                    : voiceResult.value.startsWith('manual:')
                    ? 'rgba(255,152,0,0.1)'
                    : 'rgba(244,67,54,0.1)',
                  color: voiceResult.ok ? 'var(--success)' : voiceResult.value.startsWith('manual:') ? 'var(--warning)' : 'var(--danger)',
                  border: `1px solid ${voiceResult.ok ? 'rgba(76,175,80,0.3)' : voiceResult.value.startsWith('manual:') ? 'rgba(255,152,0,0.3)' : 'rgba(244,67,54,0.3)'}`,
                  direction: 'ltr',
                }}>
                  {voiceResult.ok && '✓ Effects added — set parameters below manually.'}
                  {voiceResult.value.startsWith('manual:') && `⚠ Clip found (${voiceResult.value.replace('manual:', '').split('_qe_err')[0]}). QE DOM unavailable — apply effects manually.`}
                  {!voiceResult.ok && !voiceResult.value.startsWith('manual:') && `✗ ${voiceResult.value}`}
                </div>
              )}

              {/* Manual steps toggle */}
              <button
                className="btn-ghost"
                onClick={() => setShowManual((v) => !v)}
                style={{ width: '100%', fontSize: 10 }}
              >
                {showManual ? 'Hide Manual Steps' : 'Show Manual Steps (if auto-apply failed)'}
              </button>
            </div>

            {/* Manual steps */}
            {showManual && (
              <div style={{ marginTop: 8, padding: '10px', background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', fontSize: 10, lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11 }}>Manual Steps in Premiere</div>
                <ol style={{ paddingLeft: 14, color: 'var(--text-secondary)' }}>
                  <li>Select the audio clip (voiceover)</li>
                  <li>Open <strong style={{ color: 'var(--text-primary)' }}>Effects</strong> panel → Audio Effects</li>
                  <li>Add <strong style={{ color: 'var(--text-primary)' }}>Parametric Equalizer</strong><br />
                    • Band 1: 150 Hz +1.5 dB<br />
                    • Band 2: 450 Hz −1.5 dB (Q 1.2)<br />
                    • Band 3: 3000 Hz +1.0 dB<br />
                    • Band 4: 10000 Hz −2.5 dB (high shelf)<br />
                    • High-pass: 80 Hz
                  </li>
                  <li>Add <strong style={{ color: 'var(--text-primary)' }}>Dynamics</strong> (compressor)<br />
                    • Threshold: −18 dB · Ratio: 3:1<br />
                    • Attack: 8 ms · Release: 80 ms<br />
                    • Makeup gain: +2 dB
                  </li>
                  <li>Add <strong style={{ color: 'var(--text-primary)' }}>Studio Reverb</strong><br />
                    • Room Size: 15% · Mix: 8% · Pre-delay: 3 ms
                  </li>
                  <li>Add <strong style={{ color: 'var(--text-primary)' }}>Hard Limiter</strong> → Max: −1 dBFS</li>
                  <li>Save as preset: right-click any effect → <em>Save Preset</em> → name it "ElevenLabs Humanizer"</li>
                </ol>
              </div>
            )}
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
