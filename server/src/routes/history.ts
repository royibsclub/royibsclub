import { Router } from 'express';
import type { Request, Response } from 'express';
import { listRecords, getRecord, updatePerformance } from '../services/videoHistory';
import type { VideoRecord, VideoPerformance } from '@premiere-ai/shared';

export const historyRouter = Router();

// GET /history/list
historyRouter.get('/list', (_req: Request, res: Response) => {
  res.json({ records: listRecords() });
});

// GET /history/:id
historyRouter.get('/:id', (req: Request, res: Response) => {
  const record = getRecord(req.params.id);
  if (!record) { res.status(404).json({ error: 'סרטון לא נמצא' }); return; }
  res.json({ record });
});

// PUT /history/:id/performance
historyRouter.put('/:id/performance', (req: Request, res: Response) => {
  const { performance, notes, status } = req.body as {
    performance: Omit<VideoPerformance, 'recordedAt'>;
    notes?: string;
    status?: VideoRecord['status'];
  };
  if (!performance) { res.status(400).json({ error: 'performance נדרש' }); return; }
  const record = updatePerformance(req.params.id, performance, notes, status);
  if (!record) { res.status(404).json({ error: 'סרטון לא נמצא' }); return; }
  res.json({ record });
});
