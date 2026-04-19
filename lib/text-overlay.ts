import sharp from 'sharp';

export interface TextOverlayOptions {
  /** Optional custom line to show below "12U · SPYA" (e.g. player name, number, nickname) */
  customLine?: string;
}

// Escape XML special characters for SVG
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Composite accurate text onto a pin design image using sharp + SVG.
 * Always renders "SOUTH PARK HURRICANES" at top and "COOPERSTOWN 2026" at bottom.
 * Optionally adds a custom text line (player name, number, etc.)
 */
export async function addTextOverlay(imageSource: string, options?: TextOverlayOptions): Promise<Buffer> {
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

  const customLine = options?.customLine?.trim();
  const topBannerHeight = customLine ? 115 : 95;

  const svgOverlay = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <!-- Top banner -->
      <rect x="0" y="0" width="1024" height="${topBannerHeight}" fill="rgba(13,0,0,0.85)"/>
      <rect x="0" y="${topBannerHeight - 2}" width="1024" height="3" fill="#C41230"/>

      <text x="512" y="38" text-anchor="middle"
            font-family="Impact, 'Arial Black', Helvetica, sans-serif"
            font-size="36" font-weight="900" letter-spacing="3"
            fill="#F5F0F0">SOUTH PARK HURRICANES</text>

      <text x="512" y="68" text-anchor="middle"
            font-family="Impact, 'Arial Black', Helvetica, sans-serif"
            font-size="20" font-weight="700" letter-spacing="6"
            fill="#C41230">12U  ·  SPYA</text>

      ${customLine ? `
      <text x="512" y="98" text-anchor="middle"
            font-family="Impact, 'Arial Black', Helvetica, sans-serif"
            font-size="22" font-weight="700" letter-spacing="2"
            fill="#FF5500">${escapeXml(customLine.toUpperCase())}</text>
      ` : ''}

      <!-- Bottom banner -->
      <rect x="0" y="929" width="1024" height="95" fill="rgba(13,0,0,0.85)"/>
      <rect x="0" y="929" width="1024" height="3" fill="#C41230"/>

      <text x="512" y="985" text-anchor="middle"
            font-family="Impact, 'Arial Black', Helvetica, sans-serif"
            font-size="42" font-weight="900" letter-spacing="5"
            fill="#F5F0F0">COOPERSTOWN 2026</text>
    </svg>
  `;

  const result = await sharp(resized)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return result;
}
