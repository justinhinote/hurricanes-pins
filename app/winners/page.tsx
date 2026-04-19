import Image from 'next/image';
import { getPool } from '@/lib/db';
import type { Pin } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CATEGORIES: Record<string, { title: string; description: string }> = {
  best_trader: {
    title: 'Best Overall Trader',
    description: 'The pin other teams would trade for immediately. Bold shape, clean design, maximum trade value.',
  },
  most_creative: {
    title: 'Most Creative Team Pin',
    description: 'The most original concept the team came up with. Nobody else at Cooperstown will have anything like it.',
  },
  cooperstown_spirit: {
    title: 'Best Cooperstown Spirit',
    description: 'Captures the magic of the Cooperstown trip. Dreams Park energy meets Hurricanes identity.',
  },
  coaches_pick: {
    title: "Coach's Pick",
    description: 'Hand-selected by the coaching staff. The design that represents what this team is about.',
  },
  secret_drop: {
    title: 'Hurricanes Alert Drop',
    description: 'Limited edition mid-week surprise. Special finish, small run. The pin nobody sees coming.',
  },
};

export default async function WinnersPage() {
  const pool = getPool();
  const result = await pool.query<Pin & { award_category: string | null }>(
    'SELECT * FROM pins WHERE is_winner = true ORDER BY created_at ASC'
  );
  const winners = result.rows;

  // Group by category
  const categorized = new Map<string, typeof winners>();
  const uncategorized: typeof winners = [];
  for (const pin of winners) {
    if (pin.award_category && CATEGORIES[pin.award_category]) {
      if (!categorized.has(pin.award_category)) categorized.set(pin.award_category, []);
      categorized.get(pin.award_category)!.push(pin);
    } else {
      uncategorized.push(pin);
    }
  }

  return (
    <div className="min-h-screen px-6 py-12" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-crimson text-4xl font-bold block mb-4" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>SP</span>
          <h1 className="font-bold text-5xl text-sp-white leading-tight" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', textShadow: '2px 2px 0 #C41230' }}>
            WINNING PINS
          </h1>
          <p className="text-fire text-base font-bold tracking-widest uppercase mt-2">
            Cooperstown 2026 &mdash; South Park Hurricanes
          </p>
          <p className="text-gray-400 text-base mt-3 max-w-md mx-auto">
            Voted by the team. Made for Cooperstown. These designs are being manufactured as real trading pins.
          </p>
        </div>

        {winners.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">Winners coming soon. Keep voting!</p>
            <p className="text-gray-500 text-base mt-2">The best designs across five award categories will be selected.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Categorized winners */}
            {Array.from(categorized.entries()).map(([catKey, pins]) => {
              const cat = CATEGORIES[catKey];
              return (
                <div key={catKey}>
                  <div className="mb-3">
                    <h2 className="text-sp-white text-xl font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
                      {cat.title.toUpperCase()}
                    </h2>
                    <p className="text-gray-400 text-sm mt-0.5">{cat.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {pins.map(pin => (
                      <div
                        key={pin.id}
                        className="bg-charcoal rounded-xl overflow-hidden border border-crimson/30"
                        style={{ boxShadow: '0 0 20px rgba(255,85,0,0.15)' }}
                      >
                        <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
                          <Image src={pin.image_url} alt="Winning pin" fill className="object-contain" sizes="(max-width: 640px) 50vw, 300px" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized winners */}
            {uncategorized.length > 0 && (
              <div>
                {categorized.size > 0 && (
                  <h2 className="text-sp-white text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
                    SELECTED DESIGNS
                  </h2>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {uncategorized.map(pin => (
                    <div
                      key={pin.id}
                      className="bg-charcoal rounded-xl overflow-hidden border border-crimson/30"
                      style={{ boxShadow: '0 0 20px rgba(255,85,0,0.15)' }}
                    >
                      <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
                        <Image src={pin.image_url} alt="Winning pin" fill className="object-contain" sizes="(max-width: 640px) 50vw, 300px" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Production strategy */}
        <div className="mt-12 bg-charcoal/60 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-fire text-sm font-bold uppercase tracking-widest mb-3">The Collection</h3>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex gap-3">
              <span className="text-crimson font-bold shrink-0">1.</span>
              <p className="text-gray-300"><span className="text-sp-white font-bold">Main Team Trader</span> — The official team pin built for maximum trade value.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-crimson font-bold shrink-0">2.</span>
              <p className="text-gray-300"><span className="text-sp-white font-bold">Cooperstown Pin</span> — The trip memory pin celebrating Dreams Park.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-crimson font-bold shrink-0">3.</span>
              <p className="text-gray-300"><span className="text-sp-white font-bold">Team-Insider Pin</span> — The one only Hurricanes understand.</p>
            </div>
            <div className="flex gap-3 mt-1 pt-3 border-t border-gray-800">
              <span className="text-fire font-bold shrink-0">+</span>
              <p className="text-gray-300"><span className="text-fire font-bold">Hurricanes Alert Drop</span> — Mid-week limited edition surprise. You will not see it coming.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-10">
          Voted by the team through blind voting. Manufactured for Cooperstown 2026.
        </p>
      </div>
    </div>
  );
}
