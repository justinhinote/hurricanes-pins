import OpenAI from 'openai';
import { generateImagenImage } from './imagen';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Text accuracy instructions appended to every prompt
const TEXT_RULES = `
CRITICAL TEXT RULES:
- "HURRICANES" is spelled H-U-R-R-I-C-A-N-E-S
- "SOUTH PARK" — S-O-U-T-H  P-A-R-K
- "SPYA" — exactly S-P-Y-A
- "COOPERSTOWN" — C-O-O-P-E-R-S-T-O-W-N
- The year is "2026" — digits 2-0-2-6
- If text cannot be rendered accurately, OMIT it rather than misspelling it.`;

/**
 * Generate a pin image. Tries Google Imagen 3 first (much better at text),
 * falls back to OpenAI gpt-image-1, then DALL-E 3.
 * Returns either a base64 data URL or a regular URL.
 */
export async function generateImage(prompt: string): Promise<string> {
  const fullPrompt = `${prompt}\n${TEXT_RULES}`;

  // Try Imagen 3 first (best text rendering)
  if (process.env.GOOGLE_API_KEY) {
    try {
      const b64 = await generateImagenImage(fullPrompt);
      return `data:image/png;base64,${b64}`;
    } catch (err) {
      console.error('Imagen failed, falling back to OpenAI:', err instanceof Error ? err.message : err);
    }
  }

  // Fallback: gpt-image-1
  try {
    const response = await getOpenAI().images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    });

    const b64 = response.data?.[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;
    const url = response.data?.[0]?.url;
    if (url) return url;
    throw new Error('No image data returned');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('model') || errMsg.includes('not found')) {
      // Final fallback: DALL-E 3
      const response = await getOpenAI().images.generate({
        model: 'dall-e-3',
        prompt: fullPrompt,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        n: 1,
      });
      const url = response.data?.[0]?.url;
      if (!url) throw new Error('No image URL returned');
      return url;
    }
    throw err;
  }
}
