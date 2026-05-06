import { Router } from 'express';
import type { Request, Response } from 'express';
import { getSettingsStatus, saveSettings } from '../services/settings';

export const settingsRouter = Router();

settingsRouter.get('/status', (_req: Request, res: Response) => {
  res.json(getSettingsStatus());
});

settingsRouter.put('/', (req: Request, res: Response) => {
  const { anthropicApiKey, openaiApiKey, googleServiceAccountPath, videosOutputDir } = req.body as {
    anthropicApiKey?: string;
    openaiApiKey?: string;
    googleServiceAccountPath?: string;
    videosOutputDir?: string;
  };

  const updates: Record<string, string> = {};
  if (anthropicApiKey !== undefined) updates.anthropicApiKey = anthropicApiKey;
  if (openaiApiKey !== undefined) updates.openaiApiKey = openaiApiKey;
  if (googleServiceAccountPath !== undefined) updates.googleServiceAccountPath = googleServiceAccountPath;
  if (videosOutputDir !== undefined) updates.videosOutputDir = videosOutputDir;

  saveSettings(updates);
  res.json({ ok: true, status: getSettingsStatus() });
});
