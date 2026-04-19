import Image from 'next/image';
import Link from 'next/link';
import { getPool } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

interface RankedPin {
  id: number;
  image_url: string;
  concept_text: string;
  creator_name: string | null;
  total_votes: number;
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get('player_token')?.value;

  const pool = getPool();

  // Get top ranked pins
  let rankedPins: RankedPin[] = [];
  let stats = { total_pins: 0, total_votes: 0, total_players: 0 };

  try {
    const result = await pool.query<RankedPin>(
      `SELECT p.id, p.image_url, p.concept_text, cr.name AS creator_name,
              COUNT(v.id)::int AS total_votes
       FROM pins p
       LEFT JOIN votes v ON v.pin_id = p.id
       LEFT JOIN players cr ON cr.id = p.created_by
       JOIN rounds r ON r.id = p.round_id
       WHERE r.status = 'active'
       GROUP BY p.id, cr.name
       ORDER BY
         CASE WHEN COUNT(v.id) = 0 THEN 0
              ELSE COUNT(CASE WHEN v.value = 'cash' THEN 1 END)::float / COUNT(v.id)
         END DESC,
         COUNT(v.id) DESC
       LIMIT 10`
    );
    rankedPins = result.rows;

    const statsResult = await pool.query<{ total_pins: string; total_votes: string; total_players: string }>(
      `SELECT
         (SELECT COUNT(*) FROM pins p JOIN rounds r ON r.id = p.round_id WHERE r.status = 'active') AS total_pins,
         (SELECT COUNT(*) FROM votes v JOIN pins p ON p.id = v.pin_id JOIN rounds r ON r.id = p.round_id WHERE r.status = 'active') AS total_votes,
         (SELECT COUNT(DISTINCT v.player_id) FROM votes v) AS total_players`
    );
    stats = {
      total_pins: parseInt(statsResult.rows[0]?.total_pins ?? '0'),
      total_votes: parseInt(statsResult.rows[0]?.total_votes ?? '0'),
      total_players: parseInt(statsResult.rows[0]?.total_players ?? '0'),
    };
  } catch {
    // DB not ready yet — show page without rankings
  }

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>

      {/* Hero */}
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="flex flex-col items-center gap-3 mb-5">
          <Image src="/logo.svg" alt="SP Hurricanes" width={80} height={80} priority />
          <h1 className="text-4xl sm:text-5xl text-sp-white leading-none tracking-tight" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', textShadow: '2px 2px 0 #C41230, 4px 4px 8px rgba(0,0,0,0.8)' }}>
            SOUTH PARK
          </h1>
          <h1 className="text-4xl sm:text-5xl text-crimson leading-none tracking-tight" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', textShadow: '2px 2px 0 #8B0D22' }}>
            HURRICANES
          </h1>
          <p className="text-fire text-sm font-bold tracking-widest uppercase mt-1">
            Cooperstown 2026 Pin Design Contest
          </p>
        </div>
      </div>

      {/* What is this */}
      <div className="px-6 max-w-lg mx-auto mb-8">
        <div className="bg-charcoal/70 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sp-white font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
            HOW IT WORKS
          </h2>
          <div className="flex flex-col gap-3 text-gray-400 text-sm leading-relaxed">
            <div className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson text-xs font-bold">1</span>
              <p><span className="text-sp-white font-bold">Design</span> — Describe your dream pin and AI creates it. Shields, spinners, unusual shapes — anything goes. The wildest pins get traded most at Cooperstown.</p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson text-xs font-bold">2</span>
              <p><span className="text-sp-white font-bold">Vote</span> — Swipe through everyone&apos;s designs. Swipe right or tap CASH for pins you love. Swipe left or tap TRASH to pass. Your votes are blind — nobody sees the scores.</p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson text-xs font-bold">3</span>
              <p><span className="text-sp-white font-bold">Win</span> — Top-voted designs get manufactured as real trading pins for the team. The best pins become your Cooperstown collection.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-6 max-w-lg mx-auto mb-10 flex gap-3">
        <Link
          href={hasSession ? '/design' : '/join'}
          className="flex-1 flex flex-col items-center justify-center gap-2 bg-crimson text-sp-white font-bold py-5 rounded-xl active:scale-95 transition-all"
          style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(196,18,48,0.4)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
          <span className="text-lg uppercase tracking-widest">Design</span>
        </Link>
        <Link
          href={hasSession ? '/vote' : '/join'}
          className="flex-1 flex flex-col items-center justify-center gap-2 bg-charcoal border-2 border-gray-700 text-sp-white font-bold py-5 rounded-xl active:scale-95 transition-all hover:border-crimson/50"
          style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="text-lg uppercase tracking-widest">Vote</span>
        </Link>
      </div>

