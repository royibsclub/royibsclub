import { Router } from 'express';
import type { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../services/brain';
import type { Platform } from '@premiere-ai/shared';

export const researchRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

researchRouter.post('/', async (req: Request, res: Response) => {
  const { topic, platform, niche } = req.body as {
    topic: string;
    platform?: Platform;
    niche?: string;
  };

  if (!topic) {
    res.status(400).json({ error: 'topic is required' });
    return;
  }

  try {
    const systemPrompt = buildSystemPrompt(undefined, undefined, platform);

    const prompt = `Research current trends and best practices for: "${topic}"
Platform focus: ${platform || 'all platforms'}
${niche ? `Niche/Content type: ${niche}` : ''}

Provide:
1. What's currently working (with specific examples and reasoning)
2. Editing patterns trending right now
3. Hook styles that are performing well
4. Audio/music trends
5. Caption and text overlay trends
6. Specific actionable recommendations for this content type

Be specific and data-driven. Reference real patterns and formats you know about.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    res.json({ research: text });
  } catch (err) {
    console.error('Research error:', err);
    res.status(500).json({ error: 'Research failed', details: String(err) });
  }
});
