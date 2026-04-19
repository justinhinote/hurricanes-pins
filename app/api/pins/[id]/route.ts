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

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (typeof body.is_winner === 'boolean') {
    updates.push(`is_winner = $${paramIndex++}`);
    values.push(body.is_winner);
  }
  if (body.award_category !== undefined) {
    updates.push(`award_category = $${paramIndex++}`);
    values.push(body.award_category);
  }
  if (typeof body.manufacturability_score === 'number') {
    updates.push(`manufacturability_score = $${paramIndex++}`);
    values.push(body.manufacturability_score);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  values.push(pinId);
  const result = await pool.query(
    `UPDATE pins SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
  }
  return NextResponse.json(result.rows[0]);
}
