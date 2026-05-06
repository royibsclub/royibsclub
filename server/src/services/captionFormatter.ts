const CONNECTING_WORDS = new Set([
  'של', 'עם', 'את', 'כי', 'אם', 'לא', 'גם', 'רק', 'כן', 'עוד',
  'אבל', 'אז', 'כך', 'זה', 'זאת', 'הם', 'הן', 'אנו', 'אני',
  'הוא', 'היא', 'אל', 'על', 'עד', 'בין', 'תוך', 'דרך', 'אחרי',
  'לפני', 'כמו', 'ולכן', 'לכן', 'אך', 'ברם', 'אלא', 'אפילו',
]);

export interface CaptionLine {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
}

export interface CaptionStats {
  totalLines: number;
  totalWords: number;
  estimatedDuration: number;
}

export interface FormatOptions {
  wordsPerLine: number;
  maxCharsPerLine: number;
  punctuationMode: 'remove' | 'keep' | 'auto';
  smartHebrew: boolean;
  wordsPerSecond: number;
  startOffset: number;
}

export const DEFAULT_OPTIONS: FormatOptions = {
  wordsPerLine: 3,
  maxCharsPerLine: 28,
  punctuationMode: 'remove',
  smartHebrew: true,
  wordsPerSecond: 2.5,
  startOffset: 0,
};

function cleanText(text: string, mode: FormatOptions['punctuationMode']): string {
  // Strip TTS markers
  let cleaned = text
    .replace(/\[pause\]/gi, '')
    .replace(/\[emphasis\]/gi, '')
    .replace(/\[\/emphasis\]/gi, '')
    .replace(/\*\*/g, '')
    .replace(/---/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (mode === 'remove') {
    cleaned = cleaned.replace(/[,،;:–—]/g, '').replace(/\s+/g, ' ').trim();
  } else if (mode === 'auto') {
    // keep . and ? and ! but remove commas and dashes
    cleaned = cleaned.replace(/[,،;:–—]/g, '').replace(/\s+/g, ' ').trim();
  }
  // 'keep' — no further changes

  return cleaned;
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation, keeping the punctuation
  const parts = text.split(/(?<=[.?!])\s+/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function isConnecting(word: string): boolean {
  const stripped = word.replace(/[.?!,;:]/g, '');
  return CONNECTING_WORDS.has(stripped);
}

function groupWordsIntoLines(words: string[], opts: FormatOptions): string[] {
  const lines: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk: string[] = [];
    let charCount = 0;

    while (i < words.length && chunk.length < opts.wordsPerLine) {
      const word = words[i];
      if (charCount + word.length + (chunk.length ? 1 : 0) > opts.maxCharsPerLine && chunk.length > 0) {
        break;
      }
      chunk.push(word);
      charCount += word.length + (chunk.length > 1 ? 1 : 0);
      i++;
    }

    // Smart Hebrew: if last word in chunk is a connecting word, move it to next line
    if (opts.smartHebrew && chunk.length > 1) {
      const last = chunk[chunk.length - 1];
      if (isConnecting(last) && i < words.length) {
        chunk.pop();
        i--;
      }
    }

    if (chunk.length > 0) {
      lines.push(chunk.join(' '));
    }
  }

  return lines;
}

function toSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function formatCaptions(
  rawText: string,
  opts: Partial<FormatOptions> = {}
): { lines: CaptionLine[]; srt: string; stats: CaptionStats } {
  const options: FormatOptions = { ...DEFAULT_OPTIONS, ...opts };

  // 1. Clean
  const cleaned = cleanText(rawText, options.punctuationMode);

  // 2. Split into sentences to preserve natural pauses at punctuation
  const sentences = splitIntoSentences(cleaned);

  // 3. Build caption lines
  const captionLines: CaptionLine[] = [];
  let currentTime = options.startOffset;
  let lineIndex = 1;
  let totalWords = 0;

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    totalWords += words.length;

    const grouped = groupWordsIntoLines(words, options);

    for (const lineText of grouped) {
      const lineWords = lineText.split(/\s+/).length;
      const duration = Math.max(lineWords / options.wordsPerSecond + 0.2, 0.8);

      captionLines.push({
        index: lineIndex++,
        text: lineText,
        startTime: Math.round(currentTime * 1000) / 1000,
        endTime: Math.round((currentTime + duration) * 1000) / 1000,
      });

      currentTime += duration;
    }
  }

  // 4. Build SRT
  const srtBlocks = captionLines.map((line) =>
    `${line.index}\n${toSrtTime(line.startTime)} --> ${toSrtTime(line.endTime)}\n${line.text}`
  );
  const srt = srtBlocks.join('\n\n');

  return {
    lines: captionLines,
    srt,
    stats: {
      totalLines: captionLines.length,
      totalWords,
      estimatedDuration: currentTime - options.startOffset,
    },
  };
}
