import sharp from 'sharp';

/**
 * Composite accurate text onto a pin design image using sharp + SVG.
 * Renders "SOUTH PARK HURRICANES" at top and "COOPERSTOWN 2026" at bottom
 * in a banner/ribbon style over the generated artwork.
 *
 * @param imageSource - base64 data URL or regular URL of the generated pin image
 * @returns Buffer of the composited PNG
 */
export async function addTextOverlay(imageSource: string): Promise<Buffer> {
  // Get image buffer from source
  let imageBuffer: Buffer;
  if (imageSource.startsWith('data:')) {
    const base64Data = imageSource.split(',')[1];
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else {
    const res = await fetch(imageSource);
    const arrayBuffer = await res.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  }

  // Resize to 1024x1024 to ensure consistent overlay positioning
  const resized = await sharp(imageBuffer)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  // Create SVG text overlay
  // Banner style: dark semi-transparent ribbons with white text
  const svgOverlay = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <!-- Top banner ribbon -->
      <rect x="0" y="0" width="1024" height="95" rx="0" fill="rgba(13,0,0,0.82)"/>
      <rect x="0" y="93" width="1024" height="3" fill="#C41230"/>

      <!-- Top text: SOUTH PARK HURRICANES -->
      <text x="512" y="40" text-anchor="middle"
            font-family="Impact, 'Arial Black', Helvetica, sans-serif"
            font-size="38" font-weight="900" letter-spacing="3"
            fill="#F5F0F0">SOUTH PARK HURRICANES</text>

      <!-- Subtitle: 12U SPYA -->
      <text x="512" y="72" text-anchor="middle"
            font-family="Impact, 'Arial Black', Helvetica, sans-serif"
            font-size="22" font-weight="700" letter-spacing="6"
            fill="#C41230">12U  ·  SPYA</text>

      <!-- Bottom banner ribbon -->
      <rect x="0" y="929" width="1024" height="95" rx="0" fill="rgba(13,0,0,0.82)"/>
      <rect x="0" y="929" width="1024" height="3" fill="#C41230"/>

      <!-- Bottom text: COOPERSTOWN 2026 -->
      <text x="512" y="985" text-anchor="middle"
            font-family="Impact, 'Arial Black', Helvetica, sans-serif"
            font-size="42" font-weight="900" letter-spacing="5"
            fill="#F5F0F0">COOPERSTOWN 2026</text>
    </svg>
  `;

  // Composite the text overlay onto the image
  const result = await sharp(resized)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return result;
}
