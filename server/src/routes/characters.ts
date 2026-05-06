import { Router } from 'express';
import type { Request, Response } from 'express';
import { listCharacters, getCharacter, saveCharacter, deleteCharacter } from '../services/characters';
import type { Character } from '@premiere-ai/shared';

export const charactersRouter = Router();

// GET /characters/list
charactersRouter.get('/list', (_req: Request, res: Response) => {
  res.json({ characters: listCharacters() });
});

// GET /characters/:id
charactersRouter.get('/:id', (req: Request, res: Response) => {
  const character = getCharacter(decodeURIComponent(req.params.id));
  if (!character) { res.status(404).json({ error: 'דמות לא נמצאה' }); return; }
  res.json({ character });
});

// POST /characters — יצירה / עדכון
charactersRouter.post('/', (req: Request, res: Response) => {
  const data = req.body as Omit<Character, 'createdAt' | 'updatedAt'>;
  if (!data.id || !data.displayName) {
    res.status(400).json({ error: 'id ו-displayName נדרשים' }); return;
  }
  const character = saveCharacter(data);
  res.json({ character });
});

// PUT /characters/:id
charactersRouter.put('/:id', (req: Request, res: Response) => {
  const existing = getCharacter(decodeURIComponent(req.params.id));
  if (!existing) { res.status(404).json({ error: 'דמות לא נמצאה' }); return; }
  const character = saveCharacter({ ...existing, ...req.body as Partial<Character>, id: existing.id, createdAt: existing.createdAt });
  res.json({ character });
});

// DELETE /characters/:id
charactersRouter.delete('/:id', (req: Request, res: Response) => {
  const ok = deleteCharacter(decodeURIComponent(req.params.id));
  if (!ok) { res.status(404).json({ error: 'דמות לא נמצאה' }); return; }
  res.json({ ok: true });
});
