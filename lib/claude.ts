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
The South Park Hurricanes are a 12U travel baseball team from Charlotte, NC going to Cooperstown.
Team colors: crimson red and black. Logo: SP diamond shield.
Return ONLY valid JSON. No markdown fences. No explanation.`,
    messages: [
      {
        role: 'user',
        content: `Design brief: ${brief}

Generate ${count} distinct trading pin concepts for the South Park Hurricanes.
Return a JSON array where each element has exactly these fields:
- concept: string (2-3 sentence visual description of the pin design)
- dalle_prompt: string (optimized for DALL-E 3; start with "Trading pin,"; be specific about colors, shape, style)
- tags: object with these keys, each an array of strings:
  - color_palette (e.g. ["crimson", "black", "gold"])
  - mascot (e.g. ["hurricane", "baseball", "bat"])
  - style (e.g. ["vintage", "enamel", "bold"])
  - theme (e.g. ["cooperstown", "championship", "storm"])
  - composition (e.g. ["circular", "shield", "star_burst"])

Rules:
- Each concept must be meaningfully different from the others
- Use consistent, lowercase tag vocabulary across all concepts
- Include "cooperstown" in the theme tags of at least one concept
- Include the SP diamond logo reference in at least two concepts
- Make pins that 12-year-old boys would think are cool`,
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
  - prompt_fragment: string (ready-to-use fragment for a DALL-E prompt — specific, visual, 20-40 words)
  - rationale: string (1 sentence why this is suggested based on the voting data)`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  return JSON.parse(text);
}
