import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '@/app/api/lib/auth';

export async function GET() {
  const playerId = await getPlayerSession();
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const pool = getPool();
  const result = await pool.query<{ id: number; image_url: string; concept_text: string }>(
    `SELECT p.id, p.image_url, p.concept_text
     FROM pins p
     WHERE p.round_id = (SELECT id FROM rounds WHERE status = 'active' LIMIT 1)
       AND p.id NOT IN (
         SELECT v.pin_id FROM votes v WHERE v.player_id = $1
       )
     ORDER BY RANDOM()
     LIMIT 1`,
    [playerId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ done: true });
  }
  return NextResponse.json({ pin: result.rows[0] });
}
