import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '../lib/auth';

export async function POST(req: NextRequest) {
  const playerId = await getPlayerSession();
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const { pin_id, value, reasons } = await req.json();
  if (!pin_id || !['cash', 'trash'].includes(value)) {
    return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });
  }

  const pool = getPool();
  try {
    // `reasons` is a Postgres TEXT[]. Pass the JS array directly — pg maps it
    // to a native array. JSON.stringify would give `"[]"` which Postgres can't
    // parse as an array literal and every vote would 500.
    await pool.query(
      'INSERT INTO votes (player_id, pin_id, value, reasons) VALUES ($1, $2, $3, $4)',
      [playerId, pin_id, value, Array.isArray(reasons) ? reasons : []]
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    // Unique constraint violation = already voted
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ error: 'Already voted on this pin' }, { status: 409 });
    }
    throw err;
  }
}
