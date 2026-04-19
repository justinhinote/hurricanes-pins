import sharp from 'sharp';
import { writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { sanitizePinText, hasAnyText, type PinText } from './pin-text';
import { ANTON_BASE64 } from './font-data';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// librsvg (sharp's SVG renderer) does NOT support @font-face with data URIs —
// it only uses system-installed fonts. Vercel's Linux runtime ships no font
// with Latin glyphs, so SVG <text> renders as .notdef boxes. Workaround:
// write the bundled TTF to /tmp at first use and render text via sharp.text(),
// which uses Pango directly and accepts an arbitrary fontfile path.
const FONT_PATH = join(tmpdir(), 'pin-anton.ttf');
let fontReady = false;
function ensureFont(): string {
  if (!fontReady) {
    if (!existsSync(FONT_PATH)) {
      writeFileSync(FONT_PATH, Buffer.from(ANTON_BASE64, 'base64'));
    }
    fontReady = true;
  }
  return FONT_PATH;
}

interface RenderedText {
  buffer: Buffer;
  width: number;
  height: number;
}

async function renderText(text: string, fontSize: number, hexColor: string): Promise<RenderedText> {
  // Build a pango markup string with explicit color and tracking.
  // Anton renders narrow, so use modest letter_spacing to mimic Impact look.
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const markup = `<span foreground="${hexColor}" letter_spacing="2000">${escaped}</span>`;

  const out = await sharp({
    text: {
      text: markup,
      fontfile: ensureFont(),
      font: `Anton ${fontSize}`,
      rgba: true,
      align: 'centre',
      dpi: 72,
    },
  }).png().toBuffer({ resolveWithObject: true });

  return { buffer: out.data, width: out.info.width, height: out.info.height };
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

  const topBannerHeight = clean.middle ? 115 : 95;
  const showTopBanner = !!(clean.top || clean.middle);

  // Build SVG with just the rectangles — text is rendered separately.
  let svgRects = '';
  if (showTopBanner) {
    svgRects += `<rect x="0" y="0" width="1024" height="${topBannerHeight}" fill="rgba(13,0,0,0.85)"/>`;
    svgRects += `<rect x="0" y="${topBannerHeight - 2}" width="1024" height="3" fill="#C41230"/>`;
  }
  if (clean.bottom) {
    svgRects += `<rect x="0" y="929" width="1024" height="95" fill="rgba(13,0,0,0.85)"/>`;
    svgRects += `<rect x="0" y="929" width="1024" height="3" fill="#C41230"/>`;
  }
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${svgRects}</svg>`;

  const composites: sharp.OverlayOptions[] = [
    { input: Buffer.from(svg), top: 0, left: 0 },
  ];

  // Render each text line and place it
  if (clean.top) {
    const t = await renderText(clean.top, 48, '#F5F0F0');
    const left = Math.max(0, Math.floor((1024 - t.width) / 2));
    const top = clean.middle ? 18 : 28;
    composites.push({ input: t.buffer, top, left });
  }
  if (clean.middle) {
    const t = await renderText(clean.middle, 24, '#C41230');
    const left = Math.max(0, Math.floor((1024 - t.width) / 2));
    composites.push({ input: t.buffer, top: 76, left });
  }
  if (clean.bottom) {
    const t = await renderText(clean.bottom, 48, '#F5F0F0');
    const left = Math.max(0, Math.floor((1024 - t.width) / 2));
    composites.push({ input: t.buffer, top: 952, left });
  }

  const result = await sharp(resized).composite(composites).png().toBuffer();
  return result;
}

// escapeXml retained for SVG content but no longer needed for text — keeping
// the import side-effects minimal. (Function kept exported-internal in case
// future SVG content needs it.)
export { escapeXml };
