import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/lib/auth';
import { getPool } from '@/lib/db';
import { computeElementScores } from '@/lib/preference-engine';
import { analyzePreferences } from '@/lib/claude';
import type { Round, Pin } from '@/lib/types';

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { round_id } = await req.json();
  if (!round_id) {
    return NextResponse.json({ error: 'round_id is required' }, { status: 400 });
  }

  const pool = getPool();

  // Get round info
  const roundResult = await pool.query<Round>('SELECT * FROM rounds WHERE id = $1', [round_id]);
  if (roundResult.rows.length === 0) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  }
  const round = roundResult.rows[0];

  // Compute element scores
  const elementScores = await computeElementScores(round_id);

  // Get top and bottom pins by vote score
  const pinsResult = await pool.query<Pin & { cash: string; trash: string }>(
    `SELECT p.concept_text,
            COUNT(CASE WHEN v.value = 'cash' THEN 1 END) AS cash,
            COUNT(CASE WHEN v.value = 'trash' THEN 1 END) AS trash
     FROM pins p
     LEFT JOIN votes v ON v.pin_id = p.id
     WHERE p.round_id = $1
     GROUP BY p.id, p.concept_text
     ORDER BY cash::int - trash::int DESC`,
    [round_id]
  );

  const pinRows = pinsResult.rows;
  const topPins = pinRows.slice(0, 3).map(p => p.concept_text);
  const bottomPins = pinRows.slice(-3).map(p => p.concept_text);

  // Get Claude's analysis
  const analysis = await analyzePreferences(
    round.brief ?? '',
    elementScores,
    topPins,
    bottomPins
  );

  // Persist snapshot
  await pool.query(
    `INSERT INTO preference_snapshots (round_id, element_scores, claude_analysis, suggested_prompts)
     VALUES ($1, $2, $3, $4)`,
    [
      round_id,
      JSON.stringify(Object.fromEntries(elementScores.map(e => [e.tag, { cash: e.cash_count, trash: e.trash_count, score: e.score }]))),
      analysis.narrative,
      JSON.stringify(analysis.suggested_prompts),
    ]
  );

  return NextResponse.json({ element_scores: elementScores, analysis });
}
