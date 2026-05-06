import fs from 'fs';
import path from 'path';
import type { StyleProfile } from '@premiere-ai/shared';

const PROFILES_DIR = path.join(__dirname, '../data/profiles');

function ensureProfilesDir() {
  if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
  }
}

function profilePath(creatorId: string): string {
  return path.join(PROFILES_DIR, `${creatorId}.json`);
}

export function getProfile(creatorId: string): StyleProfile | null {
  ensureProfilesDir();
  const p = profilePath(creatorId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as StyleProfile;
}

export function saveProfile(profile: StyleProfile): void {
  ensureProfilesDir();
  profile.updatedAt = Date.now();
  fs.writeFileSync(profilePath(profile.creatorId), JSON.stringify(profile, null, 2));
}

export function createDefaultProfile(creatorId: string, name: string): StyleProfile {
  return {
    creatorId,
    name,
    updatedAt: Date.now(),
    editing: {
      averageCutsPerMinute: 15,
      preferredTransitions: ['Cross Dissolve'],
      clipLengthPreference: 'medium',
      paceStyle: 'moderate',
    },
    visual: {
      colorGrade: 'natural',
      zoomFrequency: 'sometimes',
    },
    audio: {
      musicStyle: ['upbeat', 'background'],
      sfxUsage: 'moderate',
    },
    captions: {
      style: {
        fontSize: 48,
        fontColor: '#FFFFFF',
        backgroundColor: 'transparent',
        position: 'bottom',
        bold: true,
      },
      frequency: 'key-moments',
      language: 'he',
    },
    platforms: ['instagram_reels', 'tiktok'],
    contentPillars: [],
    audienceNotes: '',
  };
}

export function listProfiles(): StyleProfile[] {
  ensureProfilesDir();
  return fs
    .readdirSync(PROFILES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, f), 'utf-8')) as StyleProfile);
}
