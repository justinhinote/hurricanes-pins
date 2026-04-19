import { GoogleGenAI } from '@google/genai';

let _client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
  return _client;
}

/**
 * Generate an image using Google Imagen 3.
 * Returns base64-encoded PNG data (no data: prefix).
 */
export async function generateImagenImage(prompt: string): Promise<string> {
  const client = getClient();

  const response = await client.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
    },
  });

  const image = response.generatedImages?.[0];
  if (!image?.image?.imageBytes) {
    throw new Error('No image returned from Imagen');
  }

  return image.image.imageBytes;
}
