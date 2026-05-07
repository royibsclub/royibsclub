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
              start: { seconds: number };
              end: { seconds: number };
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
      time: { seconds: number };
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

function getFirstTrackClip() {
  const seq = app.project.activeSequence;
  if (!seq || seq.videoTracks.numTracks === 0) return null;
  const track = seq.videoTracks[0];
  if (track.clips.numItems === 0) return null;
  return { clip: track.clips[0], trackIndex: 0, clipIndex: 0 };
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

// ── Demo Highlight Effects ─────────────────────────────────────────────────

export interface HighlightWaypoint {
  id: string;
  time: number;  // clip-relative seconds
  x: number;    // pixel coordinate (e.g. 0–1920)
  y: number;    // pixel coordinate (e.g. 0–1080)
}

export interface HighlightParams {
  size: number;      // spotlight radius or zoom level (20–300)
  intensity: number; // effect strength 0–100
  feather: number;   // softness for spotlight 0–200
  waypoints: HighlightWaypoint[];
}

export type HighlightMode = 'spotlight' | 'zoom' | 'lens';

export function applyZoomPunch(params: HighlightParams): boolean {
  try {
    const found = getFirstTrackClip();
    if (!found) return false;
    const { clip } = found;

    const zoomScale = 100 + (params.intensity / 100) * Math.max(params.size, 20);
    const { waypoints } = params;

    for (let k = 0; k < clip.components.numItems; k++) {
      const comp = clip.components[k];
      if (comp.displayName !== 'Motion') continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let scaleProp: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let posProp: any = null;

      for (let p = 0; p < comp.properties.numItems; p++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prop = comp.properties[p] as any;
        if (prop.displayName === 'Scale') scaleProp = prop;
        if (prop.displayName === 'Position') posProp = prop;
      }

      if (!scaleProp) return false;

      if (waypoints.length === 0) {
        scaleProp.setValue(zoomScale, true);
        return true;
      }

      // Ramp up before first waypoint
      const rampIn = Math.max(0, waypoints[0].time - 0.4);
      scaleProp.addKey(rampIn);
      scaleProp.setValueAtKey(rampIn, 100);

      for (const wp of waypoints) {
        scaleProp.addKey(wp.time);
        scaleProp.setValueAtKey(wp.time, zoomScale);
        if (posProp) {
          try {
            posProp.addKey(wp.time);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (posProp as any).setValueAtKey(wp.time, [wp.x, wp.y]);
          } catch { /* position keyframing may not be supported — skip */ }
        }
      }

      // Ramp back out after last waypoint
      const lastWp = waypoints[waypoints.length - 1];
      const rampOut = lastWp.time + 0.4;
      scaleProp.addKey(rampOut);
      scaleProp.setValueAtKey(rampOut, 100);

      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function applyLensMagnify(params: HighlightParams): boolean {
  try {
    const found = getFirstTrackClip();
    if (!found) return false;
    const { clip, trackIndex, clipIndex } = found;

    const qe = app.enableQE?.();
    if (!qe) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qeSeq = (app as any).project.activeSequence;
    const qeClip = qeSeq.getVideoTrackAt(trackIndex).getItemAt(clipIndex);
    qeClip.addVideoEffect('Magnify');

    // Configure Magnify effect properties
    for (let k = 0; k < clip.components.numItems; k++) {
      const comp = clip.components[k];
      if (comp.displayName !== 'Magnify') continue;

      for (let p = 0; p < comp.properties.numItems; p++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prop = comp.properties[p] as any;
        const dn: string = prop.displayName;

        if (dn === 'Size' || dn === 'Radius') prop.setValue(params.size, true);
        if (dn === 'Magnification') prop.setValue(1 + params.intensity / 100, true);
        if (dn === 'Link') prop.setValue(1, true); // Size & Feather linked
        if (dn === 'Feather') prop.setValue(params.feather / 2, true);
      }

      // Keyframe Center position at each waypoint
      for (const wp of params.waypoints) {
        for (let p = 0; p < comp.properties.numItems; p++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prop = comp.properties[p] as any;
          if (prop.displayName === 'Center') {
            try {
              prop.addKey(wp.time);
              prop.setValueAtKey(wp.time, [wp.x, wp.y]);
            } catch { /* 2D keyframe API varies — skip gracefully */ }
          }
        }
      }
      return true;
    }

    return true; // effect added, params set partially
  } catch {
    return false;
  }
}

export function applySpotlightEffect(params: HighlightParams): boolean {
  try {
    const found = getFirstTrackClip();
    if (!found) return false;
    const { clip, trackIndex, clipIndex } = found;

    // Add Lumetri Color for vignette darkening
    const qe = app.enableQE?.();
    if (!qe) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qeSeq = (app as any).project.activeSequence;
    const qeClip = qeSeq.getVideoTrackAt(trackIndex).getItemAt(clipIndex);

    let hasLumetri = false;
    for (let k = 0; k < clip.components.numItems; k++) {
      if (clip.components[k].displayName === 'Lumetri Color') { hasLumetri = true; break; }
    }
    if (!hasLumetri) qeClip.addVideoEffect('Lumetri Color');

    // Set vignette parameters on Lumetri Color
    for (let k = 0; k < clip.components.numItems; k++) {
      const comp = clip.components[k];
      if (comp.displayName !== 'Lumetri Color') continue;

      const vignetteAmount = -(params.intensity / 14);    // negative = darken edges
      const vignetteMidpoint = Math.max(10, 80 - params.size / 5); // smaller size = tighter midpoint
      const vignetteFeather = params.feather / 2;

      for (let p = 0; p < comp.properties.numItems; p++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prop = comp.properties[p] as any;
        const dn: string = prop.displayName;
        if (dn === 'Vignette Amount') prop.setValue(vignetteAmount, true);
        if (dn === 'Vignette Midpoint') prop.setValue(vignetteMidpoint, true);
        if (dn === 'Vignette Feather') prop.setValue(vignetteFeather, true);
        if (dn === 'Vignette Roundness') prop.setValue(50, true);
      }
      break;
    }

    // Apply subtle zoom toward waypoint positions to enhance the spotlight feel
    if (params.waypoints.length > 0) {
      applyZoomPunch({
        ...params,
        intensity: Math.min(params.intensity * 0.25, 25),
        size: 30,
      });
    }

    return true;
  } catch {
    return false;
  }
}

export function applyHighlightEffect(mode: HighlightMode, params: HighlightParams): boolean {
  switch (mode) {
    case 'zoom': return applyZoomPunch(params);
    case 'lens': return applyLensMagnify(params);
    case 'spotlight': return applySpotlightEffect(params);
  }
}
