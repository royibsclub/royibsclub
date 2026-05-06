import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { VideoRecord } from '@premiere-ai/shared';

const PLATFORM_ICONS: Record<string, string> = {
  instagram_reels: '📸',
  tiktok: '🎵',
  youtube_shorts: '▶️',
  facebook_reels: '👤',
};

export default function HistoryPanel() {
  const [records, setRecords] = useState<VideoRecord[]>([]);
  const [selected, setSelected] = useState<VideoRecord | null>(null);
  const [filterChar, setFilterChar] = useState('');

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    const data = await api.historyList();
    setRecords(data.records);
  }

  const characters = [...new Set(records.map((r) => r.character))].sort();
  const filtered = filterChar ? records.filter((r) => r.character === filterChar) : records;

  if (selected) {
    return <PerformanceForm
      record={selected}
      onSave={async (perf, notes, status) => {
        await api.historyUpdatePerformance(selected.id, perf, notes, status);
        await loadHistory();
        setSelected(null);
      }}
      onBack={() => setSelected(null)}
    />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filter */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <select
          value={filterChar}
          onChange={(e) => setFilterChar(e.target.value)}
          style={{ width: '100%', fontSize: 11, padding: '5px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, direction: 'rtl' }}
        >
          <option value="">כל הדמויות ({records.length})</option>
          {characters.map((c) => (
            <option key={c} value={c}>{c} ({records.filter((r) => r.character === c).length})</option>
          ))}
        </select>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60, fontSize: 12, lineHeight: 2 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
            אין היסטוריה עדיין<br />
            <span style={{ fontSize: 11 }}>הסרטונים יופיעו כאן אחרי הפעלת Pipeline</span>
          </div>
        )}
        {filtered.map((r) => (
          <RecordCard key={r.id} record={r} onSelect={() => setSelected(r)} />
        ))}
      </div>
    </div>
  );
}

function RecordCard({ record: r, onSelect }: { record: VideoRecord; onSelect: () => void }) {
  const icon = PLATFORM_ICONS[r.platform] ?? '📱';
  const hasPerf = r.performance !== null;

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', direction: 'rtl' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
            {icon} {r.character} · {r.contentType}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{r.date}</div>
          {r.hookText && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              🪝 {r.hookText.slice(0, 70)}{r.hookText.length > 70 ? '...' : ''}
            </div>
          )}
          {hasPerf && r.performance && (
            <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10 }}>
              <span style={{ color: 'var(--accent)' }}>👁 {r.performance.views.toLocaleString()}</span>
              <span style={{ color: 'var(--text-muted)' }}>❤️ {r.performance.likes.toLocaleString()}</span>
              <span style={{ color: 'var(--text-muted)' }}>💬 {r.performance.comments}</span>
              <span style={{ color: 'var(--text-muted)' }}>🔖 {r.performance.saves}</span>
            </div>
          )}
        </div>
        <button
          className="btn-ghost"
          onClick={onSelect}
          style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, marginRight: 8 }}
        >
          {hasPerf ? 'עדכן' : '+ מדדים'}
        </button>
      </div>
      {r.notes && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, direction: 'rtl', borderTop: '1px solid var(--border)', paddingTop: 5 }}>
          📝 {r.notes}
        </div>
      )}
    </div>
  );
}

function PerformanceForm({ record, onSave, onBack }: {
  record: VideoRecord;
  onSave: (perf: { views: number; likes: number; comments: number; saves: number }, notes: string, status: VideoRecord['status']) => Promise<void>;
  onBack: () => void;
}) {
  const p = record.performance;
  const [views, setViews] = useState(p?.views ?? 0);
  const [likes, setLikes] = useState(p?.likes ?? 0);
  const [comments, setComments] = useState(p?.comments ?? 0);
  const [saves, setSaves] = useState(p?.saves ?? 0);
  const [notes, setNotes] = useState(record.notes ?? '');
  const [status, setStatus] = useState<VideoRecord['status']>(record.status ?? 'produced');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ views, likes, comments, saves }, notes, status);
    } finally {
      setSaving(false);
    }
  }

  const NumField = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, direction: 'rtl' }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        min={0}
        style={{ width: '100%', fontSize: 12, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box', fontWeight: 600 }}
      />
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn-ghost" onClick={onBack} style={{ fontSize: 10 }}>← חזור</button>
        <span style={{ fontSize: 11, fontWeight: 600, direction: 'rtl' }}>{record.character} · {record.date}</span>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize: 11, padding: '4px 12px' }}>
          {saving ? '...' : 'שמור'}
        </button>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        {record.hookText && (
          <div className="card" style={{ marginBottom: 12, direction: 'rtl', fontSize: 11, color: 'var(--text-secondary)' }}>
            🪝 {record.hookText}
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, direction: 'rtl' }}>📊 מדדי ביצוע</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <NumField label="👁 צפיות" value={views} onChange={setViews} />
          <NumField label="❤️ לייקים" value={likes} onChange={setLikes} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <NumField label="💬 תגובות" value={comments} onChange={setComments} />
          <NumField label="🔖 שמירות" value={saves} onChange={setSaves} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, direction: 'rtl' }}>סטטוס</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as VideoRecord['status'])}
            style={{ width: '100%', fontSize: 11, padding: '5px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, direction: 'rtl' }}
          >
            <option value="produced">הופק</option>
            <option value="published">פורסם</option>
            <option value="archived">ארכיון</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, direction: 'rtl' }}>הערות — מה עבד? מה לשפר?</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ההוק עבד מצוין, הCTA היה חלש מדי..."
            rows={4}
            dir="rtl"
            style={{ width: '100%', resize: 'vertical', fontSize: 11, padding: '6px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, boxSizing: 'border-box' }}
          />
        </div>
      </div>
    </div>
  );
}
