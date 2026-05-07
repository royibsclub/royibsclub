// ExtendScript — runs in Premiere Pro host process.
// All functions return strings (primitives only — no objects).

function getProjectName() {
  try { return app.project.name; } catch (e) { return 'error:' + e.message; }
}

function getSequenceName() {
  try {
    var seq = app.project.activeSequence;
    return seq ? seq.name : 'none';
  } catch (e) { return 'error:' + e.message; }
}

function getPlayheadTime() {
  try {
    var seq = app.project.activeSequence;
    return seq ? String(seq.getPlayerPosition().seconds) : '-1';
  } catch (e) { return 'error:' + e.message; }
}

function getVideoTrackCount() {
  try {
    var seq = app.project.activeSequence;
    return seq ? String(seq.videoTracks.numTracks) : '0';
  } catch (e) { return 'error:' + e.message; }
}

function getV1ClipCount() {
  try {
    var seq = app.project.activeSequence;
    if (!seq || seq.videoTracks.numTracks === 0) return '0';
    return String(seq.videoTracks[0].clips.numItems);
  } catch (e) { return 'error:' + e.message; }
}

function testQEDOM() {
  try {
    var qe = app.enableQE();
    return qe ? 'ok' : 'failed';
  } catch (e) { return 'error:' + e.message; }
}

function getLastError() {
  try {
    return (typeof $.error !== 'undefined') ? String($.error) : 'none';
  } catch (e) { return 'none'; }
}

function addMarkerAtPlayhead(label) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'error:no_sequence';
    var t = seq.getPlayerPosition().seconds;
    seq.markers.createMarker(t);
    var m = seq.markers.getLastMarker();
    if (m) {
      m.name = label || 'MVP Test';
      return 'ok:' + t;
    }
    return 'error:marker_failed';
  } catch (e) { return 'error:' + e.message; }
}

function setClipScaleAtPlayhead(scale) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'error:no_sequence';
    var t = seq.getPlayerPosition().seconds;
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
      var track = seq.videoTracks[i];
      for (var j = 0; j < track.clips.numItems; j++) {
        var clip = track.clips[j];
        if (clip.inPoint.seconds <= t && clip.outPoint.seconds > t) {
          for (var k = 0; k < clip.components.numItems; k++) {
            var comp = clip.components[k];
            if (comp.displayName === 'Motion') {
              for (var p = 0; p < comp.properties.numItems; p++) {
                var prop = comp.properties[p];
                if (prop.displayName === 'Scale') {
                  prop.setValue(scale, true);
                  return 'ok:track' + i + '_clip' + j;
                }
              }
            }
          }
        }
      }
    }
    return 'error:no_clip_at_playhead';
  } catch (e) { return 'error:' + e.message; }
}

function addZoomPunchAtPlayhead(zoomScale) {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'error:no_sequence';
    var t = seq.getPlayerPosition().seconds;
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
      var track = seq.videoTracks[i];
      for (var j = 0; j < track.clips.numItems; j++) {
        var clip = track.clips[j];
        if (clip.inPoint.seconds <= t && clip.outPoint.seconds > t) {
          for (var k = 0; k < clip.components.numItems; k++) {
            var comp = clip.components[k];
            if (comp.displayName === 'Motion') {
              for (var p = 0; p < comp.properties.numItems; p++) {
                var prop = comp.properties[p];
                if (prop.displayName === 'Scale') {
                  prop.addKey(t - 0.1);
                  prop.setValueAtKey(t - 0.1, 100);
                  prop.addKey(t);
                  prop.setValueAtKey(t, zoomScale || 115);
                  prop.addKey(t + 0.5);
                  prop.setValueAtKey(t + 0.5, 100);
                  return 'ok:zoom_punch_applied';
                }
              }
            }
          }
        }
      }
    }
    return 'error:no_clip_at_playhead';
  } catch (e) { return 'error:' + e.message; }
}
