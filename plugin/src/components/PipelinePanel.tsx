import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { GanttRow, ProductionPackage, PipelineProgress, KnowledgeFile } from '@premiere-ai/shared';

type Screen = 'gantt' | 'running' | 'result' | 'knowledge';

export default function PipelinePanel() {
  const [screen, setScreen] = useState<Screen>('gantt');
  const [rows, setRows] = useState<GanttRow[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress[]>([]);
  const [currentPkg, setCurrentPkg] = useState<ProductionPackage | null>(null);
  const [resultTab, setResultTab] = useState<'script' | 'elevenlabs' | 'prompts' | 'assets' | 'checklist'>('script');

  useEffect(() => {
    loadGantt();
  }, []);

  async function loadGantt() {
    setLoading(true);
    try {
      const data = await api.pipelineGantt();
      setConfigured(data.configured);
      setRows(data.rows);
    } catch {
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  }

  async function startPipeline(row: GanttRow) {
    setProgress([]);
    setCurrentPkg(null);
    setScreen('running');

    api.pipelineStart(row, (p) => {
      setProgress((prev) => [...prev, p]);
      if (p.step === 'done' && (p as { package?: ProductionPackage }).package) {
        setCurrentPkg((p as { package: ProductionPackage }).package);
        setScreen('result');
        setResultTab('script');
      }
    });
  }

  async function markComplete(pkg: ProductionPackage) {
    await api.pipelineComplete(pkg.ganttRow.rowIndex);
    await loadGantt();
    setScreen('gantt');
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        {(['gantt', 'knowledge'] as Screen[]).map((s) => (
          <button
            key={s}
            onClick={() => setScreen(s)}
            style={{
              flex: 1,
              background: 'transparent',
              color: screen === s ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: screen === s ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '8px 4px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 0,
            }}
          >
            {s === 'gantt' ? '📅 גאנט' : '📚 ידע'}
          </button>
        ))}
      </div>

      {screen === 'gantt' && (
        <GanttScreen
          rows={rows}
          configured={configured}
          loading={loading}
          onRefresh={loadGantt}
          onStart={startPipeline}
        />
      )}

      {screen === 'running' && <RunningScreen progress={progress} />}

      {screen === 'result' && currentPkg && (
        <ResultScreen
          pkg={currentPkg}
          tab={resultTab}
          onTabChange={setResultTab}
          onComplete={() => markComplete(currentPkg)}
          onBack={() => setScreen('gantt')}
        />
      )}

      {screen === 'knowledge' && <KnowledgeScreen />}
    </div>
  );
}

// ── Gantt Screen ──────────────────────────────────────────────────────────────

function GanttScreen({ rows, configured, loading, onRefresh, onStart }: {
  rows: GanttRow[];
  configured: boolean;
  loading: boolean;
  onRefresh: () => void;
  onStart: (row: GanttRow) => void;
}) {
  if (!configured) {
    return (
      <div style={{ padding: 16, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 40, lineHeight: 2 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⚙️</div>
        <div>Google Sheets לא מחובר</div>
        <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text-muted)' }}>
          ערוך server/src/data/pipeline-config.json<br />
          והוסף Google Service Account ל-.env
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {rows.length} סרטונים מתוכננים
        </span>
        <button className="btn-ghost" onClick={onRefresh} disabled={loading} style={{ fontSize: 10, padding: '3px 8px' }}>
          {loading ? '...' : '↻ רענן'}
        </button>
      </div>

      <div className="scrollable" style={{ flex: 1 }}>
        {rows.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60, lineHeight: 2, fontSize: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            אין סרטונים בסטטוס "מתוכנן"
          </div>
        )}

        {rows.map((row) => (
          <div key={row.rowIndex} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, direction: 'rtl' }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>
                  {row.contentType}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {row.date} · {row.platform} · {row.character}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  🎯 {row.message}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  🪝 {row.hook}
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={() => onStart(row)}
                style={{ fontSize: 11, padding: '6px 12px', flexShrink: 0 }}
              >
                התחל ▶
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Running Screen ─────────────────────────────────────────────────────────────

const STEP_LABELS: Record<string, string> = {
  fetching_gantt: 'שולף גאנט...',
  generating_script: '✍️ כותב תסריט ויראלי...',
  generating_breakdown: '🎬 מפרק לחומרי ייצור...',
  organizing_files: '📁 מארגן תיקיית פרויקט...',
  updating_sheets: '📊 מעדכן גאנט...',
  done: '✅ מוכן!',
  error: '❌ שגיאה',
};

function RunningScreen({ progress }: { progress: PipelineProgress[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 16 }}>
      <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
        Claude עובד על הסרטון שלך...
      </div>

      <div className="scrollable" style={{ flex: 1 }}>
        {progress.map((p, i) => (
          <div key={i} style={{
            padding: '8px 12px',
            marginBottom: 6,
            background: p.step === 'error' ? 'rgba(244,67,54,0.1)' : p.step === 'done' ? 'rgba(76,175,80,0.1)' : 'var(--bg-tertiary)',
            borderRadius: 6,
            fontSize: 12,
            direction: 'rtl',
            color: p.step === 'error' ? 'var(--danger)' : 'var(--text-primary)',
          }}>
            {STEP_LABELS[p.step] || p.step} — {p.message}
          </div>
        ))}
        {progress.length > 0 && progress[progress.length - 1].step !== 'done' && progress[progress.length - 1].step !== 'error' && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
            ⏳ ממתין...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────

type ResultTab = 'script' | 'elevenlabs' | 'prompts' | 'assets' | 'checklist';

const RESULT_TABS: { id: ResultTab; label: string }[] = [
  { id: 'script', label: 'תסריט' },
  { id: 'elevenlabs', label: 'EL' },
  { id: 'prompts', label: 'פרומפטים' },
  { id: 'assets', label: 'B-roll/SFX' },
  { id: 'checklist', label: '✓ Checklist' },
];

function ResultScreen({ pkg, tab, onTabChange, onComplete, onBack }: {
  pkg: ProductionPackage;
  tab: ResultTab;
  onTabChange: (t: ResultTab) => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={onBack} style={{ fontSize: 10, padding: '2px 8px' }}>← חזור</button>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>חבילת ייצור מוכנה</span>
          <button className="btn-execute" onClick={onComplete} style={{ fontSize: 10 }}>✓ סמן הושלם</button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4, direction: 'rtl' }}>
          {pkg.ganttRow.contentType} · {pkg.ganttRow.character} · {pkg.ganttRow.date}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {RESULT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            style={{
              flex: 1,
              background: 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '7px 2px',
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        {tab === 'script' && <ScriptTab pkg={pkg} />}
        {tab === 'elevenlabs' && <ElevenLabsTab pkg={pkg} />}
        {tab === 'prompts' && <PromptsTab pkg={pkg} />}
        {tab === 'assets' && <AssetsTab pkg={pkg} />}
        {tab === 'checklist' && <ChecklistTab pkg={pkg} />}
      </div>
    </div>
  );
}

// ── Result Tab Components ─────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{ fontSize: 10, padding: '2px 8px' }}
    >
      {copied ? '✓ הועתק' : '📋 העתק'}
    </button>
  );
}

function ScriptTab({ pkg }: { pkg: ProductionPackage }) {
  return (
    <div>
      {pkg.script.map((scene) => (
        <div key={scene.sceneNumber} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
              סצנה {scene.sceneNumber} — {scene.sceneType.toUpperCase()}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{scene.durationSeconds}ש</span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7, direction: 'rtl', color: 'var(--text-primary)' }}>
            {scene.hebrewText}
          </div>
        </div>
      ))}
    </div>
  );
}

function ElevenLabsTab({ pkg }: { pkg: ProductionPackage }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, direction: 'rtl', textAlign: 'center' }}>
        העתק כל סצנה → הדבק ב-ElevenLabs → הורד MP3
      </div>
      {pkg.script.map((scene) => (
        <div key={scene.sceneNumber} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              סצנה {scene.sceneNumber} ({scene.sceneType})
            </span>
            <CopyButton text={scene.elevenlabsText} />
          </div>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 4,
            padding: '8px 10px',
            fontSize: 11,
            lineHeight: 1.8,
            direction: 'rtl',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-secondary)',
          }}>
            {scene.elevenlabsText}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, direction: 'rtl' }}>
            💾 שמור כ: <code>{String(scene.sceneNumber).padStart(2, '0')}_{scene.sceneType}.mp3</code>
          </div>
        </div>
      ))}
    </div>
  );
}

