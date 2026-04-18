import Link from 'next/link';
import Image from 'next/image';
import { getPool } from '@/lib/db';
import type { Round } from '@/lib/types';

export default async function AdminHomePage() {
  const pool = getPool();
  const roundResult = await pool.query<Round & { vote_count: string; player_count: string }>(
    `SELECT r.*,
            COUNT(DISTINCT v.id) AS vote_count,
            COUNT(DISTINCT v.player_id) AS player_count
     FROM rounds r
     LEFT JOIN pins p ON p.round_id = r.id
     LEFT JOIN votes v ON v.pin_id = p.id
     WHERE r.status = 'active'
     GROUP BY r.id
     LIMIT 1`
  );
  const activeRound = roundResult.rows[0];

  const nav = [
    { href: '/admin/rounds', label: 'Manage Rounds', desc: 'Create and activate voting rounds' },
    { href: '/admin/generate', label: 'Generate Pins', desc: 'AI-powered pin concept generation' },
    { href: '/admin/results', label: 'View Results', desc: 'Vote totals and winner selection' },
    { href: '/admin/analyze', label: 'Analyze Preferences', desc: 'Element scores and Claude suggestions' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Image src="/logo.svg" alt="SP" width={50} height={50} />
        <div>
          <h1 className="font-bold text-2xl text-sp-white" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>ADMIN PANEL</h1>
          <p className="text-gray-500 text-sm">South Park Hurricanes — Pin Contest</p>
        </div>
      </div>

      {activeRound ? (
        <div className="bg-charcoal border border-crimson/30 rounded-xl p-5 mb-8">
          <p className="text-fire text-xs font-bold uppercase tracking-widest mb-1">Active Round</p>
          <p className="text-sp-white text-xl font-bold">{activeRound.name}</p>
          <div className="flex gap-6 mt-3 text-sm text-gray-400">
            <span>{activeRound.vote_count} votes cast</span>
            <span>{activeRound.player_count} players voted</span>
          </div>
        </div>
      ) : (
        <div className="bg-charcoal border border-gray-800 rounded-xl p-5 mb-8">
          <p className="text-gray-500 text-sm">No active round. Go to Manage Rounds to set one up.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between bg-charcoal border border-charcoal hover:border-crimson/50 rounded-xl px-5 py-4 transition-colors group"
          >
            <div>
              <p className="text-sp-white font-bold group-hover:text-crimson transition-colors">{item.label}</p>
              <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
            </div>
            <svg className="w-5 h-5 text-gray-600 group-hover:text-crimson transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ))}
      </div>

      <div className="flex gap-3 mt-8">
        <Link href="/" className="text-gray-600 text-sm hover:text-gray-400 transition-colors">Player view</Link>
        <span className="text-gray-700">|</span>
        <Link href="/winners" className="text-gray-600 text-sm hover:text-gray-400 transition-colors">Winners page</Link>
        <span className="text-gray-700">|</span>
        <form action="/api/auth/logout" method="POST" className="inline">
          <button type="submit" className="text-gray-600 text-sm hover:text-fire transition-colors">Log out</button>
        </form>
      </div>
    </div>
  );
}
