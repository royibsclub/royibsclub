import type Anthropic from '@anthropic-ai/sdk';
import type { TimelineAction, ActionResult } from '@premiere-ai/shared';

// In-memory registry of pending timeline actions from Claude
// The plugin polls /execute/pending and picks these up
const pendingActions: Array<{ id: string; action: TimelineAction }> = [];
let timelineStateCallback: (() => Promise<unknown>) | null = null;

export function registerTimelineStateProvider(fn: () => Promise<unknown>) {
  timelineStateCallback = fn;
}

export function queueAction(action: TimelineAction): string {
  const id = `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  pendingActions.push({ id, action });
  return id;
}

export function consumePendingActions() {
  return pendingActions.splice(0);
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export function getAllTools(): Anthropic.Tool[] {
  return [
    {
      name: 'get_timeline_info',
      description:
        'Returns the current state of the Premiere Pro timeline including all clips, their positions, durations, and track layout. Call this first before suggesting any edits.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'cut_clip',
      description:
        'Makes a razor cut at the specified timecode on the active sequence. Optionally restricted to a specific track.',
      input_schema: {
        type: 'object' as const,
        properties: {
          timecode: {
            type: 'number',
            description: 'The timecode in seconds where the cut should be made',
          },
          trackIndex: {
            type: 'number',
            description: 'Optional: specific video track index (0-based). If omitted, cuts all tracks.',
          },
          reason: {
            type: 'string',
            description: 'Brief explanation of why this cut improves the video',
          },
        },
        required: ['timecode'],
      },
    },
    {
      name: 'trim_clip',
      description: 'Trims a clip by adjusting its in-point and/or out-point.',
      input_schema: {
        type: 'object' as const,
        properties: {
          clipId: { type: 'string', description: 'The ID of the clip to trim' },
          inPoint: {
            type: 'number',
            description: 'New in-point in seconds (relative to sequence start). Omit to keep current.',
          },
          outPoint: {
            type: 'number',
            description: 'New out-point in seconds (relative to sequence start). Omit to keep current.',
          },
        },
        required: ['clipId'],
      },
    },
    {
      name: 'add_zoom',
      description:
        'Applies a zoom (scale) animation to a clip using keyframes. Useful for adding emphasis, energy, or simulating a "push in" on key moments.',
      input_schema: {
        type: 'object' as const,
        properties: {
          clipId: { type: 'string', description: 'Target clip ID' },
          startScale: { type: 'number', description: 'Starting scale percentage (100 = no zoom)' },
          endScale: { type: 'number', description: 'Ending scale percentage (e.g., 115 = 15% zoom in)' },
          startTime: { type: 'number', description: 'Animation start time in seconds (sequence time)' },
          endTime: { type: 'number', description: 'Animation end time in seconds (sequence time)' },
        },
        required: ['clipId', 'startScale', 'endScale', 'startTime', 'endTime'],
      },
    },
    {
      name: 'add_caption',
      description:
        'Adds a caption/subtitle to the timeline at the specified time range. Great for highlighting key points, adding context, or improving accessibility.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'The caption text to display' },
          startTime: { type: 'number', description: 'Caption start time in seconds' },
          endTime: { type: 'number', description: 'Caption end time in seconds' },
          style: {
            type: 'object',
            description: 'Optional styling parameters',
            properties: {
              fontSize: { type: 'number' },
              fontColor: { type: 'string', description: 'Hex color e.g. #FFFFFF' },
              backgroundColor: { type: 'string', description: 'Hex color or transparent' },
              position: { type: 'string', enum: ['top', 'center', 'bottom'] },
              bold: { type: 'boolean' },
            },
          },
        },
        required: ['text', 'startTime', 'endTime'],
      },
    },
    {
      name: 'add_effect',
      description:
        'Applies a video effect to a clip. Use for color effects, blur, distortion, or any Premiere Pro video effect.',
      input_schema: {
        type: 'object' as const,
        properties: {
          clipId: { type: 'string', description: 'Target clip ID' },
          effectName: {
            type: 'string',
            description:
              'Premiere Pro effect name (e.g., "Lumetri Color", "Gaussian Blur", "VR Chromatic Aberrations")',
          },
          params: {
            type: 'object',
            description: 'Effect parameter overrides as key-value pairs',
          },
        },
        required: ['clipId', 'effectName'],
      },
    },
    {
      name: 'add_transition',
      description:
        'Adds a video transition between clips or at the start/end of a clip.',
      input_schema: {
        type: 'object' as const,
        properties: {
          clipId: { type: 'string', description: 'Target clip ID' },
          transitionName: {
            type: 'string',
            description: 'Premiere Pro transition name (e.g., "Cross Dissolve", "Dip to Black", "Film Dissolve")',
          },
          duration: { type: 'number', description: 'Transition duration in seconds' },
          position: {
            type: 'string',
            enum: ['start', 'end', 'both'],
            description: 'Where to apply the transition',
          },
        },
        required: ['clipId', 'transitionName', 'duration', 'position'],
      },
    },
    {
      name: 'adjust_color',
      description:
        'Applies Lumetri Color adjustments to a clip. Use for color grading, mood setting, and platform-specific color optimization.',
      input_schema: {
        type: 'object' as const,
        properties: {
          clipId: { type: 'string', description: 'Target clip ID' },
          lumetri: {
            type: 'object',
            description: 'Lumetri Color parameters',
            properties: {
              exposure: { type: 'number', description: '-5 to +5' },
              contrast: { type: 'number', description: '-100 to +100' },
              highlights: { type: 'number', description: '-100 to +100' },
              shadows: { type: 'number', description: '-100 to +100' },
              whites: { type: 'number', description: '-100 to +100' },
              blacks: { type: 'number', description: '-100 to +100' },
              saturation: { type: 'number', description: '0 to 200, default 100' },
              temperature: { type: 'number', description: '-100 to +100' },
              tint: { type: 'number', description: '-100 to +100' },
            },
          },
          applyToAll: {
            type: 'boolean',
            description: 'If true, apply same color grade to all clips on the track',
          },
        },
        required: ['clipId', 'lumetri'],
      },
    },
    {
      name: 'adjust_audio',
      description:
        'Adjusts audio properties of a clip including volume, fade in/out, and audio effects.',
      input_schema: {
        type: 'object' as const,
        properties: {
          clipId: { type: 'string', description: 'Target clip ID' },
          volume: { type: 'number', description: 'Volume in dB (0 = no change, -6 = half volume, -inf = mute)' },
          fadeInDuration: { type: 'number', description: 'Fade in duration in seconds' },
          fadeOutDuration: { type: 'number', description: 'Fade out duration in seconds' },
          effectName: {
            type: 'string',
            description: 'Optional audio effect to apply (e.g., "DeNoise", "Parametric Equalizer")',
          },
        },
        required: ['clipId'],
      },
    },
    {
      name: 'suggest_broll',
      description:
        'Records a B-roll suggestion at a specific timecode. The suggestion is shown to the creator as a marker with notes. Does not auto-insert footage.',
      input_schema: {
        type: 'object' as const,
        properties: {
          timecode: { type: 'number', description: 'Timecode in seconds where B-roll should be inserted' },
          duration: { type: 'number', description: 'Suggested B-roll duration in seconds' },
          description: {
            type: 'string',
            description: 'Detailed description of what the B-roll should show',
          },
          searchTerms: {
            type: 'array',
            items: { type: 'string' },
            description: 'Search terms to find this B-roll footage (for stock footage or personal library)',
          },
        },
        required: ['timecode', 'duration', 'description'],
      },
    },
    {
      name: 'reorder_clips',
      description:
        'Reorders clips on the timeline by specifying the new sequence of clip IDs. Use to restructure narrative flow.',
      input_schema: {
        type: 'object' as const,
        properties: {
          clipIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Clip IDs in the desired new order',
          },
          reason: {
            type: 'string',
            description: 'Explanation of why this reordering improves the video',
          },
        },
        required: ['clipIds'],
      },
    },
  ];
}

// ─── Tool Executor ─────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<ActionResult> {
  if (name === 'get_timeline_info') {
    if (timelineStateCallback) {
      const state = await timelineStateCallback();
      return { success: true, message: 'Timeline state retrieved', data: state };
    }
    return {
      success: false,
      message: 'No timeline state provider registered. Plugin must be connected.',
    };
  }

  // All other tools queue an action for the plugin to execute
  const action = { type: name, ...input } as unknown as TimelineAction;
  const actionId = queueAction(action);

  return {
    success: true,
    message: `Action "${name}" queued (id: ${actionId}). Plugin will execute it.`,
    data: { actionId },
  };
}
