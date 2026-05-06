import { Router } from 'express';
import type { Request, Response } from 'express';
import { fetchGanttRows, updateRowStatus, isGoogleSheetsConfigured } from '../services/googleSheets';
import { listProjects } from '../services/fileOrganizer';
import { runPipeline } from '../services/pipeline';
import type { GanttRow, PipelineProgress } from '@premiere-ai/shared';

export const pipelineRouter = Router();

// GET /pipeline/gantt — שולף שורות "מתוכנן" מ-Google Sheets
pipelineRouter.get('/gantt', async (_req: Request, res: Response) => {
  if (!isGoogleSheetsConfigured()) {
    res.json({
      configured: false,
      rows: [],
      message: 'Google Sheets לא מוגדר. עדכן את pipeline-config.json ו-.env',
    });
    return;
  }

  try {
    const rows = await fetchGanttRows();
    res.json({ configured: true, rows });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת גאנט', details: String(err) });
  }
});

// POST /pipeline/start — מריץ pipeline מלא עם SSE
pipelineRouter.post('/start', async (req: Request, res: Response) => {
  const { row } = req.body as { row: GanttRow };

  if (!row) {
    res.status(400).json({ error: 'row נדרש' });
    return;
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function send(data: PipelineProgress) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const pkg = await runPipeline(row, send);
    res.write(`data: ${JSON.stringify({ step: 'done', message: 'מוכן', packageId: pkg.id, package: pkg })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ step: 'error', message: String(err) })}\n\n`);
  } finally {
    res.end();
  }
});

// POST /pipeline/complete — מסמן הושלם ב-Sheets
pipelineRouter.post('/complete', async (req: Request, res: Response) => {
  const { rowIndex } = req.body as { rowIndex: number };

  if (!rowIndex) {
    res.status(400).json({ error: 'rowIndex נדרש' });
    return;
  }

  try {
    await updateRowStatus(rowIndex, 'done');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון גאנט', details: String(err) });
  }
});

// GET /pipeline/projects — רשימת פרויקטים שנוצרו
pipelineRouter.get('/projects', (_req: Request, res: Response) => {
  const projects = listProjects();
  res.json({ projects });
});
