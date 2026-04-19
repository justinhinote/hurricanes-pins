#!/usr/bin/env node

/**
 * Reprocess all pins: download each image, composite the text overlay,
 * re-upload to Vercel Blob at the same key, and update the DB if the URL changed.
 *
 * Run with:
 *   env $(cat .env.local | grep -v "^#" | xargs) node scripts/reprocess-pins.mjs
 */

import pg from 'pg';
import sharp from 'sharp';
import { put } from '@vercel/blob';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// SVG overlay -- identical to lib/text-overlay.ts
// ---------------------------------------------------------------------------
const SVG_OVERLAY = `
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Download an image from a URL or decode a data-URL into a Buffer. */
async function fetchImage(imageUrl) {
  if (imageUrl.startsWith('data:')) {
    const base64Data = imageUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Resize to 1024x1024 and composite the SVG text overlay. */
async function compositeOverlay(imageBuffer) {
  const resized = await sharp(imageBuffer)
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  const result = await sharp(resized)
    .composite([
      {
        input: Buffer.from(SVG_OVERLAY),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    // Fetch all pins
    const { rows: pins } = await pool.query(
      'SELECT id, image_url, blob_key FROM pins'
    );

    const total = pins.length;
    console.log(`Found ${total} pins to reprocess.\n`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < total; i++) {
      const pin = pins[i];
      const label = `[${i + 1}/${total}]`;

      try {
        console.log(`${label} Processing pin ID ${pin.id}...`);

        // 1. Download the current image
        const imageBuffer = await fetchImage(pin.image_url);

        // 2. Composite the text overlay
        const composited = await compositeOverlay(imageBuffer);

        // 3. Upload to Vercel Blob at the same blob_key (overwrite)
        const blobKey = pin.blob_key;
        const blob = await put(blobKey, composited, {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'image/png',
        });

        // 4. Update DB if the URL changed
        if (blob.url !== pin.image_url) {
          await pool.query('UPDATE pins SET image_url = $1 WHERE id = $2', [
            blob.url,
            pin.id,
          ]);
          console.log(`${label}   URL updated: ${blob.url}`);
        } else {
          console.log(`${label}   URL unchanged.`);
        }

        success++;
      } catch (err) {
        failed++;
        console.error(`${label}   FAILED for pin ID ${pin.id}: ${err.message}`);
      }
    }

    console.log(
      `\nDone. ${success} succeeded, ${failed} failed out of ${total}.`
    );
  } finally {
    await pool.end();
  }
}

main();
