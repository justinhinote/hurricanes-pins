import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { sanitizePinText, hasAnyText, type PinText } from './pin-text';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Cache the base64-encoded font once per cold start. We embed the font into
// the SVG itself so librsvg doesn't depend on the host's installed fonts —
// Vercel's Linux runtime has no Impact / Helvetica / etc., which silently
// renders all glyphs as .notdef boxes.
let fontDataUrlPromise: Promise<string> | null = null;
function getFontDataUrl(): Promise<string> {
  if (!fontDataUrlPromise) {
    fontDataUrlPromise = readFile(join(process.cwd(), 'public/fonts/Anton-Regular.ttf'))
      .then(buf => `data:font/ttf;base64,${buf.toString('base64')}`);
  }
  return fontDataUrlPromise;
}

export async function addTextOverlay(imageSource: string, text?: PinText): Promise<Buffer> {
  let imageBuffer: Buffer;
  if (imageSource.startsWith('data:')) {
    const base64Data = imageSource.split(',')[1];
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else {
    const res = await fetch(imageSource);
    const arrayBuffer = await res.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  }

  const resized = await sharp(imageBuffer)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  const clean = sanitizePinText(text);
  if (!hasAnyText(clean)) {
    return resized;
  }

  const fontUrl = await getFontDataUrl();

  const topBannerHeight = clean.middle ? 115 : 95;
  const showTopBanner = !!(clean.top || clean.middle);

  const topBanner = showTopBanner ? `
      <rect x="0" y="0" width="1024" height="${topBannerHeight}" fill="rgba(13,0,0,0.85)"/>
      <rect x="0" y="${topBannerHeight - 2}" width="1024" height="3" fill="#C41230"/>
      ${clean.top ? `
      <text x="512" y="${clean.middle ? 50 : 60}" text-anchor="middle"
            font-family="PinFont" font-size="48" letter-spacing="3"
            fill="#F5F0F0">${escapeXml(clean.top)}</text>
      ` : ''}
      ${clean.middle ? `
      <text x="512" y="92" text-anchor="middle"
            font-family="PinFont" font-size="24" letter-spacing="6"
            fill="#C41230">${escapeXml(clean.middle)}</text>
      ` : ''}
  ` : '';

  const bottomBanner = clean.bottom ? `
      <rect x="0" y="929" width="1024" height="95" fill="rgba(13,0,0,0.85)"/>
      <rect x="0" y="929" width="1024" height="3" fill="#C41230"/>
      <text x="512" y="990" text-anchor="middle"
            font-family="PinFont" font-size="48" letter-spacing="5"
            fill="#F5F0F0">${escapeXml(clean.bottom)}</text>
  ` : '';

  const svgOverlay = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style type="text/css">
          @font-face {
            font-family: 'PinFont';
            src: url('${fontUrl}') format('truetype');
          }
        </style>
      </defs>
      ${topBanner}
      ${bottomBanner}
    </svg>
  `;

  const result = await sharp(resized)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return result;
}
