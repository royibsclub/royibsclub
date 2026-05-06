import { getTimelineState, cutAtTimecode, trimClip } from '../premiere/timeline';
import { applyLumetriColor, addVideoEffect, addZoomKeyframes } from '../premiere/effects';
import { addCaption } from '../premiere/captions';
import { adjustAudio } from '../premiere/audio';
import { api } from './api';
import type { TimelineAction, ActionResult, TimelineState } from '@premiere-ai/shared';

let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startActionPolling(intervalMs = 1000) {
  if (pollInterval) return;
  pollInterval = setInterval(async () => {
    try {
      const { actions } = await api.getPendingActions();
      for (const { id, action } of actions) {
        const result = executeAction(action);
        await api.reportResult(id, result);
      }
    } catch {
      // Server not available yet
    }
  }, intervalMs);
}

export function stopActionPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export async function pushTimelineState(): Promise<TimelineState | null> {
  const state = getTimelineState();
  if (state) {
    await api.pushTimeline(state).catch(() => null);
  }
  return state;
}

export function executeAction(action: TimelineAction): ActionResult {
  try {
    switch (action.type) {
      case 'cut_clip': {
        const ok = cutAtTimecode(action.timecode, action.trackIndex);
        return { success: ok, message: ok ? 'Cut applied' : 'Cut failed — no active sequence' };
      }

      case 'trim_clip': {
        const ok = trimClip(action.clipId, action.inPoint, action.outPoint);
        return { success: ok, message: ok ? 'Clip trimmed' : 'Clip not found' };
      }

      case 'add_zoom': {
        const ok = addZoomKeyframes(
          action.clipId,
          action.startScale,
          action.endScale,
          action.startTime,
          action.endTime
        );
        return { success: ok, message: ok ? 'Zoom keyframes added' : 'Zoom failed' };
      }

      case 'add_caption': {
        const ok = addCaption(action.text, action.startTime, action.endTime, action.style);
        return { success: ok, message: ok ? 'Caption added' : 'Caption failed' };
      }

      case 'add_effect': {
        const ok = addVideoEffect(action.clipId, action.effectName, action.params);
        return { success: ok, message: ok ? `Effect "${action.effectName}" applied` : 'Effect failed' };
      }

      case 'adjust_color': {
        const ok = applyLumetriColor(action.clipId, action.lumetri);
        return { success: ok, message: ok ? 'Color grade applied' : 'Color grade failed' };
      }

      case 'adjust_audio': {
        const ok = adjustAudio(
          action.clipId,
          action.volume,
          action.fadeInDuration,
          action.fadeOutDuration
        );
        return { success: ok, message: ok ? 'Audio adjusted' : 'Audio adjustment failed' };
      }

      case 'add_transition':
      case 'reorder_clips':
        return {
          success: false,
          message: `Action "${action.type}" requires manual execution via Premiere Pro UI`,
        };

      default:
        return { success: false, message: `Unknown action type` };
    }
  } catch (err) {
    return { success: false, message: `Error: ${String(err)}` };
  }
}
