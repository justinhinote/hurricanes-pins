import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPool } from '@/lib/db';
import VoteCard from '@/components/VoteCard';

export default async function VotePage() {
  const cookieStore = await cookies();
  const playerToken = cookieStore.get('player_token')?.value;
  if (!playerToken) redirect('/join');

  const pool = getPool();

  // Verify player session
  const playerResult = await pool.query<{ id: number }>(
    'SELECT id FROM players WHERE session_token = $1',
    [playerToken]
  );
  if (playerResult.rows.length === 0) redirect('/join');
  const playerId = playerResult.rows[0].id;

  // Check if there's an active round
  const roundResult = await pool.query(
    "SELECT id FROM rounds WHERE status = 'active' LIMIT 1"
  );
  if (roundResult.rows.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
        <h2 className="font-bold text-4xl text-sp-white mb-3" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
          HOLD TIGHT
        </h2>
        <p className="text-gray-400 text-xl max-w-xs">
          No pins are ready to vote on yet. Check back soon!
        </p>
      </div>
    );
  }

  // Fetch first pin for this player
  const pinResult = await pool.query<{ id: number; image_url: string; concept_text: string }>(
    `SELECT p.id, p.image_url, p.concept_text
     FROM pins p
     WHERE p.round_id = $1
       AND p.id NOT IN (
         SELECT v.pin_id FROM votes v WHERE v.player_id = $2
       )
     ORDER BY RANDOM()
     LIMIT 1`,
    [roundResult.rows[0].id, playerId]
  );

  const initialPin = pinResult.rows[0] ?? null;
  const initialDone = initialPin === null;

  return <VoteCard initialPin={initialPin} initialDone={initialDone} />;
}
