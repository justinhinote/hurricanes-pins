import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/app/api/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const pinId = parseInt(id, 10);
  if (isNaN(pinId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await req.json();
  const pool = getPool();

  if (typeof body.is_winner === 'boolean') {
    const result = await pool.query(
      'UPDATE pins SET is_winner = $1 WHERE id = $2 RETURNING *',
      [body.is_winner, pinId]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}
