import Image from 'next/image';
import { getPool } from '@/lib/db';
import type { Pin } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function WinnersPage() {
  const pool = getPool();
  const result = await pool.query<Pin>(
    'SELECT * FROM pins WHERE is_winner = true ORDER BY created_at ASC'
  );
  const winners = result.rows;

  return (
    <div className="min-h-screen px-6 py-12" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Image src="/logo.svg" alt="SP Hurricanes" width={70} height={70} className="mx-auto mb-4" />
          <h1 className="font-bold text-4xl text-sp-white leading-tight" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', textShadow: '2px 2px 0 #C41230' }}>
            WINNING PINS
          </h1>
          <p className="text-fire text-sm font-bold tracking-widest uppercase mt-2">
            Cooperstown 2026 &mdash; South Park Hurricanes
          </p>
        </div>

        {winners.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Winners coming soon. Stay tuned!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {winners.map(pin => (
              <div
                key={pin.id}
                className="bg-charcoal rounded-xl overflow-hidden border border-crimson/30"
                style={{ boxShadow: '0 0 20px rgba(255,85,0,0.15)' }}
              >
                <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
                  <Image
                    src={pin.image_url}
                    alt="Winning pin design"
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 50vw, 300px"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-10">
          These designs were selected by the team through blind voting.
        </p>
      </div>
    </div>
  );
}
