import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  const pool = getPool();

  const result = await pool.query<{
    id: number;
    image_url: string;
    concept_text: string;
    creator_name: string | null;
    total_votes: string;
    cash_ratio: string;
  }>(
    `SELECT p.id, p.image_url, p.concept_text, cr.name AS creator_name,
            COUNT(v.id)::int AS total_votes,
            CASE WHEN COUNT(v.id) = 0 THEN 0
                 ELSE ROUND(COUNT(CASE WHEN v.value = 'cash' THEN 1 END)::numeric / COUNT(v.id) * 100)
            END AS cash_ratio
     FROM pins p
     LEFT JOIN votes v ON v.pin_id = p.id
     LEFT JOIN players cr ON cr.id = p.created_by
     JOIN rounds r ON r.id = p.round_id
     WHERE r.status = 'active'
     GROUP BY p.id, cr.name
     HAVING COUNT(v.id) > 0
     ORDER BY cash_ratio DESC, total_votes DESC
     LIMIT 10`
  );

  // Return rankings without exact vote counts — just rank, image, and creator
  const rankings = result.rows.map((row, i) => ({
    rank: i + 1,
    id: row.id,
    image_url: row.image_url,
    concept_text: row.concept_text,
    creator_name: row.creator_name,
    has_votes: parseInt(row.total_votes as string) > 0,
  }));

  // Also get total stats
  const statsResult = await pool.query<{ total_pins: string; total_votes: string; total_players: string }>(
    `SELECT
       (SELECT COUNT(*) FROM pins p JOIN rounds r ON r.id = p.round_id WHERE r.status = 'active') AS total_pins,
       (SELECT COUNT(*) FROM votes v JOIN pins p ON p.id = v.pin_id JOIN rounds r ON r.id = p.round_id WHERE r.status = 'active') AS total_votes,
       (SELECT COUNT(DISTINCT v.player_id) FROM votes v JOIN pins p ON p.id = v.pin_id JOIN rounds r ON r.id = p.round_id WHERE r.status = 'active') AS total_players`
  );

  return NextResponse.json({
    rankings,
    stats: {
      total_pins: parseInt(statsResult.rows[0]?.total_pins ?? '0'),
      total_votes: parseInt(statsResult.rows[0]?.total_votes ?? '0'),
      total_players: parseInt(statsResult.rows[0]?.total_players ?? '0'),
    },
  });
}
