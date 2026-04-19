'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Round, ElementScore, SuggestedPrompt } from '@/lib/types';

interface AnalysisResult {
  element_scores: ElementScore[];
  analysis: {
    narrative: string;
    winning_elements: string[];
    losing_elements: string[];
    suggested_prompts: SuggestedPrompt[];
  };
}

export default function AnalyzePage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | ''>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/rounds').then(r => r.json()).then((data: Round[]) => {
      setRounds(data);
      const active = data.find(r => r.status === 'active');
      if (active) setSelectedRound(active.id);
    });
  }, []);

  async function handleAnalyze() {
    if (!selectedRound) { setError('Select a round first'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: selectedRound }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Analysis failed');
      setLoading(false);
      return;
    }

    setResult(await res.json());
    setLoading(false);
  }

  async function copyPrompt(prompt: string, idx: number) {
    await navigator.clipboard.writeText(prompt);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  const topElements = result?.element_scores.filter(e => e.score > 0).slice(0, 8) ?? [];
  const bottomElements = result?.element_scores.filter(e => e.score < 0).slice(-5).reverse() ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <h1 className="font-bold text-3xl text-sp-white" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>ANALYZE PREFERENCES</h1>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={selectedRound}
          onChange={e => setSelectedRound(e.target.value ? parseInt(e.target.value) : '')}
          className="flex-1 bg-charcoal border border-gray-700 text-sp-white px-4 py-2 rounded-lg focus:outline-none focus:border-crimson"
        >
          <option value="">Select a round...</option>
          {rounds.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
          ))}
        </select>
        <button
          onClick={handleAnalyze}
          disabled={!selectedRound || loading}
          className="bg-crimson text-sp-white font-bold px-6 py-2 rounded-lg uppercase tracking-widest text-sm disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {error && <p className="text-fire text-base mb-4">{error}</p>}

      {result && (
        <div className="flex flex-col gap-6">
          {/* Narrative */}
          <div className="bg-charcoal border border-gray-800 rounded-xl p-5">
            <h2 className="text-fire text-sm font-bold uppercase tracking-widest mb-3">What They Like</h2>
            <p className="text-sp-white leading-relaxed">{result.analysis.narrative}</p>
          </div>

          {/* Element scores */}
          <div className="bg-charcoal border border-gray-800 rounded-xl p-5">
            <h2 className="text-fire text-sm font-bold uppercase tracking-widest mb-4">Element Scores</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-gray-400 text-sm uppercase font-bold mb-2">Highest Rated</p>
                <div className="flex flex-col gap-1.5">
                  {topElements.map(e => (
                    <div key={e.tag} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div className="h-full bg-crimson rounded-full" style={{ width: `${(e.score + 1) * 50}%` }}/>
                      </div>
                      <span className="text-sp-white text-sm font-mono shrink-0 w-20 truncate">{e.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm uppercase font-bold mb-2">Lowest Rated</p>
                <div className="flex flex-col gap-1.5">
                  {bottomElements.map(e => (
                    <div key={e.tag} className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-600 rounded-full" style={{ width: `${(1 - Math.abs(e.score)) * 50}%` }}/>
                      </div>
                      <span className="text-gray-400 text-sm font-mono shrink-0 w-20 truncate">{e.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Claude's suggested prompts */}
          <div className="bg-charcoal border border-gray-800 rounded-xl p-5">
            <h2 className="text-fire text-sm font-bold uppercase tracking-widest mb-1">Suggested Prompts for Next Round</h2>
            <p className="text-gray-400 text-sm mb-4">Click Copy to paste into the Generate page brief</p>
            <div className="flex flex-col gap-3">
              {result.analysis.suggested_prompts.map((p, idx) => (
                <div key={idx} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-crimson text-sm font-bold uppercase tracking-wide mb-1">{p.theme}</p>
                      <p className="text-sp-white text-base leading-relaxed">{p.prompt_fragment}</p>
                      <p className="text-gray-400 text-sm mt-1">{p.rationale}</p>
                    </div>
                    <button
                      onClick={() => copyPrompt(p.prompt_fragment, idx)}
                      className="shrink-0 text-sm px-3 py-1.5 bg-black/40 border border-gray-700 text-gray-400 hover:text-sp-white hover:border-crimson/50 rounded-lg transition-colors"
                    >
                      {copied === idx ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/admin/generate"
            className="block text-center bg-crimson text-sp-white font-bold py-3 rounded-lg uppercase tracking-widest text-sm transition-all active:scale-95"
          >
            Generate Round 2 with These Insights
          </Link>
        </div>
      )}
    </div>
  );
}
