import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/lib/auth';
import { generateImage } from '@/lib/dalle';
import { put } from '@vercel/blob';
import { getPool } from '@/lib/db';
import type { ConceptDraft } from '@/lib/types';

export const maxDuration = 300; // Vercel function max

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { round_id, concepts }: { round_id: number; concepts: ConceptDraft[] } = await req.json();
  if (!round_id || !Array.isArray(concepts) || concepts.length === 0) {
    return NextResponse.json({ error: 'round_id and concepts are required' }, { status: 400 });
  }

  const pool = getPool();
  const results: Array<{ success: boolean; pin_id?: number; image_url?: string; error?: string }> = [];

  for (const concept of concepts) {
    try {
      // Generate image from DALL-E
      const dalleUrl = await generateImage(concept.dalle_prompt);

      // Fetch image and upload to Vercel Blob (DALL-E URLs expire in 1 hour)
      const imageRes = await fetch(dalleUrl);
      const imageBlob = await imageRes.blob();
      const filename = `pins/${round_id}/${Date.now()}.png`;
      const { url, pathname } = await put(filename, imageBlob, { access: 'public' });

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
