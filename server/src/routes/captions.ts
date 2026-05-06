import { Router } from 'express';
import type { Request, Response } from 'express';
import { formatCaptions } from '../services/captionFormatter';
import type { FormatOptions } from '../services/captionFormatter';

export const captionsRouter = Router();

// POST /captions/format
captionsRouter.post('/format', (req: Request, res: Response) => {
  const { text, ...opts } = req.body as { text: string } & Partial<FormatOptions>;

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text נדרש' });
    return;
  }

  const result = formatCaptions(text, opts);
  res.json(result);
});
