// ─── Timeline ───────────────────────────────────────────────────────────────

export interface ClipInfo {
  id: string;
  name: string;
  trackIndex: number;
  trackType: 'video' | 'audio';
  inPoint: number;   // seconds
  outPoint: number;  // seconds
  duration: number;  // seconds
  filePath?: string;
}

export interface TrackInfo {
  index: number;
  type: 'video' | 'audio';
  clips: ClipInfo[];
}

export interface TimelineState {
  sequenceName: string;
  duration: number;
  frameRate: number;
  width: number;
  height: number;
  currentTime: number;
  tracks: TrackInfo[];
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type ActionType =
  | 'cut_clip'
  | 'trim_clip'
  | 'add_zoom'
  | 'add_caption'
  | 'add_effect'
  | 'add_transition'
  | 'adjust_color'
  | 'adjust_audio'
  | 'reorder_clips';

export interface CutClipAction {
  type: 'cut_clip';
  timecode: number;
  trackIndex?: number;
}

export interface TrimClipAction {
  type: 'trim_clip';
  clipId: string;
  inPoint?: number;
  outPoint?: number;
}

export interface AddZoomAction {
  type: 'add_zoom';
  clipId: string;
  startScale: number;
  endScale: number;
  startTime: number;
  endTime: number;
}

export interface AddCaptionAction {
  type: 'add_caption';
  text: string;
  startTime: number;
  endTime: number;
  style?: CaptionStyle;
}

export interface CaptionStyle {
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: 'top' | 'center' | 'bottom';
  bold?: boolean;
}

export interface AddEffectAction {
  type: 'add_effect';
  clipId: string;
  effectName: string;
  params?: Record<string, number | string | boolean>;
}

export interface AddTransitionAction {
  type: 'add_transition';
  clipId: string;
  transitionName: string;
  duration: number;
  position: 'start' | 'end' | 'both';
}

export interface AdjustColorAction {
  type: 'adjust_color';
  clipId: string;
  lumetri: LumetriParams;
}

export interface LumetriParams {
  exposure?: number;
  contrast?: number;
  highlights?: number;
  shadows?: number;
  whites?: number;
  blacks?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
}

export interface AdjustAudioAction {
  type: 'adjust_audio';
  clipId: string;
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  effectName?: string;
}

export interface ReorderClipsAction {
  type: 'reorder_clips';
  clipIds: string[];
}

export type TimelineAction =
  | CutClipAction
  | TrimClipAction
  | AddZoomAction
  | AddCaptionAction
  | AddEffectAction
  | AddTransitionAction
  | AdjustColorAction
  | AdjustAudioAction
  | ReorderClipsAction;

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ─── Analysis ───────────────────────────────────────────────────────────────

export type Platform = 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'youtube' | 'general';

export interface AnalysisRequest {
  timelineState: TimelineState;
  platform: Platform;
  filePath?: string;
  creatorId?: string;
}

export interface VideoAnalysis {
  overallScore: number;           // 0-100
  viralityScore: number;          // 0-100
  retentionScore: number;         // 0-100
  hookStrength: number;           // 0-100
  pacingScore: number;            // 0-100
  hookAnalysis: HookAnalysis;
  pacingAnalysis: PacingAnalysis;
  retentionInsights: RetentionInsight[];
  suggestions: EditingSuggestion[];
  platformFeedback: PlatformFeedback;
}

export interface HookAnalysis {
  firstThreeSeconds: string;
  hookType: string;
  effectiveness: 'weak' | 'moderate' | 'strong' | 'excellent';
  improvements: string[];
}

export interface PacingAnalysis {
  cutsPerMinute: number;
  recommendedCutsPerMinute: number;
  averageClipDuration: number;
  energyFlow: 'too slow' | 'good' | 'too fast' | 'inconsistent';
  slowSections: Array<{ start: number; end: number; reason: string }>;
}

export interface RetentionInsight {
  timecode: number;
  dropOffRisk: 'low' | 'medium' | 'high';
  reason: string;
  fix: string;
}

export interface EditingSuggestion {
  id: string;
  category: 'cut' | 'zoom' | 'caption' | 'effect' | 'audio' | 'color' | 'structure' | 'broll';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action?: TimelineAction;
  timecode?: number;
}

export interface PlatformFeedback {
  platform: Platform;
  score: number;
  strengths: string[];
  weaknesses: string[];
  specificTips: string[];
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  timelineState?: TimelineState;
  platform?: Platform;
  creatorId?: string;
}

export interface ChatResponse {
  message: string;
  suggestions?: EditingSuggestion[];
  actions?: TimelineAction[];
}

// ─── Style Profile ───────────────────────────────────────────────────────────

export interface StyleProfile {
  creatorId: string;
  name: string;
  updatedAt: number;
  editing: {
    averageCutsPerMinute: number;
    preferredTransitions: string[];
    clipLengthPreference: 'short' | 'medium' | 'long';
    paceStyle: 'fast' | 'moderate' | 'slow' | 'dynamic';
  };
  visual: {
    colorGrade: string;
    lumetriPreset?: LumetriParams;
    zoomFrequency: 'never' | 'rarely' | 'sometimes' | 'often';
    aspectRatio?: string;
  };
  audio: {
    musicStyle: string[];
    sfxUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
    voiceoverStyle?: string;
  };
  captions: {
    style: CaptionStyle;
    frequency: 'none' | 'key-moments' | 'full-transcription';
    language: string;
  };
  platforms: Platform[];
  contentPillars: string[];
  audienceNotes: string;
}

// ─── SSE Events ──────────────────────────────────────────────────────────────

export interface SSEEvent {
  type: 'action_request' | 'timeline_update' | 'analysis_progress';
  payload: unknown;
}
