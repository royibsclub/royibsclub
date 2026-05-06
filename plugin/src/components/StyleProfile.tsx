import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { StyleProfile as IStyleProfile, Platform } from '@premiere-ai/shared';

interface Props {
  creatorId: string;
  onProfileLoaded?: (profile: IStyleProfile) => void;
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'youtube', label: 'YouTube' },
];

export default function StyleProfilePanel({ creatorId, onProfileLoaded }: Props) {
  const [profile, setProfile] = useState<IStyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [creatorId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { profile: p } = await api.getProfile(creatorId);
      setProfile(p);
      onProfileLoaded?.(p);
    } catch {
      // Profile doesn't exist yet — create default
      try {
        const { profile: p } = await api.createProfile(creatorId, 'My Profile');
        setProfile(p);
        onProfileLoaded?.(p);
      } catch {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      await api.saveProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof IStyleProfile>(key: K, value: IStyleProfile[K]) {
    setProfile((p) => p ? { ...p, [key]: value } : p);
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 60 }}>
        טוען פרופיל...
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ color: 'var(--danger)', textAlign: 'center', marginTop: 60 }}>
        לא ניתן לטעון פרופיל
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="scrollable" style={{ flex: 1, padding: 10 }}>

        <div className="section-header">פלטפורמות</div>
        <div className="card">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  const current = profile.platforms;
                  const updated = current.includes(p.value)
                    ? current.filter((x) => x !== p.value)
                    : [...current, p.value];
                  update('platforms', updated);
                }}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  background: profile.platforms.includes(p.value)
                    ? 'rgba(123, 97, 255, 0.25)'
                    : 'var(--bg-tertiary)',
                  color: profile.platforms.includes(p.value)
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                  border: `1px solid ${profile.platforms.includes(p.value) ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 4,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section-header">קצב עריכה</div>
        <div className="card">
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              ממוצע חיתוכים לדקה
            </label>
            <input
              type="number"
              value={profile.editing.averageCutsPerMinute}
              onChange={(e) =>
                update('editing', {
                  ...profile.editing,
                  averageCutsPerMinute: parseFloat(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              סגנון קצב
            </label>
            <select
              value={profile.editing.paceStyle}
              onChange={(e) =>
                update('editing', {
                  ...profile.editing,
                  paceStyle: e.target.value as IStyleProfile['editing']['paceStyle'],
                })
              }
            >
              <option value="fast">מהיר</option>
              <option value="moderate">בינוני</option>
              <option value="slow">איטי</option>
              <option value="dynamic">דינמי</option>
            </select>
          </div>
        </div>

        <div className="section-header">ויז'ואל</div>
        <div className="card">
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              סגנון צבע
            </label>
            <input
              type="text"
              value={profile.visual.colorGrade}
              onChange={(e) => update('visual', { ...profile.visual, colorGrade: e.target.value })}
              placeholder="למשל: warm cinematic, clean bright, moody dark"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              שימוש בזום
            </label>
            <select
              value={profile.visual.zoomFrequency}
              onChange={(e) =>
                update('visual', {
                  ...profile.visual,
                  zoomFrequency: e.target.value as IStyleProfile['visual']['zoomFrequency'],
                })
              }
            >
              <option value="never">אף פעם</option>
              <option value="rarely">לעיתים נדירות</option>
              <option value="sometimes">לפעמים</option>
              <option value="often">הרבה</option>
            </select>
          </div>
        </div>

        <div className="section-header">עמודות תוכן</div>
        <div className="card">
          <input
            type="text"
            value={profile.contentPillars.join(', ')}
            onChange={(e) =>
              update('contentPillars', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
            }
            placeholder="למשל: lifestyle, טיפים עסקיים, בישול"
          />
        </div>

        <div className="section-header">הערות על הקהל</div>
        <div className="card">
          <textarea
            value={profile.audienceNotes}
            onChange={(e) => update('audienceNotes', e.target.value)}
            placeholder="תאר את הקהל שלך — גיל, תחומי עניין, בעיות שהם מחפשים פתרון להן..."
            rows={3}
            style={{ direction: 'rtl' }}
          />
        </div>
      </div>

      <div style={{ padding: 10, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
          style={{ width: '100%' }}
        >
          {saved ? '✓ נשמר' : saving ? 'שומר...' : 'שמור פרופיל'}
        </button>
      </div>
    </div>
  );
}
