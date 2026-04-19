import { put } from '@vercel/blob';
import { addTextOverlay } from './text-overlay';
import type { PinText } from './pin-text';

/**
 * Upload an image to Vercel Blob with text overlay composited.
 * Pass `text: false` to skip the overlay entirely (raw image).
 */
export async function uploadImage(
  imageSource: string,
  blobPath: string,
  text?: PinText | false
): Promise<{ url: string; pathname: string }> {
  let imageBlob: Blob;

  if (text !== false) {
    const composited = await addTextOverlay(imageSource, text || undefined);
    imageBlob = new Blob([new Uint8Array(composited)], { type: 'image/png' });
  } else if (imageSource.startsWith('data:')) {
    const base64Data = imageSource.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    imageBlob = new Blob([buffer], { type: 'image/png' });
  } else {
    const res = await fetch(imageSource);
    imageBlob = await res.blob();
  }

  return put(blobPath, imageBlob, { access: 'public' });
}
