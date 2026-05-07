import { Router } from 'express';
import type { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicKey } from '../services/settings';

export const hooksRouter = Router();

const VIRAL_SYSTEM_PROMPT = `אתה מומחה בכתיבת הוקים ויראליים לרשתות חברתיות בעברית.
מטרתך: לכתוב הוקים שגורמים לאנשים לעצור את הסקרול ולצפות בסרטון.

כללי הוק ויראלי:
- 3-10 שניות קריאה — קצר ומחודד
- יוצר סקרנות, מתח, או בלבול קל ("pattern interrupt")
- מבטיח ערך, גילוי, או תוצאה מפתיעה
- מדבר ישירות אל הצופה ("אתה", "אני מוכיח")
- לא שואל שאלה ישירה — אמירה שמעוררת שאלה אצל הצופה
- מותאם לפלטפורמה ולדמות

פורמטים שעובדים:
1. "לא האמנתי ש..." — ניגוד לציפייה
2. "הסיבה האמיתית שאתה..." — חשיפת סוד
3. "אחרי X שנים/חודשים גיליתי..." — ניסיון + גילוי
4. "X דברים שכולם עושים ש..." — רשימה + טענה חזקה
5. "הטעות שכולם עושים ב..." — כאב + פתרון
6. "3 שניות ואני מוכיח לך ש..." — מתח + הבטחה

כתוב בעברית טבעית, בטון ישיר וחם. ללא מילים מיותרות.`;

hooksRouter.post('/generate', async (req: Request, res: Response) => {
  const { topic, platform, character, niche } = req.body as {
    topic: string;
    platform?: string;
    character?: string;
    niche?: string;
  };

  if (!topic?.trim()) {
    res.status(400).json({ error: 'topic is required' });
    return;
  }

  try {
    const client = new Anthropic({ apiKey: getAnthropicKey() });

    const platformLabel: Record<string, string> = {
      tiktok: 'TikTok',
      instagram_reels: 'Instagram Reels',
      youtube_shorts: 'YouTube Shorts',
      youtube: 'YouTube',
    };

    const contextParts = [
      `נושא: ${topic}`,
      platform ? `פלטפורמה: ${platformLabel[platform] ?? platform}` : null,
      character ? `דמות: ${character}` : null,
      niche ? `נישה: ${niche}` : null,
    ].filter(Boolean).join('\n');

    const userMessage = `${contextParts}

צור בדיוק 5 הוקים ויראליים לפתיחת הסרטון.
פרמט: שורה אחת לכל הוק, ממוספרת 1-5.
ללא הסברים, ללא כותרות — רק 5 הוקים.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: VIRAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    // Parse numbered list: "1. text" or "1) text"
    const hooks = rawText
      .split('\n')
      .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((line) => line.length > 5)
      .slice(0, 5);

    res.json({ hooks });
  } catch (err) {
    console.error('[hooks] generate error:', err);
    res.status(500).json({ error: String(err) });
  }
});
