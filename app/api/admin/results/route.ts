import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/app/api/lib/auth';
import type { PinResult } from '@/lib/types';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const url = new URL(req.url);
  const roundId = url.searchParams.get('round_id');

  const pool = getPool();
  const query = roundId
    ? `SELECT p.*,
              COUNT(CASE WHEN v.value = 'cash' THEN 1 END)::int AS cash_count,
              COUNT(CASE WHEN v.value = 'trash' THEN 1 END)::int AS trash_count,
              COUNT(v.id)::int AS total_votes,
              CASE WHEN COUNT(v.id) = 0 THEN 0
                   ELSE (COUNT(CASE WHEN v.value = 'cash' THEN 1 END)::float - COUNT(CASE WHEN v.value = 'trash' THEN 1 END)::float) / COUNT(v.id)
              END AS score
       FROM pins p
       LEFT JOIN votes v ON v.pin_id = p.id
       WHERE p.round_id = $1
       GROUP BY p.id
       ORDER BY score DESC, total_votes DESC`
    : `SELECT p.*,
              COUNT(CASE WHEN v.value = 'cash' THEN 1 END)::int AS cash_count,
              COUNT(CASE WHEN v.value = 'trash' THEN 1 END)::int AS trash_count,
              COUNT(v.id)::int AS total_votes,
              CASE WHEN COUNT(v.id) = 0 THEN 0
                   ELSE (COUNT(CASE WHEN v.value = 'cash' THEN 1 END)::float - COUNT(CASE WHEN v.value = 'trash' THEN 1 END)::float) / COUNT(v.id)
              END AS score
       FROM pins p
       LEFT JOIN votes v ON v.pin_id = p.id
       JOIN rounds r ON r.id = p.round_id
       WHERE r.status = 'active'
       GROUP BY p.id
       ORDER BY score DESC, total_votes DESC`;

  const result = await pool.query<PinResult>(query, roundId ? [roundId] : []);
  return NextResponse.json(result.rows);
}