function PromptsTab({ pkg }: { pkg: ProductionPackage }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, direction: 'rtl', textAlign: 'center' }}>
        העתק פרומפט → הכנס לכלי יצירת תמונות
      </div>
      {pkg.breakdown.map((scene) => (
        <div key={scene.sceneNumber} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600 }}>סצנה {scene.sceneNumber}</span>
            <CopyButton text={scene.characterPrompt} />
          </div>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 4,
            padding: '8px 10px',
            fontSize: 11,
            lineHeight: 1.6,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-secondary)',
          }}>
            {scene.characterPrompt}
          </div>
          {scene.aiModelNote && (
            <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 6 }}>
              💡 {scene.aiModelNote}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AssetsTab({ pkg }: { pkg: ProductionPackage }) {
  const allBroll = pkg.breakdown.flatMap((s) => s.broll.map((b) => ({ ...b, scene: s.sceneNumber })));
  const allSfx = pkg.breakdown.flatMap((s) => s.sfx.map((sfx) => ({ ...sfx, scene: s.sceneNumber })));
  const music = pkg.breakdown[0]?.music;

  return (
    <div>
      {music && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>🎵 מוזיקה</div>
          <div style={{ fontSize: 12, direction: 'rtl', lineHeight: 1.8 }}>
            <div>{music.style} · {music.bpm} BPM · {music.mood}</div>
            {music.exampleTrack && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>דוגמה: {music.exampleTrack}</div>}
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>💡 {music.viralNote}</div>
          </div>
        </div>
      )}

      {allSfx.length > 0 && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>🔊 SFX</div>
          {allSfx.map((sfx, i) => (
            <div key={i} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border)', direction: 'rtl' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{sfx.soundName}</span>
              <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>· סצנה {sfx.scene} · {sfx.timingNote} "{sfx.word}"</span>
            </div>
          ))}
        </div>
      )}

      {allBroll.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>🎬 B-roll</div>
          {allBroll.map((b, i) => (
            <div key={i} style={{ fontSize: 11, padding: '6px 0', borderBottom: '1px solid var(--border)', direction: 'rtl' }}>
              <div style={{ fontWeight: 500 }}>סצנה {b.scene} · על "{b.word}"</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{b.description}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>חפש: {b.searchTerms.join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistTab({ pkg }: { pkg: ProductionPackage }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setChecked((p) => ({ ...p, [key]: !p[key] }));

  const CheckItem = ({ id, label }: { id: string; label: string }) => (
    <div
      onClick={() => toggle(id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '5px 0',
        cursor: 'pointer',
        direction: 'rtl',
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0, color: checked[id] ? 'var(--success)' : 'var(--text-muted)' }}>
        {checked[id] ? '✅' : '⬜'}
      </span>
      <span style={{
        fontSize: 11,
        color: checked[id] ? 'var(--text-muted)' : 'var(--text-primary)',
        textDecoration: checked[id] ? 'line-through' : 'none',
        lineHeight: 1.5,
      }}>
        {label}
      </span>
    </div>
  );

  return (
    <div>
      <div className="section-header">אודיו — ElevenLabs</div>
      <div className="card" style={{ marginBottom: 8 }}>
        {pkg.script.map((s) => (
          <CheckItem key={`audio_${s.sceneNumber}`} id={`audio_${s.sceneNumber}`}
            label={`סצנה ${s.sceneNumber} (${s.sceneType}) → ${String(s.sceneNumber).padStart(2, '0')}_${s.sceneType}.mp3`} />
        ))}
      </div>

      <div className="section-header">תמונות דמות</div>
      <div className="card" style={{ marginBottom: 8 }}>
        {pkg.breakdown.map((s) => (
          <CheckItem key={`img_${s.sceneNumber}`} id={`img_${s.sceneNumber}`}
            label={`סצנה ${s.sceneNumber} — פרומפט בטאב "פרומפטים"`} />
        ))}
      </div>

      {pkg.breakdown.flatMap((s) => s.sfx).length > 0 && (
        <>
          <div className="section-header">SFX להורדה</div>
          <div className="card" style={{ marginBottom: 8 }}>
            {pkg.breakdown.flatMap((s, si) =>
              s.sfx.map((sfx, i) => (
                <CheckItem key={`sfx_${si}_${i}`} id={`sfx_${si}_${i}`}
                  label={`${sfx.soundName} — סצנה ${s.sceneNumber}, על "${sfx.word}"`} />
              ))
            )}
          </div>
        </>
      )}

      <div className="section-header">פרמייר פרו</div>
      <div className="card" style={{ marginBottom: 8 }}>
        {['ייבוא קבצי אודיו', 'עריכה ראשונית', 'הוספת מוזיקה', 'הוספת SFX', 'הוספת B-roll', 'כתוביות (פריסט Sunday)', 'גרסה סופית', 'ייצוא', 'תזמון'].map((item) => (
          <CheckItem key={item} id={`pr_${item}`} label={item} />
        ))}
      </div>

      <div className="section-header">סיום</div>
      <div className="card">
        <CheckItem id="gantt_done" label='עדכון גאנט → "הושלם"' />
        <CheckItem id="files_done" label="סדר קבצים" />
      </div>
    </div>
  );
}

// ── Knowledge Screen ──────────────────────────────────────────────────────────

function KnowledgeScreen() {
  const [subTab, setSubTab] = useState<'brain' | 'files'>('brain');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {([['brain', '🧠 Brain'], ['files', '📎 קבצים']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            style={{
              flex: 1,
              background: 'transparent',
              color: subTab === id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: subTab === id ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '7px 4px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 0,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'brain' ? <BrainEditor /> : <KnowledgeFiles />}
    </div>
  );
}

// ── Brain Editor ──────────────────────────────────────────────────────────────

function BrainEditor() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.knowledgeBrainGet()
      .then((data) => { setContent(data.content); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.knowledgeBrainSave(content);
      setSavedAt(new Date());
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function formatSavedAt(d: Date): string {
    const diff = Math.round((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `נשמר לפני ${diff} שניות`;
    return `נשמר ב-${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>טוען...</div>;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: savedAt && !dirty ? 'var(--success)' : 'var(--text-muted)' }}>
          {saving ? 'שומר...' : savedAt ? formatSavedAt(savedAt) : dirty ? 'שינויים לא שמורים' : 'הוראות הכתיבה של Claude'}
        </span>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{ fontSize: 11, padding: '4px 14px' }}
        >
          {saving ? '...' : 'שמור'}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setDirty(true); }}
        dir="auto"
        placeholder="כתוב כאן את הוראות הכתיבה, הסגנון שלך, Brand guide..."
        style={{
          flex: 1,
          resize: 'none',
          border: 'none',
          outline: 'none',
          padding: '10px 12px',
          fontSize: 12,
          lineHeight: 1.7,
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

// ── Knowledge Files ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  brand: '#a78bfa',
  script_examples: '#34d399',
  audience: '#60a5fa',
  guidelines: '#fbbf24',
  other: 'var(--text-muted)',
};

const CATEGORY_LABELS: Record<string, string> = {
  brand: 'מותג',
  script_examples: 'תסריטים',
  audience: 'קהל',
  guidelines: 'הנחיות',
  other: 'אחר',
};

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'mogrt') return '🎬';
  if (ext === 'prfpset' || ext === 'prpreset') return '🎨';
  if (ext === 'pdf') return '📕';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return '🎥';
  if (['mp3', 'wav', 'm4a', 'aac'].includes(ext)) return '🎵';
  if (ext === 'zip' || ext === '7z') return '📦';
  if (['md', 'txt'].includes(ext)) return '📝';
  if (ext === 'docx' || ext === 'doc') return '📄';
  return '📎';
}

function KnowledgeFiles() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [applyMsg, setApplyMsg] = useState<{ name: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadFiles(); }, []);

  async function loadFiles() {
    const data = await api.knowledgeList();
    setFiles(data.files);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.knowledgeUpload(file, 'other');
      await loadFiles();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(name: string) {
    await api.knowledgeDelete(name);
    await loadFiles();
  }

  function handleApplyEffect(f: KnowledgeFile) {
    // Send apply_effect action via the execute endpoint
    fetch('http://localhost:3333/execute/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'add_effect', effectName: f.originalName }),
    })
      .then((r) => r.json())
      .then(() => setApplyMsg({ name: f.originalName, ok: true }))
      .catch(() => setApplyMsg({ name: f.originalName, ok: false }));
    setTimeout(() => setApplyMsg(null), 2500);
  }

  const query = search.trim().toLowerCase();
  const filtered = query
    ? files.filter((f) => f.originalName.toLowerCase().includes(query) || f.category.includes(query))
    : files;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חפש קובץ..."
          dir="rtl"
          style={{
            width: '100%',
            fontSize: 11,
            padding: '6px 10px',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            boxSizing: 'border-box',
            marginBottom: 8,
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,.docx,.mogrt,.prfpset,.prpreset,.zip"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        <button
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ width: '100%', fontSize: 11 }}
        >
          {uploading ? '⏳ מעלה...' : '+ העלה קובץ'}
        </button>
      </div>

      {/* Apply feedback */}
      {applyMsg && (
        <div style={{
          margin: '6px 10px 0',
          padding: '5px 10px',
          fontSize: 10,
          direction: 'rtl',
          borderRadius: 5,
          background: applyMsg.ok ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
          color: applyMsg.ok ? 'var(--success)' : '#ef4444',
          border: `1px solid ${applyMsg.ok ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
          flexShrink: 0,
        }}>
          {applyMsg.ok ? `✓ "${applyMsg.name}" נשלח לפרמייר` : `שגיאה בהחלת "${applyMsg.name}"`}
        </div>
      )}

      {/* Grid */}
      <div className="scrollable" style={{ flex: 1, padding: 10 }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40, fontSize: 12 }}>
            {files.length === 0 ? 'אין קבצים — העלה קובץ להתחיל' : 'לא נמצאו תוצאות'}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {filtered.map((f) => {
            const isEffect = ['mogrt', 'prfpset', 'prpreset'].includes(
              f.originalName.split('.').pop()?.toLowerCase() ?? ''
            );
            return (
              <div
                key={f.name}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                  padding: '10px 10px 8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  minWidth: 0,
                }}
              >
                {/* Icon + name */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{fileIcon(f.originalName)}</span>
                  <div style={{ flex: 1, minWidth: 0, direction: 'rtl' }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--text-primary)',
                    }}>
                      {f.originalName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: `${CATEGORY_COLORS[f.category]}22`,
                        color: CATEGORY_COLORS[f.category],
                        fontWeight: 600,
                      }}>
                        {CATEGORY_LABELS[f.category] ?? f.category}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                        {(f.sizeBytes / 1024).toFixed(0)}KB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {isEffect && (
                    <button
                      className="btn-primary"
                      onClick={() => handleApplyEffect(f)}
                      style={{ flex: 1, fontSize: 9, padding: '3px 0' }}
                    >
                      ✨ החל
                    </button>
                  )}
                  <button
                    className="btn-ghost"
                    onClick={() => handleDelete(f.name)}
                    style={{ fontSize: 9, padding: '3px 8px', color: 'var(--danger)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
