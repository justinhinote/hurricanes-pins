import { put } from '@vercel/blob';
import { addTextOverlay, type TextOverlayOptions } from './text-overlay';

/**
 * Upload an image to Vercel Blob with text overlay composited.
 */
export async function uploadImage(
  imageSource: string,
  blobPath: string,
  overlayOptions?: TextOverlayOptions | false
): Promise<{ url: string; pathname: string }> {
  let imageBlob: Blob;

  if (overlayOptions !== false) {
    const composited = await addTextOverlay(imageSource, overlayOptions || undefined);
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
