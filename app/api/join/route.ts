import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const trimmed = name?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const sessionToken = randomUUID();
  const pool = getPool();

  // Upsert player — if name already exists return existing token, else create new
  const existingResult = await pool.query<{ session_token: string }>(
    'SELECT session_token FROM players WHERE LOWER(name) = LOWER($1)',
    [trimmed]
  );

  let token: string;
  if (existingResult.rows.length > 0) {
    token = existingResult.rows[0].session_token;
  } else {
    await pool.query(
      'INSERT INTO players (name, session_token) VALUES ($1, $2)',
      [trimmed, sessionToken]
    );
    token = sessionToken;
  }

  const cookieStore = await cookies();
  cookieStore.set('player_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return NextResponse.json({ ok: true });
}
