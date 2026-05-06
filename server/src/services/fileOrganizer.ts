import fs from 'fs';
import path from 'path';
import os from 'os';
import type { GanttRow, ScriptScene, SceneBreakdown, ProductionPackage } from '@premiere-ai/shared';

const OUTPUT_BASE = process.env.VIDEOS_OUTPUT_DIR
  ? process.env.VIDEOS_OUTPUT_DIR.replace('~', os.homedir())
  : path.join(os.homedir(), 'Videos');

function slugify(text: string): string {
  return text
    .replace(/[^א-תa-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 30);
}

export function createProjectFolder(row: GanttRow): string {
  const datePart = row.date.replace(/\//g, '-');
  const folderName = `${datePart}_${slugify(row.contentType)}_${slugify(row.character)}`;
  const projectPath = path.join(OUTPUT_BASE, folderName);

  fs.mkdirSync(path.join(projectPath, 'audio'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'prompts'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'assets', 'sfx'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'assets', 'broll'), { recursive: true });

  return projectPath;
}

export function writeScriptFiles(
  projectFolder: string,
  row: GanttRow,
  script: ScriptScene[],
  breakdown: SceneBreakdown[]
): void {
  // ── script.md ─────────────────────────────────────────────────────────────
  const scriptLines = [
    `# תסריט — ${row.contentType} | ${row.character} | ${row.date}`,
    `**פלטפורמה:** ${row.platform}`,
    `**מסר:** ${row.message}`,
    `**הוק מקורי:** ${row.hook}`,
    '',
    '---',
    '',
  ];

  for (const scene of script) {
    scriptLines.push(`## סצנה ${scene.sceneNumber} — ${scene.sceneType.toUpperCase()}`);
    scriptLines.push(`**טקסט:** ${scene.hebrewText}`);
    scriptLines.push(`**משך משוער:** ${scene.durationSeconds} שניות`);
    scriptLines.push('');
  }

  fs.writeFileSync(path.join(projectFolder, 'prompts', 'script.md'), scriptLines.join('\n'));

  // ── elevenlabs.md ─────────────────────────────────────────────────────────
  const elLines = [
    `# ElevenLabs — טקסטים מוכנים להדבקה`,
    `**דמות:** ${row.character}`,
    '',
    '> העתק כל סצנה בנפרד ל-ElevenLabs. שמור את האודיו בתיקיית audio/',
    '',
  ];

  for (const scene of script) {
    elLines.push(`---`);
    elLines.push(`## סצנה ${scene.sceneNumber}: ${scene.sceneType.toUpperCase()}`);
    elLines.push('');
    elLines.push('```');
    elLines.push(scene.elevenlabsText);
    elLines.push('```');
    elLines.push('');
    elLines.push(`🔊 שמור כ: \`${String(scene.sceneNumber).padStart(2, '0')}_${scene.sceneType}.mp3\``);
    elLines.push('');
  }

  fs.writeFileSync(path.join(projectFolder, 'prompts', 'elevenlabs.md'), elLines.join('\n'));

  // ── character_prompts.md ──────────────────────────────────────────────────
  const promptLines = [`# פרומפטים לדמויות — ${row.character}`, ''];

  for (const scene of breakdown) {
    promptLines.push(`## סצנה ${scene.sceneNumber}`);
    promptLines.push('');
    promptLines.push('```');
    promptLines.push(scene.characterPrompt);
    promptLines.push('```');
    promptLines.push('');
    if (scene.aiModelNote) {
      promptLines.push(`💡 ${scene.aiModelNote}`);
      promptLines.push('');
    }
  }

  fs.writeFileSync(
    path.join(projectFolder, 'prompts', 'character_prompts.md'),
    promptLines.join('\n')
  );

  // ── scene_breakdown.md ────────────────────────────────────────────────────
  const breakdownLines = [`# פירוט ייצור לפי סצנות`, ''];

  for (const scene of breakdown) {
    const scriptScene = script.find((s) => s.sceneNumber === scene.sceneNumber);
    breakdownLines.push(`## סצנה ${scene.sceneNumber}`);
    if (scriptScene) {
      breakdownLines.push(`**טקסט:** ${scriptScene.hebrewText}`);
    }
    breakdownLines.push('');

    if (scene.broll.length > 0) {
      breakdownLines.push('### B-roll');
      for (const b of scene.broll) {
        breakdownLines.push(
          `- **על המילה:** "${b.word}" → ${b.description} (${b.durationSeconds}ש)`
        );
        breakdownLines.push(`  חפש: ${b.searchTerms.join(', ')}`);
      }
      breakdownLines.push('');
    }

    if (scene.sfx.length > 0) {
      breakdownLines.push('### SFX');
      for (const s of scene.sfx) {
        breakdownLines.push(
          `- **${s.soundName}** — ${s.timingNote} "${s.word}" [${s.category}]`
        );
      }
      breakdownLines.push('');
    }
  }

  fs.writeFileSync(
    path.join(projectFolder, 'prompts', 'scene_breakdown.md'),
    breakdownLines.join('\n')
  );
}

export function writeChecklist(
  projectFolder: string,
  row: GanttRow,
  script: ScriptScene[],
  breakdown: SceneBreakdown[]
): string {
  const checklistPath = path.join(projectFolder, 'checklist.md');

  const lines = [
    `# ${row.contentType} — ${row.character} | ${row.date}`,
    `**פלטפורמה:** ${row.platform} | **מסר:** ${row.message}`,
    '',
    '---',
    '',
    '## 🎙️ ElevenLabs — אודיו',
  ];

  for (const scene of script) {
    lines.push(
      `- [ ] סצנה ${scene.sceneNumber} (${scene.sceneType}) → \`${String(scene.sceneNumber).padStart(2, '0')}_${scene.sceneType}.mp3\``
    );
  }

  lines.push('');
  lines.push('## 🖼️ תמונות דמות');
  for (const scene of breakdown) {
    lines.push(`- [ ] סצנה ${scene.sceneNumber} — פרומפט ב: prompts/character_prompts.md`);
  }

  // Collect all SFX
  const allSfx = breakdown.flatMap((s) => s.sfx.map((sfx) => ({ ...sfx, scene: s.sceneNumber })));
  if (allSfx.length > 0) {
    lines.push('');
    lines.push('## 🔊 SFX להורדה');
    for (const sfx of allSfx) {
      lines.push(
        `- [ ] \`${sfx.soundName}\` — סצנה ${sfx.scene}, ${sfx.timingNote} "${sfx.word}"`
      );
    }
  }

  // Collect all B-roll
  const allBroll = breakdown.flatMap((s) =>
    s.broll.map((b) => ({ ...b, scene: s.sceneNumber }))
  );
  if (allBroll.length > 0) {
    lines.push('');
    lines.push('## 🎬 B-roll להורדה');
    for (const b of allBroll) {
      lines.push(
        `- [ ] סצנה ${b.scene}, על "${b.word}": ${b.description}`
      );
      lines.push(`  חפש: ${b.searchTerms.join(', ')}`);
    }
  }

  // Music
  const firstMusic = breakdown[0]?.music;
  if (firstMusic) {
    lines.push('');
    lines.push('## 🎵 מוזיקה');
    lines.push(
      `- [ ] ${firstMusic.style} | ${firstMusic.bpm} BPM | ${firstMusic.mood}`
    );
    if (firstMusic.exampleTrack) lines.push(`  דוגמה: ${firstMusic.exampleTrack}`);
    lines.push(`  💡 ${firstMusic.viralNote}`);
  }

  lines.push('');
  lines.push('## 🎞️ פרמייר פרו');
  lines.push('- [ ] ייבוא קבצי אודיו');
  lines.push('- [ ] עריכה ראשונית');
  lines.push('- [ ] הוספת מוזיקה');
  lines.push('- [ ] הוספת SFX');
  lines.push('- [ ] הוספת B-roll');
  lines.push('- [ ] כתוביות (פריסט Sunday)');
  lines.push('- [ ] גרסה סופית');
  lines.push('- [ ] ייצוא');
  lines.push('- [ ] תזמון');

  lines.push('');
  lines.push('## ✅ סיום');
  lines.push('- [ ] עדכון גאנט → "הושלם"');
  lines.push('- [ ] סדר קבצים');

  fs.writeFileSync(checklistPath, lines.join('\n'));
  return checklistPath;
}

export function savePackageMeta(pkg: ProductionPackage): void {
  const metaPath = path.join(pkg.projectFolder, 'package.json');
  fs.writeFileSync(metaPath, JSON.stringify(pkg, null, 2));
}

export function listProjects(): ProductionPackage[] {
  if (!fs.existsSync(OUTPUT_BASE)) return [];

  return fs
    .readdirSync(OUTPUT_BASE)
    .filter((d) => {
      const full = path.join(OUTPUT_BASE, d);
      return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'package.json'));
    })
    .map((d) => {
      const raw = fs.readFileSync(path.join(OUTPUT_BASE, d, 'package.json'), 'utf-8');
      return JSON.parse(raw) as ProductionPackage;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}
