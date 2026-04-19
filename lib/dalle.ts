import OpenAI from 'openai';
import { generateImagenImage } from './imagen';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Rules appended to every image generation prompt
const IMAGE_RULES = `
CRITICAL RULES:
1. Show exactly ONE single pin design centered on a clean white background. NOT multiple pins. NOT a collection. ONE pin.
2. DO NOT include ANY text, words, letters, numbers, or typography in the image. ZERO text of any kind. Text will be composited separately.
3. The pin should fill most of the frame — large, detailed, centered.
4. Show the pin as a physical enamel pin with metallic edges and a slight 3D quality.`;

/**
 * Generate a pin image. Tries Google Imagen 3 first (much better at text),
 * falls back to OpenAI gpt-image-1, then DALL-E 3.
 * Returns either a base64 data URL or a regular URL.
 */
export async function generateImage(prompt: string): Promise<string> {
  const fullPrompt = `${prompt}\n${IMAGE_RULES}`;

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
