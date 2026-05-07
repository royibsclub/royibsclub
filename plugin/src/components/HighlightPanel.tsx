import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  applyHighlightEffect,
  type HighlightMode,
  type HighlightParams,
  type HighlightWaypoint,
} from '../premiere/effects';

interface Waypoint extends HighlightWaypoint {
  id: string;
  label: string;
}

const MODES: { id: HighlightMode; label: string; icon: string; desc: string }[] = [
  { id: 'spotlight', icon: '🔦', label: 'Spotlight', desc: 'ממקד אור + מחשיך שוליים (Lumetri)' },
  { id: 'zoom', icon: '🔍', label: 'Zoom Punch', desc: 'זום פנימה לנקודה עם קייפריימים' },
  { id: 'lens', icon: '🔬', label: 'Lens Magnify', desc: 'עדשת הגדלה מעגלית נעה' },
];

function SliderRow({
  label, value, min, max, step = 1, unit = '', onChange,
}: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, direction: 'rtl' }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 90 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', minWidth: 38, textAlign: 'left', fontFamily: 'monospace' }}>
        {value}{unit}
      </span>
    </div>
  );
}

export default function HighlightPanel() {
  const [mode, setMode] = useState<HighlightMode>('zoom');
  const [size, setSize] = useState(150);
  const [intensity, setIntensity] = useState(60);
  const [feather, setFeather] = useState(80);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [newTime, setNewTime] = useState(0);
  const [newX, setNewX] = useState(960);
  const [newY, setNewY] = useState(540);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const addWaypoint = useCallback(() => {
    const wp: Waypoint = {
      id: uuidv4(),
      label: `נקודה ${waypoints.length + 1}`,
      time: newTime,
      x: newX,
      y: newY,
    };
    setWaypoints((prev) => [...prev, wp].sort((a, b) => a.time - b.time));
  }, [newTime, newX, newY, waypoints.length]);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const apply = useCallback(() => {
    setApplying(true);
    setResult(null);
    try {
      const params: HighlightParams = { size, intensity, feather, waypoints };
      const ok = applyHighlightEffect(mode, params);
      setResult({
        ok,
        msg: ok
          ? 'האפקט הוחל בהצלחה! בדוק Effect Controls בפרמייר.'
          : 'שגיאה — וודא שיש קליפ בטראק 0 וש-QE DOM מופעל.',
      });
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : 'שגיאה לא ידועה' });
    } finally {
      setApplying(false);
    }
  }, [mode, size, intensity, feather, waypoints]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${m}:${sec.padStart(4, '0')}`;
  }

  const currentMode = MODES.find((m) => m.id === mode)!;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Mode selector */}
      <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                flex: 1,
                padding: '7px 4px',
                fontSize: 11,
                fontWeight: mode === m.id ? 700 : 400,
                background: mode === m.id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: mode === m.id ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', direction: 'rtl', marginBottom: 10, padding: '5px 8px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
          {currentMode.icon} {currentMode.desc}
        </div>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: '0 10px' }}>

        {/* Parameters */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, direction: 'rtl' }}>פרמטרים</div>

          <SliderRow
            label={mode === 'zoom' ? 'גודל זום (%)' : 'גודל (px)'}
            value={size}
            min={20}
            max={mode === 'zoom' ? 200 : 400}
            onChange={setSize}
            unit={mode === 'zoom' ? '%' : 'px'}
          />
          <SliderRow
            label="עצמה"
            value={intensity}
            min={10}
            max={100}
            onChange={setIntensity}
            unit="%"
          />
          {mode !== 'zoom' && (
            <SliderRow
              label="רוך (feather)"
              value={feather}
              min={0}
              max={200}
              onChange={setFeather}
              unit="px"
            />
          )}
        </div>

        {/* Waypoints */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, direction: 'rtl' }}>
            נקודות דרך (waypoints)
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginRight: 6 }}>
              — אפקט יאניש בין הנקודות
            </span>
          </div>

          {/* Add waypoint form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
            {[
              { label: 'זמן (שנ)', value: newTime, onChange: setNewTime, min: 0, step: 0.1 },
              { label: 'X (px)', value: newX, onChange: setNewX, min: 0, max: 3840 },
              { label: 'Y (px)', value: newY, onChange: setNewY, min: 0, max: 2160 },
            ].map(({ label, value, onChange, min, max, step }) => (
              <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
                <input
                  type="number"
                  value={value}
                  min={min}
                  max={max}
                  step={step ?? 1}
                  onChange={(e) => onChange(Number(e.target.value))}
                  style={{
                    fontSize: 11,
                    padding: '4px 6px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    width: '100%',
                    fontFamily: 'monospace',
                  }}
                />
              </label>
            ))}
          </div>

          <button
            className="btn-ghost"
            onClick={addWaypoint}
            style={{ width: '100%', fontSize: 11, marginBottom: 8 }}
          >
            📍 הוסף נקודה ב-{formatTime(newTime)} → ({newX}, {newY})
          </button>

          {/* Waypoint list */}
          {waypoints.length === 0 ? (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0', direction: 'rtl' }}>
              אין נקודות — האפקט יוחל סטטי. הוסף נקודות לאנימציה.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {waypoints.map((wp, i) => (
                <div
                  key={wp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 8px',
                    background: 'var(--bg-primary)',
                    borderRadius: 5,
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: 10, color: 'var(--accent)', minWidth: 16, fontWeight: 700 }}>{i + 1}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-secondary)', flex: 1 }}>
                    {formatTime(wp.time)} → ({wp.x}, {wp.y})
                  </span>
                  <button
                    onClick={() => removeWaypoint(wp.id)}
                    style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info note */}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', direction: 'rtl', lineHeight: 1.6, marginBottom: 10, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>💡 איך זה עובד:</strong> האפקט מוחל על הקליפ הראשון בטראק 0.
          לאחר ההחלה, ערוך את הקייפריימים ב-<strong>Effect Controls</strong> לעידון.
          {mode === 'zoom' && ' מיקום X/Y → Motion > Position (ייתכן שצריך לכוון ידנית).'}
          {mode === 'lens' && ' נקודות המרכז מופיעות כקייפריימים על Center.'}
          {mode === 'spotlight' && ' Lumetri Vignette + זום עדין → ניתן לכוון ידנית ב-Effect Controls.'}
        </div>
      </div>

      {/* Apply button */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        {result && (
          <div style={{
            marginBottom: 8,
            padding: '7px 10px',
            borderRadius: 6,
            fontSize: 11,
            direction: 'rtl',
            background: result.ok ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
            color: result.ok ? 'var(--success)' : '#ef4444',
            border: `1px solid ${result.ok ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {result.ok ? '✓ ' : '⚠ '}{result.msg}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={apply}
          disabled={applying}
          style={{ width: '100%', fontSize: 12 }}
        >
          {applying ? '⏳ מחיל אפקט...' : `${currentMode.icon} החל ${currentMode.label} על קליפ נבחר`}
        </button>
      </div>

    </div>
  );
}
