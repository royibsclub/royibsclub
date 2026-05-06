import type { TimelineState, ClipInfo, TrackInfo } from '@premiere-ai/shared';

// UXP/ExtendScript bridge — app is injected by Premiere Pro UXP runtime
declare const app: {
  project: {
    activeSequence: PPremiereSequence | null;
  };
};

interface PPremiereSequence {
  name: string;
  duration: { seconds: number };
  timebase: string;
  frameSizeHorizontal: number;
  frameSizeVertical: number;
  getPlayerPosition: () => { seconds: number };
  videoTracks: PPremiereTracks;
  audioTracks: PPremiereTracks;
}

interface PPremiereTracks {
  numTracks: number;
  [index: number]: PPremiereTrack;
}

interface PPremiereTrack {
  clips: {
    numItems: number;
    [index: number]: PPremiereClip;
  };
  name: string;
}

interface PPremiereClip {
  name: string;
  nodeId: string;
  inPoint: { seconds: number };
  outPoint: { seconds: number };
  duration: { seconds: number };
  mediaPath?: string;
  setInPoint: (time: number) => void;
  setOutPoint: (time: number) => void;
}

export function getTimelineState(): TimelineState | null {
  try {
    const seq = app.project.activeSequence;
    if (!seq) return null;

    const tracks: TrackInfo[] = [];
    const fps = parseFloat(seq.timebase) || 30;

    // Video tracks
    for (let i = 0; i < seq.videoTracks.numTracks; i++) {
      const track = seq.videoTracks[i];
      const clips: ClipInfo[] = [];
      for (let j = 0; j < track.clips.numItems; j++) {
        const clip = track.clips[j];
        clips.push({
          id: clip.nodeId || `v${i}_${j}`,
          name: clip.name,
          trackIndex: i,
          trackType: 'video',
          inPoint: clip.inPoint.seconds,
          outPoint: clip.outPoint.seconds,
          duration: clip.duration.seconds,
          filePath: clip.mediaPath,
        });
      }
      tracks.push({ index: i, type: 'video', clips });
    }

    // Audio tracks
    for (let i = 0; i < seq.audioTracks.numTracks; i++) {
      const track = seq.audioTracks[i];
      const clips: ClipInfo[] = [];
      for (let j = 0; j < track.clips.numItems; j++) {
        const clip = track.clips[j];
        clips.push({
          id: clip.nodeId || `a${i}_${j}`,
          name: clip.name,
          trackIndex: i,
          trackType: 'audio',
          inPoint: clip.inPoint.seconds,
          outPoint: clip.outPoint.seconds,
          duration: clip.duration.seconds,
        });
      }
      tracks.push({ index: i, type: 'audio', clips });
    }

    return {
      sequenceName: seq.name,
      duration: seq.duration.seconds,
      frameRate: fps,
      width: seq.frameSizeHorizontal,
      height: seq.frameSizeVertical,
      currentTime: seq.getPlayerPosition().seconds,
      tracks,
    };
  } catch {
    return null;
  }
}

export function cutAtTimecode(timecode: number, trackIndex?: number): boolean {
  try {
    const seq = app.project.activeSequence;
    if (!seq) return false;

    // Use QE (Quick Edit) DOM which supports razor cuts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qe = (app as any).enableQE?.();
    if (!qe) return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qeSeq = (app as any).project.activeSequence;
    if (trackIndex !== undefined) {
      qeSeq.getVideoTrackAt(trackIndex).razor(timecode);
    } else {
      // Cut all video tracks
      for (let i = 0; i < seq.videoTracks.numTracks; i++) {
        qeSeq.getVideoTrackAt(i).razor(timecode);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function trimClip(clipId: string, inPoint?: number, outPoint?: number): boolean {
  try {
    const seq = app.project.activeSequence;
    if (!seq) return false;

    for (let i = 0; i < seq.videoTracks.numTracks; i++) {
      const track = seq.videoTracks[i];
      for (let j = 0; j < track.clips.numItems; j++) {
        const clip = track.clips[j];
        if (clip.nodeId === clipId) {
          if (inPoint !== undefined) clip.setInPoint(inPoint);
          if (outPoint !== undefined) clip.setOutPoint(outPoint);
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}
