import type { CaptionStyle } from '@premiere-ai/shared';

declare const app: {
  project: {
    activeSequence: {
      createCaptionTrack: (trackType: number, startTime: number) => PPremiereTrackObj;
      videoTracks: { numTracks: number };
    };
  };
};

interface PPremiereTrackObj {
  insertNewSegment: (text: string, startTime: number, endTime: number) => void;
}

export function addCaption(
  text: string,
  startTime: number,
  endTime: number,
  style?: CaptionStyle
): boolean {
  try {
    const seq = app.project.activeSequence;
    if (!seq) return false;

    // Caption track type 0 = Subtitle
    const captionTrack = seq.createCaptionTrack(0, 0);
    captionTrack.insertNewSegment(text, startTime, endTime);

    // Style is applied post-creation via UXP DOM manipulation
    // (Full style API requires Premiere 25.6+ UXP caption APIs)
    void style; // Style application is a future enhancement

    return true;
  } catch {
    return false;
  }
}

export interface CaptionLineData {
  text: string;
  startTime: number;
  endTime: number;
}

export function addCaptionsBulk(lines: CaptionLineData[]): { applied: number; failed: number } {
  let applied = 0;
  let failed = 0;
  for (const line of lines) {
    const ok = addCaption(line.text, line.startTime, line.endTime);
    if (ok) applied++;
    else failed++;
  }
  return { applied, failed };
}
