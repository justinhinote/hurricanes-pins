import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '../lib/auth';
import type { Pin } from '@/lib/types';

export async function GET() {
  const pool = getPool();
  // Return pins from the active round
  const result = await pool.query<Pin>(
    `SELECT p.* FROM pins p
     JOIN rounds r ON r.id = p.round_id
     WHERE r.status = 'active'
     ORDER BY p.created_at ASC`
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { round_id, concept_text, prompt_used, image_url, blob_key, tags } = body;

  if (!round_id || !concept_text || !prompt_used || !image_url || !blob_key) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query<Pin>(
    `INSERT INTO pins (round_id, concept_text, prompt_used, image_url, blob_key, tags)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [round_id, concept_text, prompt_used, image_url, blob_key, tags ?? []]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
