import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Text accuracy wrapper: appends strict text rendering instructions to any prompt
function enforceTextAccuracy(prompt: string): string {
  return `${prompt}

CRITICAL TEXT RULES — follow these exactly:
- If the design includes text, every word must be spelled EXACTLY as specified. No creative reinterpretation of spelling.
- "HURRICANES" is spelled H-U-R-R-I-C-A-N-E-S (10 letters)
- "SOUTHPARK" or "SOUTH PARK" — S-O-U-T-H P-A-R-K
- "SPYA" — exactly four letters: S-P-Y-A
- "COOPERSTOWN" — C-O-O-P-E-R-S-T-O-W-N (11 letters)
- The year is "2026" — the digits 2, 0, 2, 6
- If you cannot render text accurately, OMIT the text entirely rather than misspelling it.`;
}

export async function generateImage(prompt: string): Promise<string> {
  const enhancedPrompt = enforceTextAccuracy(prompt);

  // Try gpt-image-1 first (much better at text), fall back to dall-e-3
  try {
    const response = await getOpenAI().images.generate({
      model: 'gpt-image-1',
      prompt: enhancedPrompt,
      size: '1024x1024',
      quality: 'medium',
      n: 1,
    });

    // gpt-image-1 returns b64_json by default
    const b64 = response.data?.[0]?.b64_json;
    if (b64) {
      // Convert base64 to a data URL we can fetch and upload to Blob
      return `data:image/png;base64,${b64}`;
    }

    // Fallback: check if URL was returned
    const url = response.data?.[0]?.url;
    if (url) return url;

    throw new Error('No image data returned');
  } catch (err) {
    // If gpt-image-1 fails (model not available, etc), fall back to dall-e-3
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('model') || errMsg.includes('not found') || errMsg.includes('does not exist')) {
      console.log('gpt-image-1 not available, falling back to dall-e-3');
      const response = await getOpenAI().images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        n: 1,
      });
      const url = response.data?.[0]?.url;
      if (!url) throw new Error('No image URL returned from DALL-E');
      return url;
    }
    throw err;
  }
}
