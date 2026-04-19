import Anthropic from '@anthropic-ai/sdk';
import type { ConceptDraft, SuggestedPrompt, ElementScore } from './types';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function generateConcepts(brief: string, count: number): Promise<ConceptDraft[]> {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: `You are an expert trading pin designer specializing in youth baseball.
The South Park Hurricanes (SPYA) are a 12U travel baseball team from Charlotte, NC going to Cooperstown in 2026.
Team colors: crimson red (#C41230) and black. Logo: SP diamond shield.

TEXT ACCURACY IS CRITICAL:
- Any text on pins must be spelled EXACTLY: "HURRICANES", "SOUTH PARK", "SPYA", "COOPERSTOWN", "2026"
- Prefer minimal text (1-2 words or just "SP" / "2026") — misspelled text ruins a pin
- If a word is risky to render, omit it from the design

PIN SHAPES — vary across concepts:
- Round/circular, shield, diamond, star, pennant/flag, home plate shape, bat-shaped, hexagon, arrowhead, rectangle with banner

Return ONLY valid JSON. No markdown fences. No explanation.`,
    messages: [
      {
        role: 'user',
        content: `Design brief: ${brief}

Generate ${count} distinct trading pin concepts for the South Park Hurricanes.
Return a JSON array where each element has exactly these fields:
- concept: string (2-3 sentence visual description of the pin design, including its shape)
- dalle_prompt: string (optimized for image generation; start with "Trading pin design,"; specify the pin SHAPE, colors, style, and any text EXACTLY as it should appear letter by letter; end with "white background")
- tags: object with these keys, each an array of strings:
  - color_palette (e.g. ["crimson", "black", "gold"])
  - mascot (e.g. ["hurricane", "baseball", "bat"])
  - style (e.g. ["vintage", "enamel", "bold"])
  - theme (e.g. ["cooperstown", "championship", "hurricanes"])
  - composition (e.g. ["shield", "pennant", "star_burst", "diamond"])

Rules:
- Each concept must use a DIFFERENT pin shape
- Use consistent, lowercase tag vocabulary across all concepts
- Include the exact year "2026" in prompts (NOT 2025)
- Any text in dalle_prompt must be spelled out: e.g. 'text reading exactly "HURRICANES" (H-U-R-R-I-C-A-N-E-S)'
- If a concept has complex text, prefer omitting it over risking misspelling
- Make pins that 12-year-old boys would think are awesome`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return JSON.parse(text) as ConceptDraft[];
}

export async function analyzePreferences(
  brief: string,
  elementScores: ElementScore[],
  topPinDescriptions: string[],
  bottomPinDescriptions: string[]
): Promise<{ narrative: string; winning_elements: string[]; losing_elements: string[]; suggested_prompts: SuggestedPrompt[] }> {
  const topElements = elementScores
    .filter(e => e.confidence > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(e => `${e.tag}: score=${e.score.toFixed(2)} (${e.cash_count} cash / ${e.trash_count} trash)`);

  const bottomElements = elementScores
    .filter(e => e.confidence > 0.3)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)
    .map(e => `${e.tag}: score=${e.score.toFixed(2)} (${e.cash_count} cash / ${e.trash_count} trash)`);

  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: `You are analyzing voting data from 12-year-old boys on baseball trading pin designs.
Return ONLY valid JSON. No markdown fences.`,
    messages: [
      {
        role: 'user',
        content: `Original design brief: ${brief}

TOP RATED elements (boys liked these):
${topElements.join('\n')}

BOTTOM RATED elements (boys did not like these):
${bottomElements.join('\n')}

Descriptions of top-scoring pins:
${topPinDescriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Descriptions of bottom-scoring pins:
${bottomPinDescriptions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Based on this voting data, return a JSON object with:
- narrative: string (2-3 sentence plain-English summary of what the boys liked and disliked)
- winning_elements: string[] (specific design elements to include more in Round 2)
- losing_elements: string[] (specific design elements to avoid in Round 2)
- suggested_prompts: array of 4 objects, each with:
  - theme: string (short name for this design direction)
  - prompt_fragment: string (ready-to-use fragment for an image prompt — specific, visual, 20-40 words, specify a pin SHAPE that varies between suggestions)
  - rationale: string (1 sentence why this is suggested based on the voting data)`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  return JSON.parse(text);
}
