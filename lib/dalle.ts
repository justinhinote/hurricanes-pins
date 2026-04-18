import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await getOpenAI().images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
    n: 1,
  });

  const url = response.data?.[0]?.url;
  if (!url) throw new Error('No image URL returned from DALL-E');
  return url;
}
