import React, { useState, useEffect } from 'react';
import DashboardPanel from './components/DashboardPanel';
import EffectsPanel from './components/EffectsPanel';
import TextCaptionsPanel from './components/TextCaptionsPanel';
import SceneChecklist from './components/SceneChecklist';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import SettingsPanel from './components/SettingsPanel';
import { callFn } from './premiere/bridge';

type Tab = 'dashboard' | 'effects' | 'captions' | 'checklist' | 'diagnostics' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'effects', label: 'Effects' },
  { id: 'captions', label: 'Captions' },
  { id: 'checklist', label: 'Scenes' },
  { id: 'diagnostics', label: 'Diag' },
  { id: 'settings', label: '⚙' },
];

function fmtSec(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [serverOk, setServerOk] = useState(false);
  const [premiereOk, setPremiereOk] = useState(false);
  const [sequenceName, setSequenceName] = useState('');
  const [playheadSec, setPlayheadSec] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function poll() {
      // Server health
      try {
        const r = await fetch('http://localhost:3333/health');
        if (alive) setServerOk(r.ok);
      } catch {
        if (alive) setServerOk(false);
      }

      // Premiere via bridge
      try {
        const seq = await callFn('getSequenceName');
        if (!alive) return;
        const ok = !seq.startsWith('error') && !seq.startsWith('EvalScript');
        setPremiereOk(ok);
        if (ok) {
          setSequenceName(seq === 'none' ? '' : seq);
          const t = await callFn('getPlayheadTime');
          const n = parseFloat(t);
          if (!isNaN(n)) setPlayheadSec(n);
        } else {
          setSequenceName('');
          setPlayheadSec(null);
        }
      } catch {
        if (alive) {
          setPremiereOk(false);
          setSequenceName('');
        }
      }
    }

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const Dot = ({ ok }: { ok: boolean }) => (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: ok ? 'var(--success)' : 'var(--text-muted)',
        marginRight: 4,
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    />
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

      {/* Status bar */}
      <div
        style={{
          padding: '5px 10px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          fontSize: 10,
        }}
      >
        <span style={{ color: serverOk ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <Dot ok={serverOk} />Server
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: premiereOk ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <Dot ok={premiereOk} />Premiere
        </span>
        {sequenceName && (
          <>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span
              style={{
                flex: 1,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {sequenceName}
            </span>
          </>
        )}
        {playheadSec !== null && (
          <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', flexShrink: 0 }}>
            {fmtSec(playheadSec)}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'dashboard' && <DashboardPanel />}
        {tab === 'effects' && <EffectsPanel />}
        {tab === 'captions' && <TextCaptionsPanel />}
        {tab === 'checklist' && <SceneChecklist />}
        {tab === 'diagnostics' && <DiagnosticsPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
