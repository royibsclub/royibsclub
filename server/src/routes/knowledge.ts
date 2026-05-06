import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { listKnowledgeFiles, saveKnowledgeFile, deleteKnowledgeFile } from '../services/knowledgeBase';
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
