import fs from 'fs';
import path from 'path';
import type { KnowledgeFile } from '@premiere-ai/shared';

const KNOWLEDGE_DIR = path.join(__dirname, '../data/knowledge');
const META_FILE = path.join(KNOWLEDGE_DIR, '_meta.json');

function ensureDir() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }
}

function loadMeta(): KnowledgeFile[] {
  if (!fs.existsSync(META_FILE)) return [];
  return JSON.parse(fs.readFileSync(META_FILE, 'utf-8')) as KnowledgeFile[];
}

function saveMeta(files: KnowledgeFile[]) {
  fs.writeFileSync(META_FILE, JSON.stringify(files, null, 2));
}

export function listKnowledgeFiles(): KnowledgeFile[] {
  ensureDir();
  return loadMeta();
}

export function saveKnowledgeFile(
  buffer: Buffer,
  originalName: string,
  category: KnowledgeFile['category']
): KnowledgeFile {
  ensureDir();
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  const name = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(KNOWLEDGE_DIR, name);

  fs.writeFileSync(filePath, buffer);

  const meta: KnowledgeFile = {
    name,
    originalName,
    uploadedAt: timestamp,
    sizeBytes: buffer.length,
    category,
  };

  const existing = loadMeta();
  saveMeta([...existing, meta]);
  return meta;
}

export function deleteKnowledgeFile(name: string): boolean {
  ensureDir();
  const filePath = path.join(KNOWLEDGE_DIR, name);
  if (!fs.existsSync(filePath)) return false;

  fs.unlinkSync(filePath);
  const existing = loadMeta().filter((f) => f.name !== name);
  saveMeta(existing);
  return true;
}

// Load all knowledge file contents for injection into Claude prompts
export function loadAllKnowledge(): string {
  ensureDir();
  const files = loadMeta();
  if (files.length === 0) return '';

  const parts: string[] = ['## ידע נוסף שהמשתמש הוסיף\n'];

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file.name);
    if (!fs.existsSync(filePath)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      parts.push(`### ${file.originalName} (${file.category})\n${content}\n`);
    } catch {
      // Skip unreadable files
    }
  }

  return parts.join('\n');
}
