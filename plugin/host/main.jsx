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

// Returns info about the audio clip at the playhead position.
// Searches all audio tracks. Returns 'ok:track<i>_clip<j>_name_<name>' or 'error:...'.
function getAudioClipAtPlayhead() {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'error:no_sequence';
    var t = seq.getPlayerPosition().seconds;
    for (var i = 0; i < seq.audioTracks.numTracks; i++) {
      var track = seq.audioTracks[i];
      for (var j = 0; j < track.clips.numItems; j++) {
        var clip = track.clips[j];
        if (clip.inPoint.seconds <= t && clip.outPoint.seconds > t) {
          return 'ok:track' + i + '_clip' + j + '_name_' + clip.name;
        }
      }
    }
    return 'error:no_audio_clip_at_playhead';
  } catch (e) { return 'error:' + e.message; }
}

// Applies the AI Voice Humanizer preset to the audio clip at the playhead.
// Attempts effect application via QE DOM (requires Premiere with QE enabled).
// Returns 'ok:...' if effects were added, 'manual:...' if QE is unavailable (apply manually).
function applyAIVoicePreset() {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return 'error:no_sequence';
    var t = seq.getPlayerPosition().seconds;

    // Find audio clip at playhead
    var foundTrack = -1, foundClip = -1, foundName = '';
    for (var i = 0; i < seq.audioTracks.numTracks; i++) {
      var track = seq.audioTracks[i];
      for (var j = 0; j < track.clips.numItems; j++) {
        var clip = track.clips[j];
        if (clip.inPoint.seconds <= t && clip.outPoint.seconds > t) {
          foundTrack = i; foundClip = j; foundName = clip.name;
          break;
        }
      }
      if (foundTrack >= 0) break;
    }

    if (foundTrack < 0) return 'error:no_audio_clip_at_playhead — move playhead over a voiceover clip';

    // Attempt QE DOM for effect application
    var qe = app.enableQE();
    if (!qe) return 'manual:' + foundName;

    try {
      var qeSeq = qe.project.getActiveSequence();
      if (!qeSeq) return 'manual:' + foundName;

      // Apply effects using QE audio track API
      var qeATrack = qeSeq.getAudioTrackAt(foundTrack);
      if (!qeATrack) return 'manual:' + foundName;

      var qeAClip = qeATrack.getItemAt(foundClip);
      if (!qeAClip) return 'manual:' + foundName;

      // Add Parametric Equalizer
      qeAClip.addEffect('Parametric Equalizer', 'Audio Effects');
      // Add Dynamics (compressor)
      qeAClip.addEffect('Dynamics', 'Audio Effects');
      // Add Studio Reverb (subtle room)
      qeAClip.addEffect('Studio Reverb', 'Audio Effects');

      return 'ok:effects_added_to_' + foundName;
    } catch (qeErr) {
      // QE clip API failed — guide user to manual apply
      return 'manual:' + foundName + '_qe_err_' + qeErr.message;
    }
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
