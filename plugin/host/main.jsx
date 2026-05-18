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

// Applies a Lumetri Color preset to the video clip at the playhead.
// presetJSON: '{"temperature":20,"contrast":25,"highlights":-20,...}'
// Returns 'ok:N_applied' or 'manual:reason' or 'error:reason'.
function applyLumetriPreset(presetJSON) {
  try {
    var preset;
    try { preset = JSON.parse(presetJSON); }
    catch (e) { preset = eval('(' + presetJSON + ')'); }

    var seq = app.project.activeSequence;
    if (!seq) return 'error:no_sequence';
    var t = seq.getPlayerPosition().seconds;

    // Find video clip at playhead
    var targetClip = null, targetTrackIdx = -1, targetClipIdx = -1;
    for (var i = 0; i < seq.videoTracks.numTracks; i++) {
      var track = seq.videoTracks[i];
      for (var j = 0; j < track.clips.numItems; j++) {
        var clip = track.clips[j];
        if (clip.inPoint.seconds <= t && clip.outPoint.seconds > t) {
          targetClip = clip; targetTrackIdx = i; targetClipIdx = j; break;
        }
      }
      if (targetClip) break;
    }
    if (!targetClip) return 'error:no_video_clip_at_playhead';

    // Find Lumetri Color on the clip
    var lumetri = null;
    for (var k = 0; k < targetClip.components.numItems; k++) {
      if (targetClip.components[k].displayName === 'Lumetri Color') {
        lumetri = targetClip.components[k]; break;
      }
    }

    // If absent, try adding via QE DOM
    if (!lumetri) {
      var qe = app.enableQE();
      if (qe) {
        try {
          var qeSeq = qe.project.getActiveSequence();
          var qeTrack = qeSeq.getVideoTrackAt(targetTrackIdx);
          var qeClip = qeTrack.getItemAt(targetClipIdx);
          qeClip.addEffect('Lumetri Color', 'Video Effects');
        } catch (qeErr) {}
        // Re-search
        for (var k2 = 0; k2 < targetClip.components.numItems; k2++) {
          if (targetClip.components[k2].displayName === 'Lumetri Color') {
            lumetri = targetClip.components[k2]; break;
          }
        }
      }
      if (!lumetri) return 'manual:' + targetClip.name + '_add_lumetri_first';
    }

    // Set a property by searching through all groups and sub-groups
    var applied = [], missed = [];
    function trySet(names, value) {
      for (var g = 0; g < lumetri.properties.numItems; g++) {
        var grp = lumetri.properties[g];
        for (var p = 0; p < grp.properties.numItems; p++) {
          var prop = grp.properties[p];
          for (var n = 0; n < names.length; n++) {
            if (prop.displayName.toLowerCase() === names[n].toLowerCase()) {
              prop.setValue(value, true);
              applied.push(names[0]);
              return;
            }
          }
          // One level deeper (White Balance sub-group)
          if (prop.properties) {
            for (var p2 = 0; p2 < prop.properties.numItems; p2++) {
              var sub = prop.properties[p2];
              for (var n2 = 0; n2 < names.length; n2++) {
                if (sub.displayName.toLowerCase() === names[n2].toLowerCase()) {
                  sub.setValue(value, true);
                  applied.push(names[0]);
                  return;
                }
              }
            }
          }
        }
      }
      missed.push(names[0]);
    }

    if (preset.temperature !== undefined) trySet(['Temperature', 'Temp', 'WB Temperature'], preset.temperature);
    if (preset.tint       !== undefined) trySet(['Tint', 'WB Tint'], preset.tint);
    if (preset.exposure   !== undefined) trySet(['Exposure'], preset.exposure);
    if (preset.contrast   !== undefined) trySet(['Contrast'], preset.contrast);
    if (preset.highlights !== undefined) trySet(['Highlights'], preset.highlights);
    if (preset.shadows    !== undefined) trySet(['Shadows'], preset.shadows);
    if (preset.whites     !== undefined) trySet(['Whites'], preset.whites);
    if (preset.blacks     !== undefined) trySet(['Blacks'], preset.blacks);
    if (preset.saturation !== undefined) trySet(['Saturation'], preset.saturation);

    var msg = 'ok:' + applied.length + '_params_on_' + targetClip.name;
    if (missed.length) msg += '_missed_' + missed.join(',');
    return msg;

  } catch (e) { return 'error:' + e.message; }
}

function getAudioClipAtPlayhead() {
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
