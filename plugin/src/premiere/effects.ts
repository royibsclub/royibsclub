import type { LumetriParams } from '@premiere-ai/shared';

declare const app: {
  project: {
    activeSequence: {
      videoTracks: {
        numTracks: number;
        [i: number]: {
          clips: {
            numItems: number;
            [j: number]: {
              nodeId: string;
              components: {
                numItems: number;
                [k: number]: {
                  displayName: string;
                  properties: {
                    numItems: number;
                    [p: number]: {
                      displayName: string;
                      setValue: (value: number, updateUI?: boolean) => void;
                    };
                  };
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

function findClipById(clipId: string) {
  const seq = app.project.activeSequence;
  if (!seq) return null;
  for (let i = 0; i < seq.videoTracks.numTracks; i++) {
    const track = seq.videoTracks[i];
    for (let j = 0; j < track.clips.numItems; j++) {
      const clip = track.clips[j];
      if (clip.nodeId === clipId) return clip;
    }
  }
  return null;
}

export function applyLumetriColor(clipId: string, params: LumetriParams): boolean {
  try {
    const clip = findClipById(clipId);
    if (!clip) return false;

    // Find the Lumetri Color effect component
    for (let k = 0; k < clip.components.numItems; k++) {
      const comp = clip.components[k];
      if (comp.displayName === 'Lumetri Color') {
        const paramMap: Record<string, keyof LumetriParams> = {
          Exposure: 'exposure',
          Contrast: 'contrast',
          Highlights: 'highlights',
          Shadows: 'shadows',
          Whites: 'whites',
          Blacks: 'blacks',
          Saturation: 'saturation',
          Temperature: 'temperature',
          Tint: 'tint',
        };

        for (let p = 0; p < comp.properties.numItems; p++) {
          const prop = comp.properties[p];
          const key = paramMap[prop.displayName];
          if (key && params[key] !== undefined) {
            prop.setValue(params[key] as number, true);
          }
        }
        return true;
      }
    }

    // Lumetri not found — add it via QE
    const qe = app.enableQE?.();
    if (qe) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qeSeq = (app as any).project.activeSequence;
      qeSeq.getVideoTrackAt(0).getItemAt(0).addVideoEffect('Lumetri Color');
    }
    return false;
  } catch {
    return false;
  }
}

export function addVideoEffect(clipId: string, effectName: string, params?: Record<string, number | string | boolean>): boolean {
  try {
    const qe = app.enableQE?.();
    if (!qe) return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qeSeq = (app as any).project.activeSequence;
    // Find clip position in QE sequence
    const seq = app.project.activeSequence;
    if (!seq) return false;

    for (let i = 0; i < seq.videoTracks.numTracks; i++) {
      const track = seq.videoTracks[i];
      for (let j = 0; j < track.clips.numItems; j++) {
        if (track.clips[j].nodeId === clipId) {
          const qeClip = qeSeq.getVideoTrackAt(i).getItemAt(j);
          qeClip.addVideoEffect(effectName);

          if (params) {
            const component = track.clips[j].components;
            for (let k = 0; k < component.numItems; k++) {
              if (component[k].displayName === effectName) {
                for (let p = 0; p < component[k].properties.numItems; p++) {
                  const prop = component[k].properties[p];
                  const val = params[prop.displayName];
                  if (typeof val === 'number') prop.setValue(val, true);
                }
              }
            }
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

export function addZoomKeyframes(
  clipId: string,
  startScale: number,
  endScale: number,
  startTime: number,
  endTime: number
): boolean {
  try {
    const clip = findClipById(clipId);
    if (!clip) return false;

    // Find Motion effect > Scale property
    for (let k = 0; k < clip.components.numItems; k++) {
      const comp = clip.components[k];
      if (comp.displayName === 'Motion') {
        for (let p = 0; p < comp.properties.numItems; p++) {
          const prop = comp.properties[p];
          if (prop.displayName === 'Scale') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const scaleProp = prop as any;
            scaleProp.addKey(startTime);
            scaleProp.setValueAtKey(startTime, startScale);
            scaleProp.addKey(endTime);
            scaleProp.setValueAtKey(endTime, endScale);
            return true;
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}
