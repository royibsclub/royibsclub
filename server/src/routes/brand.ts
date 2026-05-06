import { Router } from 'express';
import type { Request, Response } from 'express';
import { getBrandSettings, saveBrandSettings } from '../services/brand';
import type { BrandSettings } from '@premiere-ai/shared';

export const brandRouter = Router();

// GET /brand
brandRouter.get('/', (_req: Request, res: Response) => {
  res.json({ brand: getBrandSettings() });
});

// PUT /brand
brandRouter.put('/', (req: Request, res: Response) => {
  const data = req.body as Omit<BrandSettings, 'updatedAt'>;
  const brand = saveBrandSettings(data);
  res.json({ brand });
});
