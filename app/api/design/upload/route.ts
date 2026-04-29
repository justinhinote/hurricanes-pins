import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '@/app/api/lib/auth';
import { uploadImage } from '@/lib/upload-image';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const playerId = await getPlayerSession();
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const { image, concept_text } = await req.json();

  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 });
  }
  const trimmedConcept = (concept_text ?? '').toString().trim();
  if (!trimmedConcept) {
    return NextResponse.json({ error: 'Add a short description of your design' }, { status: 400 });
  }

  const pool = getPool();
  const roundResult = await pool.query("SELECT id FROM rounds WHERE status = 'active' LIMIT 1");
  if (roundResult.rows.length === 0) {
    return NextResponse.json({ error: 'No active round yet — check back soon!' }, { status: 400 });
  }
  const roundId = roundResult.rows[0].id;

  const playerResult = await pool.query('SELECT name FROM players WHERE id = $1', [playerId]);
  const playerName = playerResult.rows[0]?.name ?? 'Player';

  const dataUri = image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
  const filename = `pins/${roundId}/upload-${playerId}-${Date.now()}.png`;
  const { url, pathname } = await uploadImage(dataUri, filename);

  const result = await pool.query(
    `INSERT INTO pins (round_id, concept_text, prompt_used, image_url, blob_key, tags, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, image_url, concept_text`,
    [roundId, trimmedConcept, `Player upload by ${playerName}`, url, pathname, ['player-upload', 'original'], playerId]
  );

  return NextResponse.json({ pin: result.rows[0] });
}
