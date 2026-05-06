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

// ─── Studio Pipeline ─────────────────────────────────────────────────────────

export interface GanttRow {
  rowIndex: number;
  date: string;
  platform: Platform;
  contentType: string;
  character: string;
  location: string;
  message: string;
  hook: string;
  description: string;
  durationSeconds: number;
  status: 'מתוכנן' | 'בעבודה' | 'הושלם';
}

export interface ScriptScene {
  sceneNumber: number;
  sceneType: 'hook' | 'body' | 'cta';
  hebrewText: string;          // הטקסט הנאמר
  elevenlabsText: string;      // גרסה מסומנת ל-TTS
  durationSeconds: number;     // משך משוער
}

export interface BrollItem {
  word: string;                // המילה/משפט שעליו יושב ה-B-roll
  description: string;        // מה צריך לראות
  searchTerms: string[];
  durationSeconds: number;
}

export interface SfxItem {
  word: string;               // המילה/משפט שעליו יושב ה-SFX
  soundName: string;          // שם הסאונד
  category: 'transition' | 'impact' | 'ambient' | 'comedic';
  timingNote: string;         // "על המילה" / "לפני" / "אחרי"
}

export interface MusicRecommendation {
  style: string;
  bpm: number;
  mood: string;
  exampleTrack?: string;
  viralNote: string;          // למה זה עובד לפלטפורמה הזו
}

export interface SceneBreakdown {
  sceneNumber: number;
  characterPrompt: string;    // פרומפט לתמונת דמות
  broll: BrollItem[];
  sfx: SfxItem[];
  music: MusicRecommendation;
  aiModelNote: string;        // המלצה על מודל ליצירה
}

export interface ProductionPackage {
  id: string;
  ganttRow: GanttRow;
  script: ScriptScene[];
  breakdown: SceneBreakdown[];
  projectFolder: string;
  checklistPath: string;
  createdAt: number;
}

export type PipelineStep =
  | 'fetching_gantt'
  | 'generating_script'
  | 'generating_breakdown'
  | 'organizing_files'
  | 'updating_sheets'
  | 'done'
  | 'error';

export interface PipelineProgress {
  step: PipelineStep;
  message: string;
  packageId?: string;
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export interface KnowledgeFile {
  name: string;
  originalName: string;
  uploadedAt: number;
  sizeBytes: number;
  category: 'brand' | 'script_examples' | 'audience' | 'guidelines' | 'other';
}

// ─── Characters ───────────────────────────────────────────────────────────────

export interface Character {
  id: string;                  // חייב להתאים בדיוק לשם בגאנט
  displayName: string;
  visualDescription: string;  // תיאור ויזואלי מלא לפרומפטים (אנגלית)
  referenceImages: string[];  // URLs לתמונות מאושרות
  voiceTone: string;           // "ישיר, חם, מקצועי..."
  personality: string;         // מי הדמות — רקע, ערכים
  speakingStyle: string;       // סגנון דיבור + דוגמת משפטים
  contentTypes: string[];      // ["טיפ מקצועי", "סיפור אישי"]
  cameraStyle: string;         // שוטים, תאורה, זווית
  editingStyle: string;        // קצב עריכה, סגנון מעברים
  platform: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Brand Settings ───────────────────────────────────────────────────────────

export interface BrandSettings {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    textOnDark: string;
  };
  fonts: {
    title: string;
    body: string;
    captions: string;
  };
  captions: {
    preset: string;        // "Sunday"
    style: string;
    animationType: string;
  };
  music: {
    genres: string[];
    bpmRange: { min: number; max: number };
    viralNotes: string;
  };
  editing: {
    cutStyle: string;
    transitionTypes: string[];
    pacing: string;
    rules: string;
  };
  logo: {
    position: string;
    opacity: number;
    notes: string;
  };
  updatedAt: number;
}

// ─── Video History ────────────────────────────────────────────────────────────

export interface VideoPerformance {
  views: number;
  likes: number;
  comments: number;
  saves: number;
  recordedAt: number;
}

export interface VideoRecord {
  id: string;                   // = ProductionPackage.id
  character: string;
  contentType: string;
  platform: string;
  date: string;
  hookText: string;
  scriptSummary: string;        // 200 תווים ראשונים
  projectFolder: string;
  performance: VideoPerformance | null;
  notes: string;
  createdAt: number;
  status: 'produced' | 'published' | 'archived';
}
