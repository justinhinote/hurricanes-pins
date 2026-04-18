import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '@/app/api/lib/auth';
import { generateImage } from '@/lib/dalle';
import { put } from '@vercel/blob';
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

  // Use Claude to turn the kid's description into a great DALL-E prompt
  const claudeRes = await getClaude().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You turn kids' baseball pin ideas into optimized DALL-E 3 prompts.
The team: South Park Hurricanes, 12U travel baseball, going to Cooperstown.
Team colors: crimson red (#C41230) and black. Logo: SP diamond shield.
Trading pins are round or shield-shaped enamel pins, about 2 inches wide.
Return ONLY a JSON object with two fields: "dalle_prompt" and "tags" (array of 5-8 descriptive strings).
No markdown. No explanation.`,
    messages: [{
      role: 'user',
      content: `A kid on the team described their pin idea: "${description.trim()}"

Create a DALL-E 3 prompt that captures their idea while making it look like a professional trading pin.
The prompt should start with "Trading pin design," and specify: enamel pin style, the SP diamond logo somewhere, team colors (crimson red and black), Cooperstown 2025, and the kid's specific idea.`
    }]
  });

  const claudeText = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text : '{}';
  let dallePrompt: string;
  let tags: string[];
  try {
    const parsed = JSON.parse(claudeText);
    dallePrompt = parsed.dalle_prompt;
    tags = parsed.tags ?? [];
  } catch {
    dallePrompt = `Trading pin design, enamel pin style, South Park Hurricanes baseball team, crimson red and black colors, SP diamond logo, Cooperstown 2025, ${description.trim()}, professional sports trading pin, white background`;
    tags = ['hurricanes', 'baseball', 'cooperstown', 'crimson', 'enamel'];
  }

  // Generate image with DALL-E
  const dalleUrl = await generateImage(dallePrompt);

  // Upload to Vercel Blob immediately (DALL-E URLs expire in 1 hour)
  const imageRes = await fetch(dalleUrl);
  const imageBlob = await imageRes.blob();
  const filename = `pins/${roundId}/player-${playerId}-${Date.now()}.png`;
  const { url, pathname } = await put(filename, imageBlob, { access: 'public' });

  // Save the pin to the DB
  const pinResult = await pool.query(
    `INSERT INTO pins (round_id, concept_text, prompt_used, image_url, blob_key, tags, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, image_url`,
    [roundId, description.trim(), dallePrompt, url, pathname, tags, playerId]
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
