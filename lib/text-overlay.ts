import sharp from 'sharp';
import type { PinText } from './pin-text';

/**
 * Normalize an AI-generated image to a 1024x1024 PNG with a white background.
 * Text is no longer composited here — the AI renders text directly into the
 * pin design from instructions in `lib/pin-text.ts#formatTextInstructions`.
 * The `text` parameter is accepted for backward compatibility but ignored.
 */
export async function addTextOverlay(imageSource: string, _text?: PinText): Promise<Buffer> {
  let imageBuffer: Buffer;
  if (imageSource.startsWith('data:')) {
    const base64Data = imageSource.split(',')[1];
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else {
    const res = await fetch(imageSource);
    const arrayBuffer = await res.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  }

  return sharp(imageBuffer)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
}
