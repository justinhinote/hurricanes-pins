import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { put } from '@vercel/blob';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ROUND_ID = 1;

const BRIEFS = [
  // Storm / Hurricane themes
  'A fierce hurricane swirl with the SP diamond logo in the eye, crimson and black, Cooperstown 2025',
  'Lightning bolts striking crossed baseball bats, hurricane clouds behind them, dark and intense',
  'A tornado funnel made of baseballs spiraling upward, SP shield floating in the center',
  'Electric hurricane eye with a glowing baseball inside, sparks flying outward',
  // Classic baseball themes
  'Vintage baseball with stitching that forms the SP diamond logo, old-school Cooperstown feel',
  'Crossed bats behind a home plate with SP Hurricanes text, retro enamel pin style',
  'A flaming baseball leaving a crimson fire trail, SP shield on the ball',
  'Home run swing silhouette with the ball flying toward a Cooperstown skyline',
  // Shield / Logo themes
  'The SP diamond shield with hurricane wings spreading out from each side, bold and powerful',
  'Diamond shield with a baseball wrapped in lightning, team banner below reading Cooperstown 2025',
  'SP logo inside a spinning hurricane vortex, red and black gradient, metallic look',
  // Cooperstown specific
  'The Cooperstown Dreams Park entrance arch with a Hurricanes banner and lightning sky',
  'A baseball diamond field aerial view with a hurricane overlay and SP logo at home plate',
  'Hall of Fame columns with the SP diamond carved into them, baseballs as decorations',
  // Cool / Bold themes
  'A skull wearing a Hurricanes baseball helmet with lightning bolt jaw, crimson visor',
  'A charging bull made of storm clouds holding a baseball bat, SP shield on its chest',
  'Neon-style SP diamond glowing against a dark storm cloud background, electric feel',
  'A baseball exploding through a brick wall with hurricane winds, debris flying',
  // Team spirit themes
  'Number 12U in massive bold font with a hurricane swirling through the numbers, SP logo above',
  'A championship trophy with hurricane winds circling it, SP Hurricanes Cooperstown 2025 banner',
];

async function generateOne(description, index) {
  const prefix = `[${index + 1}/20]`;
  console.log(`${prefix} Generating concept: ${description.substring(0, 60)}...`);

  // Claude generates DALL-E prompt
  const claudeRes = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You turn baseball pin ideas into DALL-E 3 prompts for trading pin designs.
Team: South Park Hurricanes, 12U baseball, Cooperstown 2025. Colors: crimson red and black.
Return ONLY JSON: {"dalle_prompt": "...", "tags": ["...", "..."]}. No markdown.`,
    messages: [{
      role: 'user',
      content: `Pin idea: "${description}"
Create a DALL-E 3 prompt. Start with "Trading pin design,". Specify: round enamel pin, crisp details, white background, team colors crimson red and black, professional sports pin style. 5-8 tags.`
    }]
  });

  const text = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text : '{}';
  let dallePrompt, tags;
  try {
    const parsed = JSON.parse(text);
    dallePrompt = parsed.dalle_prompt;
    tags = parsed.tags || [];
  } catch {
    dallePrompt = `Trading pin design, round enamel pin, ${description}, crimson red and black colors, SP diamond logo, Cooperstown 2025, professional sports trading pin, white background`;
    tags = ['hurricanes', 'baseball', 'cooperstown'];
  }

  console.log(`${prefix} Rendering image...`);

  // DALL-E generates image
  const imageRes = await openai.images.generate({
    model: 'dall-e-3',
    prompt: dallePrompt,
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
    n: 1,
  });

  const dalleUrl = imageRes.data?.[0]?.url;
  if (!dalleUrl) throw new Error('No image URL from DALL-E');

  // Upload to Vercel Blob
  const imgFetch = await fetch(dalleUrl);
  const imgBlob = await imgFetch.blob();
  const { url, pathname } = await put(`pins/${ROUND_ID}/seed-${Date.now()}-${index}.png`, imgBlob, { access: 'public' });

  console.log(`${prefix} Uploaded to Blob: ${url.substring(0, 60)}...`);

  // Insert to DB
  await pool.query(
    `INSERT INTO pins (round_id, concept_text, prompt_used, image_url, blob_key, tags)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ROUND_ID, description, dallePrompt, url, pathname, tags]
  );

  console.log(`${prefix} Done!`);
}

async function main() {
  console.log(`Generating ${BRIEFS.length} seed pins for Round 1...`);
  console.log('Rate limit: 5 images/min, ~12s between each\n');

  for (let i = 0; i < BRIEFS.length; i++) {
    try {
      await generateOne(BRIEFS[i], i);
    } catch (err) {
      console.error(`[${i + 1}/20] FAILED: ${err.message}`);
    }
    // Rate limit: 12s between requests (5/min DALL-E Tier 1)
    if (i < BRIEFS.length - 1) {
      console.log('  waiting 13s for rate limit...');
      await new Promise(r => setTimeout(r, 13000));
    }
  }

  console.log('\nAll done! Closing DB pool...');
  await pool.end();
}

main();
