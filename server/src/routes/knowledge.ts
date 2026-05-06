import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { listKnowledgeFiles, saveKnowledgeFile, deleteKnowledgeFile } from '../services/knowledgeBase';
import { clearBrainCache, PIPELINE_BRAIN_PATH_EXPORT } from '../services/pipeline';
import type { KnowledgeFile } from '@premiere-ai/shared';

export const knowledgeRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.txt', '.md', '.pdf', '.docx', '.doc'];
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('סוג קובץ לא נתמך. מותר: TXT, MD, PDF, DOCX'));
    }
  },
});

// GET /knowledge/list
knowledgeRouter.get('/list', (_req: Request, res: Response) => {
  const files = listKnowledgeFiles();
  res.json({ files });
});

// POST /knowledge/upload
knowledgeRouter.post(
  '/upload',
  upload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'לא הועלה קובץ' });
      return;
    }

    const category = (req.body.category as KnowledgeFile['category']) || 'other';
    const meta = saveKnowledgeFile(req.file.buffer, req.file.originalname, category);
    res.json({ file: meta });
  }
);

// DELETE /knowledge/delete/:name
knowledgeRouter.delete('/delete/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const ok = deleteKnowledgeFile(decodeURIComponent(name));
  if (!ok) {
    res.status(404).json({ error: 'קובץ לא נמצא' });
    return;
  }
  res.json({ ok: true });
});

// GET /knowledge/brain — קריאת תוכן pipeline-brain.md
knowledgeRouter.get('/brain', (_req: Request, res: Response) => {
  try {
    const content = fs.readFileSync(PIPELINE_BRAIN_PATH_EXPORT, 'utf-8');
    res.json({ content });
  } catch {
    res.status(500).json({ error: 'לא ניתן לקרוא את קובץ ה-Brain' });
  }
});

// PUT /knowledge/brain — עדכון תוכן pipeline-brain.md
knowledgeRouter.put('/brain', (req: Request, res: Response) => {
  const { content } = req.body as { content?: string };
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content נדרש' });
    return;
  }
  try {
    fs.writeFileSync(PIPELINE_BRAIN_PATH_EXPORT, content, 'utf-8');
    clearBrainCache();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'לא ניתן לשמור את קובץ ה-Brain' });
  }
});
