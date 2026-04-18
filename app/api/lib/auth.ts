import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (token !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function getPlayerSession(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('player_token')?.value;
  if (!token) return null;

  const { getPool } = await import('./db');
  const pool = getPool();
  const result = await pool.query<{ id: number }>(
    'SELECT id FROM players WHERE session_token = $1',
    [token]
  );
  return result.rows[0]?.id ?? null;
}
