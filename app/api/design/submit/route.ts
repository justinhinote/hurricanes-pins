import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '@/app/api/lib/auth';

export async function POST(req: NextRequest) {
  const playerId = await getPlayerSession();
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const { image_url, blob_key, concept_text, prompt_used, tags, round_id } = await req.json();

  if (!image_url || !blob_key || !concept_text || !round_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO pins (round_id, concept_text, prompt_used, image_url, blob_key, tags, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, image_url`,
    [round_id, concept_text, prompt_used, image_url, blob_key, tags ?? [], playerId]
  );

  return NextResponse.json({ pin: result.rows[0] });
}
