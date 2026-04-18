import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPool } from '@/lib/db';

export default async function RootPage() {
  const cookieStore = await cookies();
  const playerToken = cookieStore.get('player_token')?.value;

  if (playerToken) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id FROM players WHERE session_token = $1',
      [playerToken]
    );
    if (result.rows.length > 0) {
      redirect('/vote');
    }
  }

  redirect('/join');
}
