import fs from 'fs';
import path from 'path';
import type { StyleProfile, TimelineState, Platform } from '@premiere-ai/shared';

const BRAIN_PATH = path.join(__dirname, '../data/brain.md');

let cachedBrainContent: string | null = null;

function getBrainContent(): string {
  if (!cachedBrainContent) {
    cachedBrainContent = fs.readFileSync(BRAIN_PATH, 'utf-8');
  }
  return cachedBrainContent;
}

export function buildSystemPrompt(
  timeline?: TimelineState,
  profile?: StyleProfile,
  platform?: Platform
): string {
  const brain = getBrainContent();

  let context = '';

  if (profile) {
    context += `\n\n## Creator Style Profile: ${profile.name}
- Editing pace: ${profile.editing.paceStyle} (avg ${profile.editing.averageCutsPerMinute} cuts/min)
- Preferred transitions: ${profile.editing.preferredTransitions.join(', ')}
- Color style: ${profile.visual.colorGrade}
- Zoom usage: ${profile.visual.zoomFrequency}
- Audio style: SFX ${profile.audio.sfxUsage}, Music: ${profile.audio.musicStyle.join(', ')}
- Caption style: ${profile.captions.frequency}
- Primary platforms: ${profile.platforms.join(', ')}
- Content pillars: ${profile.contentPillars.join(', ')}
${profile.audienceNotes ? `- Audience notes: ${profile.audienceNotes}` : ''}
When suggesting edits, maintain consistency with this creator's established style.`;
  }

  if (timeline) {
    const totalClips = timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0);
    const videoDuration = timeline.duration;
    const avgClipDuration = totalClips > 0 ? videoDuration / totalClips : 0;
    context += `\n\n## Current Timeline
- Sequence: ${timeline.sequenceName}
- Duration: ${videoDuration.toFixed(1)}s
- Resolution: ${timeline.width}x${timeline.height} @ ${timeline.frameRate}fps
- Total clips: ${totalClips}
- Average clip duration: ${avgClipDuration.toFixed(1)}s
- Current playhead: ${timeline.currentTime.toFixed(1)}s`;
  }

  if (platform) {
    context += `\n\n## Target Platform: ${platform.toUpperCase()}
Apply all platform-specific recommendations from your knowledge base for ${platform}.`;
  }

  return `${brain}${context}

## Your Role
You are this creator's AI editing partner inside Adobe Premiere Pro. You have access to tools that can directly manipulate the timeline. When analyzing videos:
1. First use get_timeline_info to understand the current state
2. Provide specific, actionable feedback with exact timecodes
3. When suggesting actions, offer to execute them with the appropriate tools
4. Always explain WHY you're suggesting each change in terms of viewer retention and platform performance
5. Maintain the creator's established style while pushing quality higher

Be direct, specific, and professional. Prioritize changes by impact on watch time and virality.`;
}

export function buildAnalysisPrompt(platform: Platform): string {
  return `Analyze this video for ${platform} optimization. Structure your analysis as:

1. **Overall Assessment** (score 0-100 with reasoning)
2. **Hook Analysis** (first 3 seconds — rate strength and suggest improvements)
3. **Pacing Review** (cuts per minute, energy flow, slow sections)
4. **Retention Risk Points** (timecodes where viewers are likely to drop off)
5. **Platform-Specific Notes** (${platform} specific issues and opportunities)
6. **Top 5 Priority Edits** (ranked by impact, with exact timecodes)

For each suggested edit, specify if it can be executed directly in the timeline.`;
}
