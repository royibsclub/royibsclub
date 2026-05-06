declare const app: {
  project: {
    activeSequence: {
      audioTracks: {
        numTracks: number;
        [i: number]: {
          clips: {
            numItems: number;
            [j: number]: {
              nodeId: string;
              volume: {
                setValueAtKey: (time: number, value: number) => void;
                addKey: (time: number) => void;
              };
              components: {
                numItems: number;
                [k: number]: {
                  displayName: string;
                };
              };
            };
          };
        };
      };
    };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enableQE: () => any;
};

export function adjustAudio(
  clipId: string,
  volumeDb?: number,
  fadeInDuration?: number,
  fadeOutDuration?: number
): boolean {
  try {
    const seq = app.project.activeSequence;
    if (!seq) return false;

    for (let i = 0; i < seq.audioTracks.numTracks; i++) {
      const track = seq.audioTracks[i];
      for (let j = 0; j < track.clips.numItems; j++) {
        const clip = track.clips[j];
        if (clip.nodeId === clipId) {
          if (volumeDb !== undefined) {
            // Set constant volume keyframe
            clip.volume.addKey(0);
            clip.volume.setValueAtKey(0, volumeDb);
          }

          if (fadeInDuration !== undefined && fadeInDuration > 0) {
            clip.volume.addKey(0);
            clip.volume.setValueAtKey(0, -60);
            clip.volume.addKey(fadeInDuration);
            clip.volume.setValueAtKey(fadeInDuration, volumeDb ?? 0);
          }

          if (fadeOutDuration !== undefined && fadeOutDuration > 0) {
            // Calculate from clip outPoint
            const outPoint = (clip as { outPoint?: { seconds: number } }).outPoint?.seconds ?? 0;
            clip.volume.addKey(outPoint - fadeOutDuration);
            clip.volume.setValueAtKey(outPoint - fadeOutDuration, volumeDb ?? 0);
            clip.volume.addKey(outPoint);
            clip.volume.setValueAtKey(outPoint, -60);
          }

          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}
