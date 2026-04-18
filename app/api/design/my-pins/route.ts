import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '@/app/api/lib/auth';

export async function GET() {
  const playerId = await getPlayerSession();
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT p.id, p.image_url, p.concept_text, p.created_at,
            pl.design_attempts
     FROM pins p
     JOIN players pl ON pl.id = p.created_by
     WHERE p.created_by = $1
     ORDER BY p.created_at DESC`,
    [playerId]
  );

  const attemptsResult = await pool.query<{ design_attempts: number }>(
    'SELECT design_attempts FROM players WHERE id = $1',
    [playerId]
  );

  return NextResponse.json({
    pins: result.rows,
    attempts_used: attemptsResult.rows[0]?.design_attempts ?? 0,
    attempts_remaining: 5 - (attemptsResult.rows[0]?.design_attempts ?? 0),
  });
}
