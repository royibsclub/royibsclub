import fs from 'fs';
import path from 'path';
import type { VideoRecord, VideoPerformance, ProductionPackage, ScriptScene } from '@premiere-ai/shared';

const DATA_PATH = path.join(__dirname, '../data/video-history.json');

function load(): VideoRecord[] {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as VideoRecord[];
}

function save(records: VideoRecord[]): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(records, null, 2));
}

export function listRecords(): VideoRecord[] {
  return load().sort((a, b) => b.createdAt - a.createdAt);
}

export function getRecord(id: string): VideoRecord | undefined {
  return load().find((r) => r.id === id);
}

export function addRecord(pkg: ProductionPackage): VideoRecord {
  const hook = (pkg.script.find((s: ScriptScene) => s.sceneType === 'hook') ?? pkg.script[0])?.hebrewText ?? '';
  const scriptSummary = pkg.script
    .map((s: ScriptScene) => s.hebrewText)
    .join(' ')
    .slice(0, 200);

  const record: VideoRecord = {
    id: pkg.id,
    character: pkg.ganttRow.character,
    contentType: pkg.ganttRow.contentType,
    platform: pkg.ganttRow.platform,
    date: pkg.ganttRow.date,
    hookText: hook,
    scriptSummary,
    projectFolder: pkg.projectFolder,
    performance: null,
    notes: '',
    createdAt: pkg.createdAt,
    status: 'produced',
  };

  const all = load();
  const existing = all.findIndex((r) => r.id === pkg.id);
  if (existing >= 0) {
    all[existing] = record;
  } else {
    all.push(record);
  }
  save(all);
  return record;
}

export function updatePerformance(
  id: string,
  performance: Omit<VideoPerformance, 'recordedAt'>,
  notes?: string,
  status?: VideoRecord['status']
): VideoRecord | null {
  const all = load();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return null;

  all[idx] = {
    ...all[idx],
    performance: { ...performance, recordedAt: Date.now() },
    notes: notes ?? all[idx].notes,
    status: status ?? all[idx].status,
  };
  save(all);
  return all[idx];
}

export function getTopByCharacter(character: string, limit = 3): VideoRecord[] {
  return load()
    .filter((r) => r.character.trim() === character.trim() && r.performance !== null)
    .sort((a, b) => (b.performance?.views ?? 0) - (a.performance?.views ?? 0))
    .slice(0, limit);
}

export function getRecentByCharacter(character: string, limit = 3): VideoRecord[] {
  return load()
    .filter((r) => r.character.trim() === character.trim())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function formatHistoryBlock(character: string): string {
  const top = getTopByCharacter(character, 3);
  const recent = getRecentByCharacter(character, 1);
  const parts: string[] = [];

  if (top.length > 0) {
    parts.push(`## למידה מסרטונים קודמים — ${character}\n`);
    parts.push('🏆 TOP PERFORMERS:');
    top.forEach((r, i) => {
      const p = r.performance!;
      parts.push(`${i + 1}. "${r.hookText}" — ${p.views.toLocaleString()} צפיות | ${p.likes.toLocaleString()} לייקים`);
      parts.push(`   תסריט: "${r.scriptSummary.slice(0, 100)}..."`);
      if (r.notes) parts.push(`   📝 ${r.notes}`);
    });
  }

  const last = recent[0];
  if (last && last.performance && last.performance.views < 2000) {
    parts.push(`\n⚠️ הסרטון האחרון קיבל רק ${last.performance.views.toLocaleString()} צפיות.`);
    if (last.notes) parts.push(`   הערות: "${last.notes}"`);
  }

  return parts.join('\n');
}
