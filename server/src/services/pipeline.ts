import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import type {
  GanttRow,
  ScriptScene,
  SceneBreakdown,
  ProductionPackage,
  PipelineProgress,
} from '@premiere-ai/shared';
import { loadAllKnowledge } from './knowledgeBase';
import { createProjectFolder, writeScriptFiles, writeChecklist, savePackageMeta } from './fileOrganizer';
import { updateRowStatus } from './googleSheets';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

const PIPELINE_BRAIN_PATH = path.join(__dirname, '../data/pipeline-brain.md');
const VIDEO_BRAIN_PATH = path.join(__dirname, '../data/brain.md');

let pipelineBrainCache: string | null = null;
let videoBrainCache: string | null = null;

export const PIPELINE_BRAIN_PATH_EXPORT = PIPELINE_BRAIN_PATH;

export function clearBrainCache(): void {
  pipelineBrainCache = null;
}

function getPipelineBrain(): string {
  if (!pipelineBrainCache) {
    pipelineBrainCache = fs.readFileSync(PIPELINE_BRAIN_PATH, 'utf-8');
  }
  return pipelineBrainCache;
}

function getVideoBrain(): string {
  if (!videoBrainCache) {
    videoBrainCache = fs.readFileSync(VIDEO_BRAIN_PATH, 'utf-8');
  }
  return videoBrainCache;
}

function buildSystemPrompt(): string {
  const userKnowledge = loadAllKnowledge();
  return [
    getVideoBrain(),
    getPipelineBrain(),
    userKnowledge || '',
  ].join('\n\n---\n\n');
}

function buildScriptPrompt(row: GanttRow): string {
  return `צור תסריט ויראלי בעברית על פי הנתונים הבאים מהגאנט השיווקי:

**תאריך פרסום:** ${row.date}
**פלטפורמה:** ${row.platform}
**סוג תוכן:** ${row.contentType}
**דמות:** ${row.character}
**מיקום/רקע:** ${row.location}
**מסר ראשי:** ${row.message}
**הוק מוצע:** ${row.hook}
**הסבר על התוכן:** ${row.description}
**אורך משוער:** ${row.durationSeconds} שניות

הוראות:
1. קח את ההוק המוצע ושפר אותו / השתמש בו כבסיס
2. חלק לסצנות (hook + 1-3 body + cta)
3. כל elevenlabsText — מותאם TTS עם פיסוק נכון, שורות נפרדות
4. שמור על הסגנון שמתאים לפלטפורמה: ${row.platform}

החזר JSON בלבד לפי הפורמט שלמדת.`;
}

function buildBreakdownPrompt(row: GanttRow, script: ScriptScene[]): string {
  const scriptText = script
    .map((s) => `סצנה ${s.sceneNumber} (${s.sceneType}): "${s.hebrewText}" [${s.durationSeconds}ש]`)
    .join('\n');

  return `צור פירוק ייצור שיווקי מלא לתסריט הבא:

**דמות:** ${row.character}
**מיקום/רקע:** ${row.location}
**פלטפורמה:** ${row.platform}
**משך כולל:** ${row.durationSeconds} שניות

**תסריט:**
${scriptText}

הוראות:
1. לכל סצנה: פרומפט מלא לדמות (אנגלית), B-roll מדויק, SFX עם טיימינג, מוזיקה
2. B-roll — ציין את המילה/משפט המדויק מהתסריט שעליו יושב הקליפ
3. SFX — שמות ספציפיים, לא "סאונד מגניב"
4. מוזיקה — בשביל הסרטון כולו, לא לכל סצנה
5. aiModelNote — המלצה פרקטית

החזר JSON בלבד לפי הפורמט שלמדת.`;
}

function parseJsonFromResponse(text: string): unknown {
  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(cleaned);
}

export async function runPipeline(
  row: GanttRow,
  onProgress: (p: PipelineProgress) => void
): Promise<ProductionPackage> {
  const systemPrompt = buildSystemPrompt();

  // ── Step 1: Generate Script ──────────────────────────────────────────────
  onProgress({ step: 'generating_script', message: 'Claude כותב תסריט ויראלי...' });

  const scriptResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } } as Anthropic.TextBlockParam & { cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: buildScriptPrompt(row) }],
  });

  const scriptText = scriptResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const scriptData = parseJsonFromResponse(scriptText) as {
    scenes: ScriptScene[];
  };
  const script = scriptData.scenes;

  // ── Step 2: Generate Breakdown ───────────────────────────────────────────
  onProgress({ step: 'generating_breakdown', message: 'Claude מפרק לחומרי ייצור...' });

  const breakdownResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } } as Anthropic.TextBlockParam & { cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: buildBreakdownPrompt(row, script) }],
  });

  const breakdownText = breakdownResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const breakdownData = parseJsonFromResponse(breakdownText) as {
    breakdown: SceneBreakdown[];
  };
  const breakdown = breakdownData.breakdown;

  // ── Step 3: Organize Files ───────────────────────────────────────────────
  onProgress({ step: 'organizing_files', message: 'מארגן תיקיית פרויקט...' });

  const projectFolder = createProjectFolder(row);
  writeScriptFiles(projectFolder, row, script, breakdown);
  const checklistPath = writeChecklist(projectFolder, row, script, breakdown);

  // ── Step 4: Update Sheets ────────────────────────────────────────────────
  onProgress({ step: 'updating_sheets', message: 'מעדכן גאנט → "בעבודה"...' });

  try {
    await updateRowStatus(row.rowIndex, 'inProgress');
  } catch {
    // Sheets not configured — skip silently
  }

  // ── Build Package ────────────────────────────────────────────────────────
  const pkg: ProductionPackage = {
    id: uuidv4(),
    ganttRow: row,
    script,
    breakdown,
    audioFiles: [],
    projectFolder,
    checklistPath,
    createdAt: Date.now(),
  };

  savePackageMeta(pkg);

  onProgress({ step: 'done', message: 'חבילת הייצור מוכנה!', packageId: pkg.id });
  return pkg;
}
