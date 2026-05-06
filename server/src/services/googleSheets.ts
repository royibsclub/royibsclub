import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import type { GanttRow, Platform } from '@premiere-ai/shared';

const CONFIG_PATH = path.join(__dirname, '../data/pipeline-config.json');

interface SheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  columns: Record<string, string>;
  statusValues: { planned: string; inProgress: string; done: string };
}

function loadConfig(): SheetsConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as SheetsConfig;
}

function getAuth() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error(
      'Google Service Account JSON not found. Set GOOGLE_SERVICE_ACCOUNT_JSON in .env'
    );
  }
  const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function colToIndex(col: string): number {
  // A=0, B=1, ..., Z=25, AA=26, etc.
  let index = 0;
  for (const ch of col.toUpperCase()) {
    index = index * 26 + ch.charCodeAt(0) - 64;
  }
  return index - 1;
}

function cellValue(row: (string | null | undefined)[], col: string): string {
  return (row[colToIndex(col)] ?? '').toString().trim();
}

export async function fetchGanttRows(): Promise<GanttRow[]> {
  const config = loadConfig();
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A${config.dataStartRow}:Z`,
  });

  const rows = response.data.values ?? [];
  const { columns: c, statusValues } = config;

  return rows
    .map((row, i): GanttRow => {
      const platform = cellValue(row, c.platform).toLowerCase().replace(/\s+/g, '_') as Platform;
      return {
        rowIndex: config.dataStartRow + i,
        date: cellValue(row, c.date),
        platform,
        contentType: cellValue(row, c.contentType),
        character: cellValue(row, c.character),
        location: cellValue(row, c.location),
        message: cellValue(row, c.message),
        hook: cellValue(row, c.hook),
        description: cellValue(row, c.description),
        durationSeconds: parseInt(cellValue(row, c.duration)) || 30,
        status: cellValue(row, c.status) as GanttRow['status'],
      };
    })
    .filter((r) => r.date && r.status === statusValues.planned);
}

export async function updateRowStatus(
  rowIndex: number,
  status: 'inProgress' | 'done'
): Promise<void> {
  const config = loadConfig();
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const statusValue =
    status === 'inProgress' ? config.statusValues.inProgress : config.statusValues.done;

  const col = config.columns.status;
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!${col}${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[statusValue]] },
  });
}

export function isGoogleSheetsConfigured(): boolean {
  const config = loadConfig();
  if (config.spreadsheetId === 'YOUR_SPREADSHEET_ID_HERE') return false;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyPath) return false;
  return fs.existsSync(keyPath);
}
