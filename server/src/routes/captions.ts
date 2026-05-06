import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import OpenAI from 'openai';
import { formatCaptions } from '../services/captionFormatter';
import type { FormatOptions } from '../services/captionFormatter';
import { getOpenAIKey } from '../services/settings';

export const captionsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

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

// POST /captions/transcribe
captionsRouter.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'קובץ אודיו נדרש' });
    return;
  }

  const apiKey = getOpenAIKey();
  if (!apiKey) {
    res.status(503).json({ error: 'OpenAI API key לא מוגדר — הגדר אותו בטאב ⚙️ הגדרות' });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey });

    const ext = (req.file.originalname.split('.').pop() || 'mp3').toLowerCase();
    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      m4a: 'audio/mp4',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
    };
    const mimeType = mimeMap[ext] || 'audio/mpeg';

    const readable = Readable.from(req.file.buffer);
    const file = await OpenAI.toFile(readable, `audio.${ext}`, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'he',
    });

    res.json({ text: transcription.text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'שגיאה בזיהוי קול';
    res.status(500).json({ error: msg });
  }
});
