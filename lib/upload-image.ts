import { put } from '@vercel/blob';

/**
 * Upload an image to Vercel Blob from either a data URL (base64) or a regular URL.
 * Returns the permanent Blob URL and pathname.
 */
export async function uploadImage(
  imageSource: string,
  blobPath: string
): Promise<{ url: string; pathname: string }> {
  let imageBlob: Blob;

  if (imageSource.startsWith('data:')) {
    // Base64 data URL from gpt-image-1
    const base64Data = imageSource.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    imageBlob = new Blob([buffer], { type: 'image/png' });
  } else {
    // Regular URL from DALL-E 3 (expires in 1 hour)
    const res = await fetch(imageSource);
    imageBlob = await res.blob();
  }

  return put(blobPath, imageBlob, { access: 'public' });
}
