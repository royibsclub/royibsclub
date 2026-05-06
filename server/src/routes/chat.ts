import { Router } from 'express';
import type { Request, Response } from 'express';
import { streamChat, runAgenticLoop } from '../services/claude';
import { getProfile } from '../services/styleProfile';
import type { ChatRequest } from '@premiere-ai/shared';

export const chatRouter = Router();

// Streaming SSE endpoint
chatRouter.post('/stream', async (req: Request, res: Response) => {
  const { message, history, timelineState, platform, creatorId } = req.body as ChatRequest;

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const profile = creatorId ? getProfile(creatorId) : undefined;

  try {
    await streamChat(
      message,
      history || [],
      timelineState,
      profile ?? undefined,
      platform,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
      }
    );
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`);
    res.end();
  }
});

// Agentic endpoint (can execute tools)
chatRouter.post('/agent', async (req: Request, res: Response) => {
  const { message, history, timelineState, platform, creatorId } = req.body as ChatRequest;

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const profile = creatorId ? getProfile(creatorId) : undefined;

  try {
    const response = await runAgenticLoop(
      message,
      history || [],
      timelineState,
      profile ?? undefined,
      platform
    );
    res.json({ response });
  } catch (err) {
    console.error('Agent error:', err);
    res.status(500).json({ error: 'Agent failed', details: String(err) });
  }
});
