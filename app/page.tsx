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
    // DB not ready — show page without rankings
  }

  return (
    <div className="min-h-screen bg-black">

      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-[600px]">
        <div className="absolute inset-0">
          <Image src="/team-photo.png" alt="South Park Hurricanes 12U" fill className="object-cover animate-slow-zoom" style={{ objectPosition: 'center 30%' }} priority sizes="100vw" />
        </div>
        <div className="absolute inset-0 hero-vignette" style={{ background: 'linear-gradient(to bottom, rgba(13,0,0,0.4) 0%, rgba(13,0,0,0.15) 25%, rgba(13,0,0,0.15) 45%, rgba(13,0,0,0.6) 70%, rgba(13,0,0,1) 95%), radial-gradient(ellipse at center, transparent 40%, rgba(13,0,0,0.6) 100%)' }} />
        <svg className="absolute top-0 left-4 w-20 h-40 animate-lightning-strike pointer-events-none" viewBox="0 0 40 80" fill="none"><polyline points="28,0 14,32 22,32 8,80" stroke="#FF5500" strokeWidth="2.5" strokeLinejoin="round" opacity="0.8"/></svg>
        <svg className="absolute top-0 right-4 w-20 h-40 animate-lightning-strike-2 pointer-events-none" viewBox="0 0 40 80" fill="none"><polyline points="12,0 26,32 18,32 32,80" stroke="#FF5500" strokeWidth="2.5" strokeLinejoin="round" opacity="0.8"/></svg>
        <div className="relative z-10 flex flex-col items-center justify-end px-6 pb-8 pt-52 sm:pt-72 lg:pt-96">
          <h1 className="text-4xl sm:text-5xl text-sp-white leading-none tracking-tight text-center animate-float-up" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', textShadow: '3px 3px 0 #0D0000, 0 0 30px rgba(196,18,48,0.5)' }}>SOUTH PARK HURRICANES</h1>
          <p className="text-fire text-base sm:text-lg font-bold tracking-widest uppercase mt-3 animate-float-up-delay-1 text-center" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Cooperstown 2026 &mdash; Pin Design Contest</p>
          <div className="flex gap-3 mt-6 w-full max-w-xs animate-float-up-delay-2">
            <Link href={hasSession ? '/design' : '/join'} className="flex-1 flex items-center justify-center gap-2 bg-crimson text-sp-white font-bold py-4 rounded-xl active:scale-95 transition-all text-center" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 24px rgba(196,18,48,0.5)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>
              DESIGN
            </Link>
            <Link href={hasSession ? '/vote' : '/join'} className="flex-1 flex items-center justify-center gap-2 bg-black/60 border-2 border-sp-white/20 text-sp-white font-bold py-4 rounded-xl active:scale-95 transition-all backdrop-blur-sm text-center hover:border-crimson/50" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              VOTE
            </Link>
          </div>
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div className="px-6 max-w-lg mx-auto py-10">
        <h2 className="text-sp-white font-bold text-2xl mb-5 text-center" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>HOW IT WORKS</h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            <span className="shrink-0 w-9 h-9 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson text-sm font-bold">1</span>
            <div>
              <p className="text-sp-white font-bold text-base">Design Your Pin</p>
              <p className="text-gray-400 text-base leading-relaxed mt-0.5">Describe a pin another player would want immediately. Bold shape, clean look, one unforgettable feature.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <span className="shrink-0 w-9 h-9 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson text-sm font-bold">2</span>
            <div>
              <p className="text-sp-white font-bold text-base">Cash or Trash</p>
              <p className="text-gray-400 text-base leading-relaxed mt-0.5">Swipe through designs. CASH the ones you&apos;d trade for. TRASH the rest. Nobody sees scores.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <span className="shrink-0 w-9 h-9 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson text-sm font-bold">3</span>
            <div>
              <p className="text-sp-white font-bold text-base">Winners Get Made</p>
              <p className="text-gray-400 text-base leading-relaxed mt-0.5">Top designs get manufactured as real pins for Cooperstown.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== LIVE STATS ===== */}
      {(stats.total_pins > 0 || stats.total_votes > 0) && (
        <div className="px-6 max-w-lg mx-auto pb-8">
          <div className="bg-charcoal/70 border border-gray-800 rounded-2xl p-5">
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-3xl text-sp-white font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>{stats.total_pins}</p>
                <p className="text-gray-400 text-sm uppercase tracking-wider mt-1">Designs</p>
              </div>
              <div className="w-px bg-gray-800"/>
              <div className="text-center">
                <p className="text-3xl text-fire font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>{stats.total_votes}</p>
                <p className="text-gray-400 text-sm uppercase tracking-wider mt-1">Votes</p>
              </div>
              <div className="w-px bg-gray-800"/>
              <div className="text-center">
                <p className="text-3xl text-sp-white font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>{stats.total_players}</p>
                <p className="text-gray-400 text-sm uppercase tracking-wider mt-1">Voters</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== WHAT WE'RE MAKING ===== */}
      <div className="px-6 max-w-lg mx-auto pb-10">
        <h2 className="text-sp-white font-bold text-2xl mb-4 text-center" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>WHAT WE&apos;RE MAKING</h2>
        <div className="flex flex-col gap-2.5">
          {[
            { n: '1', title: 'The Main Team Trader', desc: "Our #1 pin. The one every team at Cooperstown wants." },
            { n: '2', title: 'The Cooperstown Pin', desc: "The trip pin. You were there. This proves it." },
            { n: '3', title: 'The Team-Insider Pin', desc: "The weird one. Only Hurricanes get it." },
          ].map(item => (
            <div key={item.n} className="bg-charcoal border border-gray-800 rounded-xl p-4 flex gap-3 items-center">
              <span className="shrink-0 w-8 h-8 rounded-full bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson text-sm font-bold">{item.n}</span>
              <div>
                <p className="text-sp-white font-bold text-base">{item.title}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
          <div className="bg-charcoal border border-fire/30 rounded-xl p-4 flex gap-3 items-center">
            <span className="shrink-0 w-8 h-8 rounded-full bg-fire/20 border border-fire/40 flex items-center justify-center text-fire text-sm font-bold">+</span>
            <div>
              <p className="text-fire font-bold text-base">The Hurricanes Alert Drop</p>
              <p className="text-gray-400 text-sm leading-relaxed">Mid-week surprise. Limited edition. Nobody sees it coming.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TOP DESIGNS RANKINGS ===== */}
      {rankedPins.length > 0 && (
        <div className="px-6 max-w-lg mx-auto pb-10">
          <h2 className="text-sp-white font-bold text-2xl mb-1 text-center" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>TOP DESIGNS</h2>
          <p className="text-gray-400 text-sm text-center mb-5 uppercase tracking-wider">Ranked by popular vote</p>
          <div className="flex flex-col gap-2.5">
            {rankedPins.map((pin, i) => {
              const isTop3 = i < 3;
              const rankColors = ['text-yellow-400 border-yellow-500/50 bg-yellow-500/10', 'text-gray-300 border-gray-400/50 bg-gray-400/10', 'text-orange-400 border-orange-500/50 bg-orange-500/10'];
              const ringColors = ['ring-yellow-500/30', 'ring-gray-400/30', 'ring-orange-500/30'];
              return (
                <div key={pin.id} className={`flex items-center gap-3 rounded-xl p-3 ${isTop3 ? 'bg-charcoal border border-gray-800' : 'bg-charcoal/40'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${isTop3 ? rankColors[i] : 'text-gray-400 border-gray-800 bg-black/30'}`}>{i + 1}</div>
                  <div className={`shrink-0 w-14 h-14 relative rounded-lg overflow-hidden bg-black/40 ${isTop3 ? `ring-2 ${ringColors[i]}` : ''}`}>
                    <Image src={pin.image_url} alt={`#${i + 1}`} fill className="object-contain" sizes="56px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sp-white text-base truncate">{pin.concept_text}</p>
                    {pin.creator_name && <p className="text-gray-400 text-sm mt-0.5 break-words">by {pin.creator_name}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTAs — directly after rankings */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href={hasSession ? '/vote' : '/join'} className="flex-1 text-center bg-crimson text-sp-white font-bold px-6 py-4 rounded-xl active:scale-95 transition-all" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(196,18,48,0.4)' }}>
              <span className="text-lg uppercase tracking-widest">Vote Now</span>
              <span className="block text-xs text-sp-white/60 uppercase tracking-wider mt-0.5 font-normal">Judge the Designs</span>
            </Link>
            <Link href={hasSession ? '/design' : '/join'} className="flex-1 text-center bg-charcoal border-2 border-fire/40 text-sp-white font-bold px-6 py-4 rounded-xl active:scale-95 transition-all hover:border-fire/70" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
              <span className="text-lg uppercase tracking-widest text-fire">Design</span>
              <span className="block text-xs text-gray-400 uppercase tracking-wider mt-0.5 font-normal">Think You Can Do Better?</span>
            </Link>
          </div>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <div className="px-6 py-8 text-center border-t border-gray-900">
        <span className="text-gray-500 text-lg font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>SP</span>
        <p className="text-gray-500 text-sm">South Park Hurricanes &bull; SPYA Baseball &bull; Cooperstown 2026</p>
        <Link href="/admin/login" className="text-gray-500 text-sm hover:text-gray-400 transition-colors mt-2 inline-block">Admin</Link>
      </div>
    </div>
  );
}
