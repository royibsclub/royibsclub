import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(__dirname, '../data/runtime-settings.json');

interface RuntimeSettings {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleServiceAccountPath?: string;
  videosOutputDir?: string;
}

function readSettings(): RuntimeSettings {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) as RuntimeSettings;
  } catch {
    return {};
  }
}

export function getSettings(): RuntimeSettings {
  return readSettings();
}

export function saveSettings(updates: Partial<RuntimeSettings>): void {
  const current = readSettings();
  const merged = { ...current, ...updates };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}

export function getAnthropicKey(): string {
  return readSettings().anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
}

export function getOpenAIKey(): string {
  return readSettings().openaiApiKey || process.env.OPENAI_API_KEY || '';
}

export function getGoogleServiceAccountPath(): string {
  return readSettings().googleServiceAccountPath ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    './google-service-account.json';
}

export function getVideosOutputDir(): string {
  return readSettings().videosOutputDir ||
    process.env.VIDEOS_OUTPUT_DIR ||
    '~/Videos';
}

export function getSettingsStatus() {
  const s = readSettings();
  const anthropicKey = s.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
  const openaiKey = s.openaiApiKey || process.env.OPENAI_API_KEY || '';
  const sheetsPath = s.googleServiceAccountPath || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  const outputDir = s.videosOutputDir || process.env.VIDEOS_OUTPUT_DIR || '~/Videos';

  return {
    anthropic: {
      configured: !!anthropicKey,
      source: s.anthropicApiKey ? 'settings' : (process.env.ANTHROPIC_API_KEY ? 'env' : 'none'),
      preview: anthropicKey ? `${anthropicKey.slice(0, 12)}...` : '',
    },
    openai: {
      configured: !!openaiKey,
      source: s.openaiApiKey ? 'settings' : (process.env.OPENAI_API_KEY ? 'env' : 'none'),
      preview: openaiKey ? `${openaiKey.slice(0, 12)}...` : '',
    },
    sheets: {
      configured: !!sheetsPath,
      path: sheetsPath,
    },
    outputDir: {
      configured: true,
      path: outputDir,
    },
  };
}
