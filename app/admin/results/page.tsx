'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Round, PinResult } from '@/lib/types';

export default function ResultsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | ''>('');
  const [results, setResults] = useState<PinResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/rounds').then(r => r.json()).then((data: Round[]) => {
      setRounds(data);
      const active = data.find(r => r.status === 'active');
      if (active) setSelectedRound(active.id);
    });
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const url = selectedRound ? `/api/admin/results?round_id=${selectedRound}` : '/api/admin/results';
    const res = await fetch(url);
    if (res.ok) setResults(await res.json());
    setLoading(false);
  }, [selectedRound]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  async function toggleWinner(pin: PinResult) {
    const res = await fetch(`/api/pins/${pin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_winner: !pin.is_winner }),
    });
    if (res.ok) {
      setResults(prev => prev.map(p => p.id === pin.id ? { ...p, is_winner: !p.is_winner } : p));
    }
  }

  const totalPlayers = results.length > 0 ? Math.max(...results.map(p => p.total_votes)) : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <h1 className="font-bold text-3xl text-sp-white" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>RESULTS</h1>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <select
          value={selectedRound}
          onChange={e => setSelectedRound(e.target.value ? parseInt(e.target.value) : '')}
          className="bg-charcoal border border-gray-700 text-sp-white px-4 py-2 rounded-lg focus:outline-none focus:border-crimson"
        >
          <option value="">Active round</option>
          {rounds.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
          ))}
        </select>
        {totalPlayers > 0 && (
          <span className="text-gray-400 text-base">Max {totalPlayers} votes per pin</span>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-12">Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No pins or votes yet for this round.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((pin, idx) => {
            const scorePercent = pin.total_votes > 0 ? ((pin.cash_count / pin.total_votes) * 100).toFixed(0) : '0';
            return (
              <div
                key={pin.id}
                className={`flex gap-4 bg-charcoal rounded-xl p-4 border transition-colors ${pin.is_winner ? 'border-fire/60' : 'border-gray-800'}`}
              >
                <div className="text-gray-400 font-bold text-lg w-6 text-center pt-0.5">
                  {idx + 1}
                </div>
                <div className="shrink-0 w-16 h-16 relative rounded-lg overflow-hidden bg-black/40">
                  <Image src={pin.image_url} alt="Pin" fill className="object-contain" sizes="64px" />
                </div>
                <div className="flex-1 min-w-0">
                  {(pin as PinResult & { creator_name?: string }).creator_name && (
                    <p className="text-fire text-sm font-bold mb-0.5">by {(pin as PinResult & { creator_name?: string }).creator_name}</p>
                  )}
                  <p className="text-gray-400 text-sm leading-relaxed truncate">{pin.concept_text}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {/* Vote bar */}
                    <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-crimson rounded-full transition-all"
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                    <span className="text-sp-white text-sm font-bold shrink-0">{scorePercent}%</span>
                    <span className="text-gray-400 text-sm shrink-0">{pin.cash_count}C / {pin.trash_count}T</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => toggleWinner(pin)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${pin.is_winner ? 'bg-fire/20 border-fire/60 text-fire' : 'bg-transparent border-gray-700 text-gray-500 hover:border-crimson/50 hover:text-crimson'}`}
                  >
                    {pin.is_winner ? 'WINNER' : 'Pick'}
                  </button>
                  <select
                    value={(pin as PinResult & { award_category?: string }).award_category ?? ''}
                    onChange={async (e) => {
                      const cat = e.target.value || null;
                      await fetch(`/api/pins/${pin.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ award_category: cat }),
                      });
                      setResults(prev => prev.map(p => p.id === pin.id ? { ...p, award_category: cat } as PinResult : p));
                    }}
                    className="text-xs bg-black/40 border border-gray-700 text-gray-400 rounded-lg px-2 py-1"
                  >
                    <option value="">Category...</option>
                    <option value="best_trader">Best Trader</option>
                    <option value="most_creative">Most Creative</option>
                    <option value="cooperstown_spirit">Cooperstown Spirit</option>
                    <option value="coaches_pick">Coach Pick</option>
                    <option value="secret_drop">Hurricanes Drop</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
