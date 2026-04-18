import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/app/api/lib/auth';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const roundId = parseInt(id, 10);
  if (isNaN(roundId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const pool = getPool();
  // Deactivate all rounds, then activate the target
  await pool.query("UPDATE rounds SET status = 'archived' WHERE status = 'active'");
  const result = await pool.query(
    "UPDATE rounds SET status = 'active' WHERE id = $1 RETURNING *",
    [roundId]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}
