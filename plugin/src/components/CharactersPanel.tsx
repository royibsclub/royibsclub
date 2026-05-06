import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Character } from '@premiere-ai/shared';

const EMPTY: Omit<Character, 'createdAt' | 'updatedAt'> = {
  id: '', displayName: '', visualDescription: '', referenceImages: [],
  voiceTone: '', personality: '', speakingStyle: '',
  contentTypes: [], cameraStyle: '', editingStyle: '', platform: '', notes: '',
};

export default function CharactersPanel() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Omit<Character, 'createdAt' | 'updatedAt'> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCharacters(); }, []);

  async function loadCharacters() {
    const data = await api.charactersList();
    setCharacters(data.characters);
  }

  function openNew() {
    setSelected({ ...EMPTY });
    setIsNew(true);
  }

  function openEdit(c: Character) {
    setSelected({ ...c });
    setIsNew(false);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.characterSave(selected);
      await loadCharacters();
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.characterDelete(id);
    await loadCharacters();
    setSelected(null);
  }

  if (selected) {
    return <CharacterForm
      character={selected}
      isNew={isNew}
      saving={saving}
      onChange={setSelected}
      onSave={handleSave}
      onDelete={isNew ? undefined : () => handleDelete(selected.id)}
      onBack={() => setSelected(null)}
    />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{characters.length} דמויות</span>
        <button className="btn-primary" onClick={openNew} style={{ fontSize: 11, padding: '4px 12px' }}>+ הוסף דמות</button>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        {characters.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60, lineHeight: 2, fontSize: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎭</div>
            אין דמויות עדיין<br />
            <span style={{ fontSize: 11 }}>הוסף דמות כדי שהמערכת תדע לכתוב בסגנונה</span>
          </div>
        )}
        {characters.map((c) => (
          <div key={c.id} className="card" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => openEdit(c)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ direction: 'rtl' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.displayName}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.platform} · {c.contentTypes.slice(0, 2).join(', ')}
                </div>
                {c.voiceTone && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {c.voiceTone.slice(0, 60)}{c.voiceTone.length > 60 ? '...' : ''}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 18 }}>›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CharacterForm({ character, isNew, saving, onChange, onSave, onDelete, onBack }: {
  character: Omit<Character, 'createdAt' | 'updatedAt'>;
  isNew: boolean;
  saving: boolean;
  onChange: (c: Omit<Character, 'createdAt' | 'updatedAt'>) => void;
  onSave: () => void;
  onDelete?: () => void;
  onBack: () => void;
}) {
  const set = (key: keyof typeof character, value: unknown) =>
    onChange({ ...character, [key]: value });

  const Field = ({ label, field, multiline = false, placeholder = '' }: {
    label: string; field: keyof typeof character; multiline?: boolean; placeholder?: string;
  }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, direction: 'rtl' }}>{label}</div>
      {multiline ? (
        <textarea
          value={(character[field] as string) || ''}
          onChange={(e) => set(field, e.target.value)}
          placeholder={placeholder}
          dir="auto"
          rows={3}
          style={{ width: '100%', resize: 'vertical', fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box' }}
        />
      ) : (
        <input
          type="text"
          value={(character[field] as string) || ''}
          onChange={(e) => set(field, e.target.value)}
          placeholder={placeholder}
          dir="auto"
          style={{ width: '100%', fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box' }}
        />
      )}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn-ghost" onClick={onBack} style={{ fontSize: 10 }}>← חזור</button>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{isNew ? 'דמות חדשה' : character.displayName}</span>
        <button className="btn-primary" onClick={onSave} disabled={saving || !character.id || !character.displayName} style={{ fontSize: 11, padding: '4px 12px' }}>
          {saving ? '...' : 'שמור'}
        </button>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, direction: 'rtl' }}>שם (ID בגאנט) *</div>
            <input
              type="text"
              value={character.id}
              onChange={(e) => set('id', e.target.value)}
              placeholder="דרור"
              disabled={!isNew}
              dir="rtl"
              style={{ width: '100%', fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box', opacity: isNew ? 1 : 0.6 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, direction: 'rtl' }}>שם תצוגה *</div>
            <input
              type="text"
              value={character.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              placeholder="דרור כהן"
              dir="rtl"
              style={{ width: '100%', fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <Field label="תיאור ויזואלי לפרומפטים (אנגלית)" field="visualDescription" multiline placeholder="Israeli man, early 30s, casual attire, confident smile..." />
        <Field label="אישיות — מי הדמות, ערכים, רקע" field="personality" multiline placeholder="יזם בתחום הנדל&quot;ן, מאמין בחינוך פיננסי..." />
        <Field label="טון דיבור" field="voiceTone" placeholder="ישיר, חם, מקצועי, עם הומור קל" />
        <Field label="סגנון דיבור + דוגמת משפטים" field="speakingStyle" multiline placeholder="'אני אגיד לך משהו שאף אחד לא מספר לך...'" />

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, direction: 'rtl' }}>סוגי תוכן (מופרד בפסיקים)</div>
          <input
            type="text"
            value={character.contentTypes.join(', ')}
            onChange={(e) => set('contentTypes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="טיפ מקצועי, סיפור אישי, ריאקציה"
            dir="rtl"
            style={{ width: '100%', fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box' }}
          />
        </div>

        <Field label="סגנון שוטים ותאורה" field="cameraStyle" placeholder="close-up פנים, תאורה נקייה, רקע מטושטש" />
        <Field label="סגנון עריכה" field="editingStyle" placeholder="קאטים מהירים, jump cuts, מעברים מינימליים" />
        <Field label="פלטפורמה ראשית" field="platform" placeholder="Instagram Reels" />
        <Field label="הערות נוספות" field="notes" multiline />

        {onDelete && (
          <button
            onClick={onDelete}
            style={{ width: '100%', marginTop: 8, padding: '8px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
          >
            מחק דמות
          </button>
        )}
      </div>
    </div>
  );
}
