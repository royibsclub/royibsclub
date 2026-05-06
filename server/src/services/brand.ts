import fs from 'fs';
import path from 'path';
import type { BrandSettings } from '@premiere-ai/shared';

const DATA_PATH = path.join(__dirname, '../data/brand.json');

export function getBrandSettings(): BrandSettings {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as BrandSettings;
}

export function saveBrandSettings(settings: Omit<BrandSettings, 'updatedAt'>): BrandSettings {
  const full: BrandSettings = { ...settings, updatedAt: Date.now() };
  fs.writeFileSync(DATA_PATH, JSON.stringify(full, null, 2));
  return full;
}

export function formatBrandBlock(b: BrandSettings): string {
  const parts: string[] = ['## הגדרות מותג'];

  if (b.colors.primary) {
    parts.push(`**צבעים:** ראשי ${b.colors.primary}, משני ${b.colors.secondary}, מבטא ${b.colors.accent}`);
  }
  if (b.captions.preset) {
    parts.push(`**כתוביות:** פריסט "${b.captions.preset}", ${b.captions.style}, אנימציה: ${b.captions.animationType}`);
  }
  if (b.music.genres.length) {
    parts.push(`**מוזיקה:** ${b.music.genres.join(', ')}, ${b.music.bpmRange.min}–${b.music.bpmRange.max} BPM`);
    if (b.music.viralNotes) parts.push(`  💡 ${b.music.viralNotes}`);
  }
  if (b.editing.cutStyle || b.editing.rules) {
    parts.push(`**עריכה:** ${b.editing.cutStyle}`);
    if (b.editing.transitionTypes.length) parts.push(`  מעברים: ${b.editing.transitionTypes.join(', ')}`);
    if (b.editing.rules) parts.push(`  חוקים: ${b.editing.rules}`);
  }
  if (b.logo.position) {
    parts.push(`**לוגו:** ${b.logo.position}, opacity ${b.logo.opacity}`);
  }

  return parts.join('\n');
}
