import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getPlayerSession } from '../../lib/auth';

export async function PATCH(req: NextRequest) {
  const playerId = await getPlayerSession();
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const { pin_id, reasons } = await req.json();
  if (!pin_id || !Array.isArray(reasons)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const pool = getPool();
  // reasons is a Postgres TEXT[] — pass the JS array directly so pg maps it
  // to a native array. JSON.stringify would give `"[]"` which Postgres can't
  // parse as an array literal.
  const result = await pool.query(
    'UPDATE votes SET reasons = $1 WHERE player_id = $2 AND pin_id = $3',
    [reasons, playerId, pin_id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
