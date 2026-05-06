import { Router } from 'express';
import type { Request, Response } from 'express';
import { consumePendingActions, registerTimelineStateProvider } from '../tools';
import type { TimelineState, ActionResult } from '@premiere-ai/shared';

export const executeRouter = Router();

// Last known timeline state from the plugin
let lastKnownTimeline: TimelineState | null = null;

// Register the timeline state provider so Claude tools can access it
registerTimelineStateProvider(async () => lastKnownTimeline);

// Plugin calls this to push its current timeline state
executeRouter.post('/timeline', (req: Request, res: Response) => {
  const { state } = req.body as { state: TimelineState };
  if (!state) {
    res.status(400).json({ error: 'state is required' });
    return;
  }
  lastKnownTimeline = state;
  res.json({ ok: true });
});

// Plugin polls this to get pending actions to execute
executeRouter.get('/pending', (_req: Request, res: Response) => {
  const actions = consumePendingActions();
  res.json({ actions });
});

// Plugin reports execution results
executeRouter.post('/result', (req: Request, res: Response) => {
  const { actionId, result } = req.body as { actionId: string; result: ActionResult };
  console.log(`Action ${actionId} result:`, result);
  res.json({ ok: true });
});