      {/* Live stats */}
      {(stats.total_pins > 0 || stats.total_votes > 0) && (
        <div className="px-6 max-w-lg mx-auto mb-8">
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl text-sp-white font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>{stats.total_pins}</p>
              <p className="text-gray-600 text-xs uppercase tracking-wider">Designs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-sp-white font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>{stats.total_votes}</p>
              <p className="text-gray-600 text-xs uppercase tracking-wider">Votes Cast</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-sp-white font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>{stats.total_players}</p>
              <p className="text-gray-600 text-xs uppercase tracking-wider">Voters</p>
            </div>
          </div>
        </div>
      )}

      {/* Rankings */}
      {rankedPins.length > 0 && (
        <div className="px-6 max-w-lg mx-auto pb-16">
          <h2 className="text-sp-white font-bold text-xl mb-1 text-center" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
            TOP DESIGNS
          </h2>
          <p className="text-gray-600 text-xs text-center mb-5 uppercase tracking-wider">
            Ranked by popular vote &mdash; updated live
          </p>

          <div className="flex flex-col gap-3">
            {rankedPins.map((pin, i) => {
              const isTop3 = i < 3;
              const rankColors = ['text-yellow-400 border-yellow-400/40 bg-yellow-400/10', 'text-gray-300 border-gray-400/40 bg-gray-400/10', 'text-orange-400 border-orange-400/40 bg-orange-400/10'];
              return (
                <div
                  key={pin.id}
                  className={`flex items-center gap-4 rounded-xl p-3 transition-colors ${isTop3 ? 'bg-charcoal border border-gray-800' : 'bg-charcoal/50'}`}
                >
                  {/* Rank number */}
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${isTop3 ? rankColors[i] : 'text-gray-600 border-gray-800 bg-black/30'}`}>
                    {i + 1}
                  </div>

                  {/* Pin image */}
                  <div className={`shrink-0 w-14 h-14 relative rounded-lg overflow-hidden ${isTop3 ? 'ring-2 ring-crimson/30' : ''}`}>
                    <Image src={pin.image_url} alt={`Rank ${i + 1}`} fill className="object-contain" sizes="56px" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sp-white text-sm truncate">{pin.concept_text}</p>
                    {pin.creator_name && (
                      <p className="text-gray-600 text-xs mt-0.5">by {pin.creator_name}</p>
                    )}
                  </div>

                  {/* Votes indicator (bar, not number) */}
                  {pin.total_votes > 0 && (
                    <div className="shrink-0 w-12">
                      <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div className="h-full bg-crimson rounded-full" style={{ width: `${Math.max(20, 100 - i * 10)}%` }}/>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 pb-10 text-center">
        <p className="text-gray-700 text-xs">
          South Park Hurricanes &bull; SPYA Baseball &bull; Cooperstown 2026
        </p>
        <Link href="/admin/login" className="text-gray-800 text-xs hover:text-gray-600 transition-colors mt-2 inline-block">
          Admin
        </Link>
      </div>
    </div>
  );
}
