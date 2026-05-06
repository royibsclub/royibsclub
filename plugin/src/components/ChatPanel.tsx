import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import type { ChatMessage, TimelineState, Platform } from '@premiere-ai/shared';

interface Props {
  timeline: TimelineState | null;
  platform: Platform;
  creatorId: string;
}

export default function ChatPanel({ timeline, platform, creatorId }: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentResponse]);

  function send() {
    if (!input.trim() || streaming) return;
    const msg = input.trim();
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() };
    setHistory((h) => [...h, userMsg]);
    setStreaming(true);
    setCurrentResponse('');

    let accumulated = '';

    api.streamChat(
      { message: msg, history, timelineState: timeline ?? undefined, platform, creatorId },
      (chunk) => {
        accumulated += chunk;
        setCurrentResponse(accumulated);
      },
      () => {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
        };
        setHistory((h) => [...h, assistantMsg]);
        setCurrentResponse('');
        setStreaming(false);
      },
      (err) => {
        setCurrentResponse(`שגיאה: ${err}`);
        setStreaming(false);
      }
    );
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="scrollable" style={{ flex: 1, padding: '10px' }}>
        {history.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40, lineHeight: 1.8 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
            <div>שאל אותי על הסרטון שלך</div>
            <div style={{ fontSize: 11, marginTop: 8 }}>
              ניתוח · עריכה · המלצות · ביצוע ישיר
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {streaming && currentResponse && (
          <MessageBubble
            msg={{ role: 'assistant', content: currentResponse, timestamp: Date.now() }}
            isStreaming
          />
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: '10px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="שאל שאלה או בקש עריכה... (Enter לשליחה)"
            rows={2}
            style={{ flex: 1, fontSize: 12, direction: 'rtl' }}
            disabled={streaming}
          />
          <button
            className="btn-primary"
            onClick={send}
            disabled={streaming || !input.trim()}
            style={{ padding: '8px 14px', flexShrink: 0 }}
          >
            {streaming ? '...' : '▶'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              className="btn-ghost"
              style={{ fontSize: 10, padding: '3px 8px' }}
              onClick={() => { setInput(p); }}
              disabled={streaming}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  'נתח את הסרטון',
  'חזק את ההוק',
  'שפר את הקצב',
  'הוסף כתוביות',
  'עיצוב צבע',
];

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          background: isUser ? 'var(--accent)' : 'var(--bg-tertiary)',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          padding: '8px 12px',
          fontSize: 12,
          lineHeight: 1.6,
          direction: 'rtl',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--text-primary)',
          opacity: isStreaming ? 0.85 : 1,
        }}
      >
        {msg.content}
        {isStreaming && <span style={{ opacity: 0.5 }}>▌</span>}
      </div>
    </div>
  );
}
