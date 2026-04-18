import type { ElementScore } from './types';
import { getPool } from './db';

export async function computeElementScores(roundId: number): Promise<ElementScore[]> {
  const pool = getPool();

  // Get all votes joined with pin tags for this round
  const result = await pool.query<{ tags: string[]; value: string }>(
    `SELECT p.tags, v.value
     FROM votes v
     JOIN pins p ON p.id = v.pin_id
     WHERE p.round_id = $1`,
    [roundId]
  );

  const tagMap = new Map<string, { cash: number; trash: number; total_pins: number }>();

  for (const row of result.rows) {
    for (const tag of row.tags) {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, { cash: 0, trash: 0, total_pins: 0 });
      }
      const entry = tagMap.get(tag)!;
      if (row.value === 'cash') entry.cash++;
      else entry.trash++;
      entry.total_pins++;
    }
  }

  const scores: ElementScore[] = [];
  for (const [tag, counts] of tagMap.entries()) {
    const total = counts.cash + counts.trash;
    if (total === 0) continue;
    scores.push({
      tag,
      cash_count: counts.cash,
      trash_count: counts.trash,
      score: (counts.cash - counts.trash) / total,
      confidence: Math.min(total / 10, 1.0), // confidence maxes at 10 votes
    });
  }

  return scores.sort((a, b) => b.score - a.score);
}
