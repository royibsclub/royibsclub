import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface SettingsStatus {
  anthropic: { configured: boolean; source: string; preview: string };
  openai: { configured: boolean; source: string; preview: string };
  sheets: { configured: boolean; path: string };
  outputDir: { configured: boolean; path: string };
}

const StatusBadge = ({ ok }: { ok: boolean }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 10,
      background: ok ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
      color: ok ? 'var(--success)' : '#f59e0b',
    }}
  >
    {ok ? '✓ מוגדר' : '⚠ חסר'}
  </span>
);

interface KeyCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  configured: boolean;
  preview?: string;
  source?: string;
  fieldKey: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  isPath?: boolean;
}

function KeyCard({
  icon, title, subtitle, configured, preview, source,
  fieldKey, placeholder, value, onChange, isPath,
}: KeyCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
        <StatusBadge ok={configured} />
      </div>

      {configured && !editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flex: 1 }}>
            {isPath ? preview : preview}
            {source === 'env' && <span style={{ marginRight: 6, color: 'var(--text-muted)', opacity: 0.7 }}>(מ-.env)</span>}
          </span>
          <button
            onClick={() => { onChange(value || ''); setEditing(true); }}
            style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            ערוך
          </button>
        </div>
      )}

      {(!configured || editing) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            type={isPath ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              fontSize: 11,
              padding: '5px 8px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontFamily: 'monospace',
            }}
          />
          {editing && (
            <button
              onClick={() => setEditing(false)}
              style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ביטול
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPanel() {
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [sheetsPath, setSheetsPath] = useState('');
  const [outputDir, setOutputDir] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.settingsStatus();
      setStatus(s);
      setSheetsPath(s.sheets.path || '');
      setOutputDir(s.outputDir.path || '~/Videos');
    } catch {
      // server not running yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (anthropicKey.trim()) body.anthropicApiKey = anthropicKey.trim();
      if (openaiKey.trim()) body.openaiApiKey = openaiKey.trim();
      if (sheetsPath.trim()) body.googleServiceAccountPath = sheetsPath.trim();
      if (outputDir.trim()) body.videosOutputDir = outputDir.trim();

      await api.settingsSave(body);
      setAnthropicKey('');
      setOpenaiKey('');
      await loadStatus();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        טוען...
      </div>
    );
  }

  const s = status;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="scrollable" style={{ flex: 1, padding: '12px 12px 0' }}>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, direction: 'rtl', lineHeight: 1.6 }}>
          הגדר כאן את כל מפתחות ה-API. המפתחות נשמרים בקובץ מקומי בשרת ואינם עוזבים את המחשב שלך.
        </div>

        <KeyCard
          icon="🤖"
          title="Anthropic API Key"
          subtitle="נדרש לתסריטים, צ'אט וניתוח"
          configured={s?.anthropic.configured ?? false}
          preview={s?.anthropic.preview}
          source={s?.anthropic.source}
          fieldKey="anthropic"
          placeholder="sk-ant-api03-..."
          value={anthropicKey}
          onChange={setAnthropicKey}
        />

        <KeyCard
          icon="🎙️"
          title="OpenAI API Key"
          subtitle="נדרש לזיהוי דיבור עברית (Whisper)"
          configured={s?.openai.configured ?? false}
          preview={s?.openai.preview}
          source={s?.openai.source}
          fieldKey="openai"
          placeholder="sk-proj-..."
          value={openaiKey}
          onChange={setOpenaiKey}
        />

        <KeyCard
          icon="📊"
          title="Google Sheets — נתיב קובץ Service Account"
          subtitle="נדרש לגאנט — JSON שהורדת מ-Google Cloud"
          configured={s?.sheets.configured ?? false}
          preview={s?.sheets.path || ''}
          fieldKey="sheets"
          placeholder="./google-service-account.json"
          value={sheetsPath}
          onChange={setSheetsPath}
          isPath
        />

        <KeyCard
          icon="📁"
          title="תיקיית ייצוא"
          subtitle="לאן ישמרו תיקיות הפרויקטים"
          configured={true}
          preview={s?.outputDir.path || '~/Videos'}
          fieldKey="outputDir"
          placeholder="~/Videos"
          value={outputDir}
          onChange={setOutputDir}
          isPath
        />

        <div
          style={{
            marginTop: 4,
            padding: '10px 14px',
            background: 'rgba(var(--accent-rgb, 99,102,241),0.08)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 10,
            color: 'var(--text-muted)',
            direction: 'rtl',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: 'var(--text-secondary)' }}>💡 טיפ:</strong> מפתחות שהוגדרו ב-.env ממשיכים לעבוד.
          המפתחות שתגדיר כאן יחליפו אותם בזמן ריצה בלבד (מאוחסנים ב-runtime-settings.json).
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
          style={{ flex: 1, fontSize: 12 }}
        >
          {saving ? '⏳ שומר...' : '💾 שמור הגדרות'}
        </button>
        {saved && <span style={{ fontSize: 11, color: 'var(--success)', flexShrink: 0 }}>✓ נשמר</span>}
      </div>
    </div>
  );
}
