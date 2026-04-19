import { put } from '@vercel/blob';
import { addTextOverlay } from './text-overlay';

/**
 * Upload an image to Vercel Blob. Applies text overlay (SOUTH PARK HURRICANES /
 * COOPERSTOWN 2026) to guarantee accurate typography, then uploads.
 *
 * @param imageSource - base64 data URL or regular URL
 * @param blobPath - destination path in Blob storage
 * @param skipOverlay - set true to upload raw image without text overlay
 */
export async function uploadImage(
  imageSource: string,
  blobPath: string,
  skipOverlay = false
): Promise<{ url: string; pathname: string }> {
  let imageBlob: Blob;

  if (!skipOverlay) {
    // Apply text overlay: composites accurate team text onto the AI artwork
    const composited = await addTextOverlay(imageSource);
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
