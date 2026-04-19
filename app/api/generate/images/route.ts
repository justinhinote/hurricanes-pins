import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/lib/auth';
import { generateImage } from '@/lib/dalle';
import { uploadImage } from '@/lib/upload-image';
import { sanitizePinText, type PinText } from '@/lib/pin-text';
import { getPool } from '@/lib/db';
import type { ConceptDraft } from '@/lib/types';

export const maxDuration = 300; // Vercel function max

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { round_id, concepts, text }: { round_id: number; concepts: ConceptDraft[]; text?: PinText } = await req.json();
  if (!round_id || !Array.isArray(concepts) || concepts.length === 0) {
    return NextResponse.json({ error: 'round_id and concepts are required' }, { status: 400 });
  }
  const pinText = sanitizePinText(text);

  const pool = getPool();
  const results: Array<{ success: boolean; pin_id?: number; image_url?: string; error?: string }> = [];

  for (const concept of concepts) {
    try {
      // Generate image — pass pinText so the AI bakes text into the design
      const imageSource = await generateImage(concept.dalle_prompt, pinText);
      const filename = `pins/${round_id}/${Date.now()}.png`;
      const { url, pathname } = await uploadImage(imageSource, filename, pinText);

      // Flatten tags to a string array
      const tags = [
        ...concept.tags.color_palette,
        ...concept.tags.mascot,
        ...concept.tags.style,
        ...concept.tags.theme,
        ...concept.tags.composition,
      ];

      const pinResult = await pool.query(
        `INSERT INTO pins (round_id, concept_text, prompt_used, image_url, blob_key, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, image_url`,
        [round_id, concept.concept, concept.dalle_prompt, url, pathname, tags]
      );

      results.push({ success: true, pin_id: pinResult.rows[0].id, image_url: url });

      // Respect DALL-E Tier 1 rate limit: 5 images/min = 12s between requests
      if (concepts.indexOf(concept) < concepts.length - 1) {
        await new Promise(r => setTimeout(r, 12000));
      }
    } catch (err) {
      results.push({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return NextResponse.json({ results });
}
