import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '@/app/api/lib/auth';
import { generateImage } from '@/lib/dalle';
import { uploadImage } from '@/lib/upload-image';
import Anthropic from '@anthropic-ai/sdk';

// No attempt limit — let the boys cook

let _claude: Anthropic | null = null;
function getClaude() {
  if (!_claude) _claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _claude;
}

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const playerId = await getPlayerSession();
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const body = await req.json();
  const { description, edit_of, photo } = body;
  // edit_of: if provided, this is a free refinement (no attempt cost)
  // photo: optional base64 image data for vision-based design

  if (!description?.trim() && !photo) {
    return NextResponse.json({ error: 'Describe your pin idea or upload a photo' }, { status: 400 });
  }

  const pool = getPool();

  // Check active round exists
  const roundResult = await pool.query(
    "SELECT id FROM rounds WHERE status = 'active' LIMIT 1"
  );
  if (roundResult.rows.length === 0) {
    return NextResponse.json({ error: 'No active round yet — check back soon!' }, { status: 400 });
  }
  const roundId = roundResult.rows[0].id;

  const isEdit = !!edit_of;

  // Build the concept description
  let conceptDescription = description?.trim() ?? '';

  // If a photo was uploaded, use Claude vision to describe it
  if (photo) {
    const visionRes = await getClaude().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: photo },
          },
          {
            type: 'text',
            text: `This is a sketch or reference image for a baseball trading pin design for the South Park Hurricanes (SPYA) team going to Cooperstown 2026. Describe the key visual elements, shapes, and themes in this image in 2-3 sentences so they can be used to generate a polished trading pin design.${conceptDescription ? ` The user also said: "${conceptDescription}"` : ''}`,
          },
        ],
      }],
    });
    const visionText = visionRes.content[0].type === 'text' ? visionRes.content[0].text : '';
    conceptDescription = visionText + (conceptDescription ? `. User notes: ${conceptDescription}` : '');
  }

  // Claude turns the description into an image generation prompt
  const editContext = isEdit ? `\nThis is a REVISION of a previous design. The user wants to modify it: "${conceptDescription}". Keep the same general concept but apply the requested changes.` : '';

  const claudeRes = await getClaude().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You turn kids' baseball pin ideas into image generation prompts for trading pins.
The team: South Park Hurricanes (SPYA), 12U travel baseball, Cooperstown 2026.
Team colors: crimson red (#C41230) and black. Logo: SP diamond shield.

PIN DESIGN PRINCIPLES (optimized for real Cooperstown trading):
- Strong silhouette first: one bold custom shape (hurricane swirl, storm flag, home plate, baseball with motion). NOT a standard circle.
- Minimal text: 6-8 words max. Just "South Park Hurricanes", "Cooperstown 2026", "SP", "12U". Text is formed in metal — less is more.
- One "wow" feature only: spinner OR dangler OR glitter OR glow. Not multiple effects stacked.
- High contrast: bold color blocking with raised metal lines. Red, black, silver, white, lightning accents. No subtle gradients.
- Size reference: 1.75-2.0 inch soft enamel pin. Design should read clearly at that size.
- Trade value matters: would a kid from another state want this immediately?

TEXT ACCURACY IS CRITICAL:
- Spell out exact text: "HURRICANES" (H-U-R-R-I-C-A-N-E-S), "SOUTH PARK", "SPYA", "COOPERSTOWN", "2026"
- Prefer minimal text — omit text if it might be misspelled
- A pin with NO text is better than one with WRONG text

Return ONLY a JSON object: {"image_prompt": "...", "tags": ["...", "..."]}. No markdown.`,
    messages: [{
      role: 'user',
      content: `Pin idea: "${conceptDescription}"${editContext}

Create an image generation prompt. Specify: pin shape (vary it), enamel pin style, team colors, the visual idea, and any text EXACTLY as it should appear. White/clean background.`
    }]
  });

  const claudeText = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text : '{}';
  let imagePrompt: string;
  let tags: string[];
  try {
    const parsed = JSON.parse(claudeText);
    imagePrompt = parsed.image_prompt;
    tags = parsed.tags ?? [];
  } catch {
    imagePrompt = `Trading pin design, enamel pin, shield shape, South Park Hurricanes, crimson red and black, text "SP" and "2026", ${conceptDescription}, professional sports trading pin, white background`;
    tags = ['hurricanes', 'baseball', 'cooperstown', 'crimson', 'enamel'];
  }

  // Generate image
  const imageSource = await generateImage(imagePrompt);

  // Upload to Vercel Blob (permanent URL)
  const filename = `pins/${roundId}/draft-${playerId}-${Date.now()}.png`;
  const { url, pathname } = await uploadImage(imageSource, filename);

  // Return as DRAFT — not saved to DB yet. Client must call /api/design/submit
  return NextResponse.json({
    draft: {
      image_url: url,
      blob_key: pathname,
      concept_text: conceptDescription,
      prompt_used: imagePrompt,
      tags,
      round_id: roundId,
    },
  });
}
