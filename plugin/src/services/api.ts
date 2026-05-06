const BASE_URL = 'http://localhost:3333';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json() as Promise<T>;
}

import type {
  TimelineState,
  Platform,
  ChatMessage,
  StyleProfile,
  TimelineAction,
  ActionResult,
  GanttRow,
  ProductionPackage,
  PipelineProgress,
  KnowledgeFile,
} from '@premiere-ai/shared';

export const api = {
  health: () => get<{ status: string }>('/health'),

  analyze: (payload: {
    timelineState: TimelineState;
    platform: Platform;
    filePath?: string;
    creatorId?: string;
  }) => post<{ analysis: string }>('/analyze', payload),

  chat: (payload: {
    message: string;
    history: ChatMessage[];
    timelineState?: TimelineState;
    platform?: Platform;
    creatorId?: string;
  }) => post<{ response: string }>('/chat/agent', payload),

  streamChat: (
    payload: {
      message: string;
      history: ChatMessage[];
      timelineState?: TimelineState;
      platform?: Platform;
      creatorId?: string;
    },
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ): void => {
    fetch(`${BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok || !res.body) throw new Error(res.statusText);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const pump = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (done) { onDone(); return; }
            const text = decoder.decode(value);
            const lines = text.split('\n').filter((l) => l.startsWith('data: '));
            for (const line of lines) {
              const data = JSON.parse(line.slice(6)) as { type: string; content?: string };
              if (data.type === 'text' && data.content) onChunk(data.content);
              if (data.type === 'done') onDone();
              if (data.type === 'error') onError(data.content || 'Unknown error');
            }
            return pump();
          });
        return pump();
      })
      .catch((err: Error) => onError(err.message));
  },

  pushTimeline: (state: TimelineState) =>
    post<{ ok: boolean }>('/execute/timeline', { state }),

  getPendingActions: () =>
    get<{ actions: Array<{ id: string; action: TimelineAction }> }>('/execute/pending'),

  reportResult: (actionId: string, result: ActionResult) =>
    post<{ ok: boolean }>('/execute/result', { actionId, result }),

  getProfile: (creatorId: string) =>
    get<{ profile: StyleProfile }>(`/profile/${creatorId}`),

  saveProfile: (profile: StyleProfile) =>
    post<{ profile: StyleProfile }>(`/profile/${profile.creatorId}`, profile),

  createProfile: (creatorId: string, name: string) =>
    post<{ profile: StyleProfile }>('/profile', { creatorId, name }),

  research: (topic: string, platform?: Platform, niche?: string) =>
    post<{ research: string }>('/research', { topic, platform, niche }),

  // ── Pipeline ──────────────────────────────────────────────────────────────

  pipelineGantt: () =>
    get<{ configured: boolean; rows: GanttRow[]; message?: string }>('/pipeline/gantt'),

  pipelineStart: (
    row: GanttRow,
    onProgress: (p: PipelineProgress & { package?: ProductionPackage }) => void
  ): void => {
    fetch(`${BASE_URL}/pipeline/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row }),
    })
      .then((res) => {
        if (!res.ok || !res.body) throw new Error(res.statusText);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const pump = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (done) return;
            const text = decoder.decode(value);
            const lines = text.split('\n').filter((l) => l.startsWith('data: '));
            for (const line of lines) {
              const data = JSON.parse(line.slice(6)) as PipelineProgress & { package?: ProductionPackage };
              onProgress(data);
            }
            return pump();
          });
        return pump();
      })
      .catch((err: Error) => onProgress({ step: 'error', message: err.message }));
  },

  pipelineComplete: (rowIndex: number) =>
    post<{ ok: boolean }>('/pipeline/complete', { rowIndex }),

  pipelineProjects: () =>
    get<{ projects: ProductionPackage[] }>('/pipeline/projects'),

  // ── Knowledge ─────────────────────────────────────────────────────────────

  knowledgeList: () =>
    get<{ files: KnowledgeFile[] }>('/knowledge/list'),

  knowledgeUpload: async (file: File, category: KnowledgeFile['category']): Promise<KnowledgeFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    const res = await fetch(`${BASE_URL}/knowledge/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(res.statusText);
    return ((await res.json()) as { file: KnowledgeFile }).file;
  },

  knowledgeDelete: (name: string) =>
    fetch(`${BASE_URL}/knowledge/delete/${encodeURIComponent(name)}`, { method: 'DELETE' })
      .then((r) => r.json() as Promise<{ ok: boolean }>),

  knowledgeBrainGet: () =>
    get<{ content: string }>('/knowledge/brain'),

  knowledgeBrainSave: (content: string) =>
    post<{ ok: boolean }>('/knowledge/brain', { content }),
};
