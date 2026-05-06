import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getProfile,
  saveProfile,
  createDefaultProfile,
  listProfiles,
} from '../services/styleProfile';
import type { StyleProfile } from '@premiere-ai/shared';

export const profileRouter = Router();

profileRouter.get('/', (_req, res: Response) => {
  res.json({ profiles: listProfiles() });
});

profileRouter.get('/:creatorId', (req: Request, res: Response) => {
  const profile = getProfile(req.params.creatorId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({ profile });
});

profileRouter.post('/', (req: Request, res: Response) => {
  const { creatorId, name } = req.body as { creatorId: string; name: string };
  if (!creatorId || !name) {
    res.status(400).json({ error: 'creatorId and name are required' });
    return;
  }
  const existing = getProfile(creatorId);
  if (existing) {
    res.status(409).json({ error: 'Profile already exists', profile: existing });
    return;
  }
  const profile = createDefaultProfile(creatorId, name);
  saveProfile(profile);
  res.json({ profile });
});

profileRouter.put('/:creatorId', (req: Request, res: Response) => {
  const { creatorId } = req.params;
  const updates = req.body as Partial<StyleProfile>;
  const existing = getProfile(creatorId);
  if (!existing) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  const updated: StyleProfile = { ...existing, ...updates, creatorId };
  saveProfile(updated);
  res.json({ profile: updated });
});
