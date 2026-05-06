import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { TimelineState, Platform } from '@premiere-ai/shared';
import { analyzeVideo } from './claude';
import { buildSystemPrompt, buildAnalysisPrompt } from './brain';

const FRAME_INTERVAL_SECONDS = 2;
const MAX_FRAMES = 20;

export async function extractFrames(videoPath: string): Promise<string[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppai-frames-'));

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=1/${FRAME_INTERVAL_SECONDS},scale=640:-1`,
        '-frames:v',
        String(MAX_FRAMES),
      ])
      .output(path.join(tmpDir, 'frame_%03d.jpg'))
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  const frames = fs
    .readdirSync(tmpDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort()
    .map((f) => fs.readFileSync(path.join(tmpDir, f)).toString('base64'));

  // Cleanup temp dir
  fs.readdirSync(tmpDir).forEach((f) => fs.unlinkSync(path.join(tmpDir, f)));
  fs.rmdirSync(tmpDir);

  return frames;
}

export async function analyzeTimeline(
  timeline: TimelineState,
  platform: Platform,
  videoPath?: string
): Promise<string> {
  let frames: string[] = [];

  if (videoPath && fs.existsSync(videoPath)) {
    try {
      frames = await extractFrames(videoPath);
    } catch {
      // FFmpeg not available or path invalid — continue without frames
    }
  }

  const systemPrompt = buildSystemPrompt(timeline, undefined, platform);
  const analysisPrompt = buildAnalysisPrompt(platform);

  const timelineContext = `
Timeline metadata for analysis:
- Duration: ${timeline.duration.toFixed(1)}s
- Total clips: ${timeline.tracks.reduce((s, t) => s + t.clips.length, 0)}
- Average clip duration: ${(timeline.duration / Math.max(1, timeline.tracks.reduce((s, t) => s + t.clips.length, 0))).toFixed(1)}s
- Cuts per minute: ${(timeline.tracks.reduce((s, t) => s + t.clips.length, 0) / (timeline.duration / 60)).toFixed(1)}
- Video tracks: ${timeline.tracks.filter((t) => t.type === 'video').length}
- Audio tracks: ${timeline.tracks.filter((t) => t.type === 'audio').length}
${frames.length > 0 ? `\nI'm providing ${frames.length} sample frames extracted every ${FRAME_INTERVAL_SECONDS} seconds.` : '\nNo video frames available — analyzing from timeline metadata only.'}

${analysisPrompt}`;

  return analyzeVideo(timelineContext, systemPrompt, frames.length > 0 ? frames : undefined);
}
