import React, { useState, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import AnalysisPanel from './components/AnalysisPanel';
import StyleProfilePanel from './components/StyleProfile';
import ResearchPanel from './components/ResearchPanel';
import PipelinePanel from './components/PipelinePanel';
import { pushTimelineState, startActionPolling } from './services/premiereService';
import type { TimelineState, Platform, StyleProfile } from '@premiere-ai/shared';

type Tab = 'chat' | 'analysis' | 'pipeline' | 'research' | 'profile';

const DEFAULT_CREATOR_ID = 'default';

export default function App() {
  const [tab, setTab] = useState<Tab>('chat');
  const [timeline, setTimeline] = useState<TimelineState | null>(null);
  const [platform, setPlatform] = useState<Platform>('instagram_reels');
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState<StyleProfile | null>(null);

  useEffect(() => {
    // Start polling for pending actions from the server
    startActionPolling(1500);

    // Push timeline state every 3 seconds
    const interval = setInterval(async () => {
      try {
        const state = await pushTimelineState();
        if (state) {
          setTimeline(state);
          setConnected(true);
        }
      } catch {
        setConnected(false);
      }
    }, 3000);

    // Initial push
    pushTimelineState().then((state) => {
      if (state) { setTimeline(state); setConnected(true); }
    }).catch(() => setConnected(false));

    return () => clearInterval(interval);
  }, []);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'chat', label: 'צ\'אט' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'analysis', label: 'ניתוח' },
    { id: 'research', label: 'מחקר' },
    { id: 'profile', label: 'פרופיל' },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>AI Editor</span>
        <div style={{ flex: 1 }} />

        {/* Platform selector */}
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          style={{ fontSize: 10, padding: '2px 6px', width: 'auto' }}
        >
          <option value="tiktok">TikTok</option>
          <option value="instagram_reels">Reels</option>
          <option value="youtube_shorts">YT Shorts</option>
          <option value="youtube">YouTube</option>
        </select>

        {/* Connection indicator */}
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: connected ? 'var(--success)' : 'var(--text-muted)',
            flexShrink: 0,
          }}
          title={connected ? 'מחובר ל-Premiere' : 'לא מחובר'}
        />
      </div>

      {/* Tabs */}
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
        {tab === 'chat' && (
          <ChatPanel timeline={timeline} platform={platform} creatorId={DEFAULT_CREATOR_ID} />
        )}
        {tab === 'analysis' && (
          <AnalysisPanel timeline={timeline} platform={platform} creatorId={DEFAULT_CREATOR_ID} />
        )}
        {tab === 'pipeline' && (
          <PipelinePanel />
        )}
        {tab === 'research' && (
          <ResearchPanel platform={platform} />
        )}
        {tab === 'profile' && (
          <StyleProfilePanel
            creatorId={DEFAULT_CREATOR_ID}
            onProfileLoaded={(p) => setProfile(p)}
          />
        )}
      </div>

      {/* Footer: timeline info */}
      {timeline && (
        <div
          style={{
            padding: '4px 10px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border)',
            fontSize: 10,
            color: 'var(--text-muted)',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span>{timeline.sequenceName}</span>
          <span>{timeline.duration.toFixed(1)}ש</span>
          <span>{timeline.width}×{timeline.height}</span>
          <span>{timeline.frameRate}fps</span>
          {profile && <span style={{ marginRight: 'auto', color: 'var(--text-secondary)' }}>{profile.name}</span>}
        </div>
      )}
    </div>
  );
}
