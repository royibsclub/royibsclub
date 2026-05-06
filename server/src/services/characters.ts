import fs from 'fs';
import path from 'path';
import type { Character } from '@premiere-ai/shared';

const DATA_PATH = path.join(__dirname, '../data/characters.json');

function load(): Character[] {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as Character[];
}

function save(characters: Character[]): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(characters, null, 2));
}

export function listCharacters(): Character[] {
  return load();
}

export function getCharacter(id: string): Character | undefined {
  return load().find((c) => c.id.trim() === id.trim());
}

export function saveCharacter(character: Omit<Character, 'createdAt' | 'updatedAt'> & { createdAt?: number }): Character {
  const all = load();
  const existing = all.findIndex((c) => c.id === character.id);
  const now = Date.now();
  const full: Character = {
    ...character,
    createdAt: character.createdAt ?? now,
    updatedAt: now,
  };
  if (existing >= 0) {
    all[existing] = full;
  } else {
    all.push(full);
  }
  save(all);
  return full;
}

export function deleteCharacter(id: string): boolean {
  const all = load();
  const filtered = all.filter((c) => c.id !== id);
  if (filtered.length === all.length) return false;
  save(filtered);
  return true;
}

export function formatCharacterBlock(c: Character): string {
  const lines = [
    `## הדמות: ${c.displayName}`,
    c.visualDescription ? `**תיאור ויזואלי (לפרומפטים):** ${c.visualDescription}` : '',
    c.voiceTone ? `**טון דיבור:** ${c.voiceTone}` : '',
    c.personality ? `**אישיות:** ${c.personality}` : '',
    c.speakingStyle ? `**סגנון דיבור:** ${c.speakingStyle}` : '',
    c.contentTypes.length ? `**סוגי תוכן:** ${c.contentTypes.join(', ')}` : '',
    c.cameraStyle ? `**סגנון שוטים:** ${c.cameraStyle}` : '',
    c.editingStyle ? `**סגנון עריכה:** ${c.editingStyle}` : '',
    c.notes ? `**הערות:** ${c.notes}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}
