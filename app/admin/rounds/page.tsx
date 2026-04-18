'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import type { Round } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-fire border-fire/50 bg-fire/10',
  draft: 'text-gray-400 border-gray-700 bg-gray-800/30',
  archived: 'text-gray-600 border-gray-800 bg-gray-900/30',
};

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<number | null>(null);

  async function fetchRounds() {
    const res = await fetch('/api/rounds');
    if (res.ok) setRounds(await res.json());
  }

  useEffect(() => { fetchRounds(); }, []);

  async function createRound(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, brief }),
    });
    setName('');
    setBrief('');
    await fetchRounds();
    setLoading(false);
  }

  async function activateRound(id: number) {
    setActivating(id);
    await fetch(`/api/rounds/${id}/activate`, { method: 'POST' });
    await fetchRounds();
    setActivating(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <h1 className="font-bold text-2xl text-sp-white" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>MANAGE ROUNDS</h1>
      </div>

      {/* Create new round */}
      <div className="bg-charcoal border border-gray-800 rounded-xl p-5 mb-8">
        <h2 className="text-sp-white font-bold mb-4">Create New Round</h2>
        <form onSubmit={createRound} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Round name (e.g. Round 1)"
            className="bg-black/40 border border-gray-700 text-sp-white px-4 py-3 rounded-lg focus:outline-none focus:border-crimson transition-colors"
          />
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="Design brief (optional — used for AI generation)"
            rows={3}
            className="bg-black/40 border border-gray-700 text-sp-white px-4 py-3 rounded-lg focus:outline-none focus:border-crimson transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="bg-crimson text-sp-white font-bold py-3 rounded-lg uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? 'Creating...' : 'Create Round'}
          </button>
        </form>
      </div>

      {/* Rounds list */}
      <div className="flex flex-col gap-3">
        {rounds.map(round => (
          <div key={round.id} className="bg-charcoal border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${STATUS_COLORS[round.status]}`}>
                  {round.status}
                </span>
                <span className="text-sp-white font-bold truncate">{round.name}</span>
              </div>
              {round.brief && (
                <p className="text-gray-500 text-xs truncate">{round.brief}</p>
              )}
            </div>
            {round.status !== 'active' && (
              <button
                onClick={() => activateRound(round.id)}
                disabled={activating === round.id}
                className="shrink-0 text-sm px-4 py-2 bg-crimson/20 border border-crimson/40 text-crimson rounded-lg hover:bg-crimson/30 transition-colors disabled:opacity-50"
              >
                {activating === round.id ? '...' : 'Activate'}
              </button>
            )}
          </div>
        ))}
        {rounds.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No rounds yet.</p>
        )}
      </div>
    </div>
  );
}
