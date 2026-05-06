import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { BrandSettings } from '@premiere-ai/shared';

const DEFAULT: BrandSettings = {
  colors: { primary: '', secondary: '', accent: '', textOnDark: '' },
  fonts: { title: '', body: '', captions: '' },
  captions: { preset: 'Sunday', style: '', animationType: 'word-by-word' },
  music: { genres: [], bpmRange: { min: 100, max: 140 }, viralNotes: '' },
  editing: { cutStyle: '', transitionTypes: [], pacing: '', rules: '' },
  logo: { position: 'bottom-right', opacity: 0.8, notes: '' },
  updatedAt: 0,
};

export default function BrandPanel() {
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    api.brandGet().then((d) => setBrand(d.brand)).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { brand: updated } = await api.brandSave(brand);
      setBrand(updated);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  const setColors = (key: keyof BrandSettings['colors'], v: string) =>
    setBrand((b) => ({ ...b, colors: { ...b.colors, [key]: v } }));
  const setFonts = (key: keyof BrandSettings['fonts'], v: string) =>
    setBrand((b) => ({ ...b, fonts: { ...b.fonts, [key]: v } }));
  const setCaptions = (key: keyof BrandSettings['captions'], v: string) =>
    setBrand((b) => ({ ...b, captions: { ...b.captions, [key]: v } }));
  const setMusic = (key: keyof BrandSettings['music'], v: unknown) =>
    setBrand((b) => ({ ...b, music: { ...b.music, [key]: v } }));
  const setEditing = (key: keyof BrandSettings['editing'], v: unknown) =>
    setBrand((b) => ({ ...b, editing: { ...b.editing, [key]: v } }));
  const setLogo = (key: keyof BrandSettings['logo'], v: unknown) =>
    setBrand((b) => ({ ...b, logo: { ...b.logo, [key]: v } }));

  const SectionHeader = ({ title }: { title: string }) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', padding: '10px 0 5px', direction: 'rtl', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
      {title}
    </div>
  );

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 8, direction: 'rtl' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );

  const TextInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir="auto"
      style={{ width: '100%', fontSize: 11, padding: '5px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box' }}
    />
  );

  const ColorInput = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
        style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000"
        style={{ flex: 1, fontSize: 10, padding: '4px 6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'monospace' }} />
      <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 50, textAlign: 'right' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: savedAt ? 'var(--success)' : 'var(--text-muted)' }}>
          {saving ? 'שומר...' : savedAt ? `נשמר ✓` : 'הגדרות מותג'}
        </span>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: 11, padding: '4px 14px' }}>
          {saving ? '...' : 'שמור'}
        </button>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        <SectionHeader title="🎨 צבעים" />
        <ColorInput value={brand.colors.primary} onChange={(v) => setColors('primary', v)} label="ראשי" />
        <ColorInput value={brand.colors.secondary} onChange={(v) => setColors('secondary', v)} label="משני" />
        <ColorInput value={brand.colors.accent} onChange={(v) => setColors('accent', v)} label="מבטא" />
        <ColorInput value={brand.colors.textOnDark} onChange={(v) => setColors('textOnDark', v)} label="טקסט" />

        <SectionHeader title="🔤 פונטים" />
        <Row label="כותרות"><TextInput value={brand.fonts.title} onChange={(v) => setFonts('title', v)} placeholder="Heebo Bold" /></Row>
        <Row label="גוף"><TextInput value={brand.fonts.body} onChange={(v) => setFonts('body', v)} placeholder="Heebo Regular" /></Row>
        <Row label="כתוביות"><TextInput value={brand.fonts.captions} onChange={(v) => setFonts('captions', v)} placeholder="Heebo Black" /></Row>

        <SectionHeader title="💬 כתוביות" />
        <Row label="פריסט"><TextInput value={brand.captions.preset} onChange={(v) => setCaptions('preset', v)} placeholder="Sunday" /></Row>
        <Row label="סגנון"><TextInput value={brand.captions.style} onChange={(v) => setCaptions('style', v)} placeholder="מודגש, ניגוד גבוה" /></Row>
        <Row label="אנימציה"><TextInput value={brand.captions.animationType} onChange={(v) => setCaptions('animationType', v)} placeholder="word-by-word" /></Row>

        <SectionHeader title="🎵 מוזיקה" />
        <Row label="ז'אנרים (מופרד בפסיקים)">
          <TextInput value={brand.music.genres.join(', ')} onChange={(v) => setMusic('genres', v.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="upbeat pop, lo-fi, trap" />
        </Row>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, direction: 'rtl' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>BPM מינימום</div>
            <input type="number" value={brand.music.bpmRange.min} onChange={(e) => setMusic('bpmRange', { ...brand.music.bpmRange, min: +e.target.value })}
              style={{ width: '100%', fontSize: 11, padding: '5px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>BPM מקסימום</div>
            <input type="number" value={brand.music.bpmRange.max} onChange={(e) => setMusic('bpmRange', { ...brand.music.bpmRange, max: +e.target.value })}
              style={{ width: '100%', fontSize: 11, padding: '5px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }} />
          </div>
        </div>
        <Row label="הערות ויראליות">
          <textarea value={brand.music.viralNotes} onChange={(e) => setMusic('viralNotes', e.target.value)}
            placeholder="בפריים הראשון — להיכנס לביט..." rows={2} dir="rtl"
            style={{ width: '100%', resize: 'vertical', fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box' }} />
        </Row>

        <SectionHeader title="✂️ עריכה" />
        <Row label="סגנון קאט"><TextInput value={brand.editing.cutStyle} onChange={(v) => setEditing('cutStyle', v)} placeholder="fast cuts, jump cuts" /></Row>
        <Row label="מעברים (מופרד בפסיקים)">
          <TextInput value={brand.editing.transitionTypes.join(', ')} onChange={(v) => setEditing('transitionTypes', v.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="zoom, whip pan, fade" />
        </Row>
        <Row label="קצב">
          <TextInput value={brand.editing.pacing} onChange={(v) => setEditing('pacing', v)} placeholder="מהיר — קאט כל 2-3 שניות" />
        </Row>
        <Row label="חוקי עריכה">
          <textarea value={brand.editing.rules} onChange={(e) => setEditing('rules', e.target.value)}
            placeholder="תמיד לפתוח ב-hook חזק. לא להשתמש ב-crossfade..." rows={3} dir="rtl"
            style={{ width: '100%', resize: 'vertical', fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box' }} />
        </Row>

        <SectionHeader title="🏷️ לוגו" />
        <Row label="מיקום"><TextInput value={brand.logo.position} onChange={(v) => setLogo('position', v)} placeholder="bottom-right" /></Row>
        <Row label="שקיפות (0-1)">
          <input type="range" min={0} max={1} step={0.05} value={brand.logo.opacity} onChange={(e) => setLogo('opacity', +e.target.value)}
            style={{ width: '100%' }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{brand.logo.opacity}</span>
        </Row>
        <Row label="הערות"><TextInput value={brand.logo.notes} onChange={(v) => setLogo('notes', v)} /></Row>
      </div>
    </div>
  );
}
