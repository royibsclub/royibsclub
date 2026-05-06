import { Router } from 'express';
import type { Request, Response } from 'express';
import { analyzeTimeline } from '../services/videoAnalysis';
import { getProfile } from '../services/styleProfile';
import type { AnalysisRequest } from '@premiere-ai/shared';

export const analyzeRouter = Router();

analyzeRouter.post('/', async (req: Request, res: Response) => {
  const { timelineState, platform, filePath, creatorId } = req.body as AnalysisRequest;

  if (!timelineState || !platform) {
    res.status(400).json({ error: 'timelineState and platform are required' });
    return;
  }

  try {
    const profile = creatorId ? getProfile(creatorId) : null;
    void profile; // used in future for profile-aware analysis

    const analysis = await analyzeTimeline(timelineState, platform, filePath);
    res.json({ analysis });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Analysis failed', details: String(err) });
  }
});
