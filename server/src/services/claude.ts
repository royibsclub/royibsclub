import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from './brain';
import { getAllTools, executeTool } from '../tools';
import type { StyleProfile, TimelineState, Platform, ChatMessage } from '@premiere-ai/shared';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-6';

interface StreamCallbacks {
  onText: (text: string) => void;
  onToolUse?: (toolName: string, input: unknown) => void;
  onDone: (fullText: string) => void;
  onError: (err: Error) => void;
}

// Run a full agentic loop: Claude can call tools and we execute them until
// Claude stops requesting tools.
export async function runAgenticLoop(
  userMessage: string,
  history: ChatMessage[],
  timeline?: TimelineState,
  profile?: StyleProfile,
  platform?: Platform,
  callbacks?: StreamCallbacks
): Promise<string> {
  const systemPrompt = buildSystemPrompt(timeline, profile, platform);
  const tools = getAllTools();

  const messages: Anthropic.MessageParam[] = [
    // Cached system knowledge (prefix with cache_control to reduce cost on repeated calls)
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: systemPrompt,
          // @ts-expect-error — cache_control is a valid extended param
          cache_control: { type: 'ephemeral' },
        },
        {
          type: 'text',
          text: 'Understood. I am ready to help as the AI editing partner.',
        },
      ],
    },
    { role: 'assistant', content: 'Ready.' },
    // Conversation history
    ...history.map((m): Anthropic.MessageParam => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  let fullText = '';
  let continueLoop = true;

  while (continueLoop) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [],
      tools,
      messages,
    });

    let assistantText = '';
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantText += block.text;
        fullText += block.text;
        callbacks?.onText(block.text);
      } else if (block.type === 'tool_use') {
        callbacks?.onToolUse?.(block.name, block.input);
        const result = await executeTool(block.name, block.input as Record<string, unknown>);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Add assistant turn to message history
    messages.push({ role: 'assistant', content: response.content });

    if (toolResults.length > 0) {
      messages.push({ role: 'user', content: toolResults });
    } else {
      continueLoop = false;
    }

    if (response.stop_reason === 'end_turn' && toolResults.length === 0) {
      continueLoop = false;
    }
  }

  callbacks?.onDone(fullText);
  return fullText;
}

// Streaming version for real-time chat
export async function streamChat(
  userMessage: string,
  history: ChatMessage[],
  timeline?: TimelineState,
  profile?: StyleProfile,
  platform?: Platform,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const systemPrompt = buildSystemPrompt(timeline, profile, platform);
  const tools = getAllTools();

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: systemPrompt,
          // @ts-expect-error
          cache_control: { type: 'ephemeral' },
        },
        { type: 'text', text: 'Understood. Ready as AI editing partner.' },
      ],
    },
    { role: 'assistant', content: 'Ready.' },
    ...history.map((m): Anthropic.MessageParam => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  let fullText = '';

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    tools,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      fullText += event.delta.text;
      onChunk?.(event.delta.text);
    }
  }

  return fullText;
}

// Single-shot analysis (non-streaming, higher token budget)
export async function analyzeVideo(
  prompt: string,
  systemPrompt: string,
  frames?: string[]  // base64 encoded frames
): Promise<string> {
  const content: Anthropic.ContentBlockParam[] = [];

  if (frames && frames.length > 0) {
    frames.forEach((frame, i) => {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: frame,
        },
      } as Anthropic.ImageBlockParam);
      content.push({
        type: 'text',
        text: `Frame ${i + 1}`,
      });
    });
  }

  content.push({
    type: 'text',
    text: prompt,
    // @ts-expect-error
    cache_control: { type: 'ephemeral' },
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}
