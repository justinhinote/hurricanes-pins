import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '../lib/auth';
import type { Round } from '@/lib/types';

export async function GET() {
  const pool = getPool();
  const result = await pool.query<Round>(
    'SELECT * FROM rounds ORDER BY created_at DESC'
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { name, brief } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query<Round>(
    'INSERT INTO rounds (name, brief) VALUES ($1, $2) RETURNING *',
    [name.trim(), brief?.trim() ?? null]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
