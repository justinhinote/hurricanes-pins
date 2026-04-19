import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '@/app/api/lib/auth';
import { generateImage } from '@/lib/dalle';
import { uploadImage } from '@/lib/upload-image';
import Anthropic from '@anthropic-ai/sdk';

const MAX_ATTEMPTS = 5;

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

  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Describe your pin idea first' }, { status: 400 });
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

  // Check player's attempt count
  const playerResult = await pool.query<{ name: string; design_attempts: number }>(
    'SELECT name, design_attempts FROM players WHERE id = $1',
    [playerId]
  );
  const player = playerResult.rows[0];
  if (player.design_attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({
      error: `You've used all ${MAX_ATTEMPTS} design attempts. Your submissions are already in the contest!`
    }, { status: 429 });
  }

  // Claude turns the kid's description into an image generation prompt
  const claudeRes = await getClaude().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You turn kids' baseball pin ideas into image generation prompts.
The team: South Park Hurricanes (SPYA), 12U travel baseball, going to Cooperstown in 2026.
Team colors: crimson red (#C41230) and black. Logo: SP diamond shield.
Trading pins come in many shapes: round, shield, diamond, star, pennant, home plate, bat-shaped, etc.

TEXT ACCURACY IS CRITICAL:
- If the pin includes text, specify EXACT spelling: "HURRICANES" (H-U-R-R-I-C-A-N-E-S), "SOUTH PARK", "SPYA", "COOPERSTOWN" (C-O-O-P-E-R-S-T-O-W-N), "2026"
- If a word is hard to render accurately, OMIT IT. A pin with no text is better than a pin with misspelled text.
- Prefer minimal text — 1-2 words max, or just "SP" or "2026"

Return ONLY a JSON object with two fields: "image_prompt" and "tags" (array of 5-8 descriptive strings).
No markdown. No explanation.`,
    messages: [{
      role: 'user',
      content: `A kid on the team described their pin idea: "${description.trim()}"

Create an image generation prompt that captures their idea as a professional trading pin design.
The prompt should specify:
- Pin shape (vary it — not always round. Use shield, star, pennant, diamond, home plate, etc.)
- Enamel pin style with crisp details
- Team colors crimson red and black
- The kid's specific visual idea
- Minimal text (only include text if you can spell it EXACTLY right: "SP", "SPYA", "2026", "HURRICANES", "SOUTH PARK", "COOPERSTOWN")
- White or clean background so the pin shape is clear`
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
    imagePrompt = `Trading pin design, enamel pin, shield shape, South Park Hurricanes baseball team, crimson red and black colors, SP diamond logo, text reading exactly "SP" and "2026", ${description.trim()}, professional sports trading pin, white background`;
    tags = ['hurricanes', 'baseball', 'cooperstown', 'crimson', 'enamel'];
  }

  // Generate image
  const imageSource = await generateImage(imagePrompt);

  // Upload to Vercel Blob
  const filename = `pins/${roundId}/player-${playerId}-${Date.now()}.png`;
  const { url, pathname } = await uploadImage(imageSource, filename);

  // Save the pin to the DB
  const pinResult = await pool.query(
    `INSERT INTO pins (round_id, concept_text, prompt_used, image_url, blob_key, tags, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, image_url`,
    [roundId, description.trim(), imagePrompt, url, pathname, tags, playerId]
  );

  // Increment player's attempt count
  await pool.query(
    'UPDATE players SET design_attempts = design_attempts + 1 WHERE id = $1',
    [playerId]
  );

  return NextResponse.json({
    pin: pinResult.rows[0],
    attempts_remaining: MAX_ATTEMPTS - (player.design_attempts + 1),
  });
}
