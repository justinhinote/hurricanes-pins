'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Round, ConceptDraft } from '@/lib/types';

interface GeneratedConcept extends ConceptDraft {
  selected: boolean;
  status?: 'pending' | 'generating' | 'done' | 'error';
  image_url?: string;
  error?: string;
}

export default function GeneratePage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | ''>('');
  const [brief, setBrief] = useState('');
  const [count, setCount] = useState(6);
  const [concepts, setConcepts] = useState<GeneratedConcept[]>([]);
  const [generatingConcepts, setGeneratingConcepts] = useState(false);
  const [renderingImages, setRenderingImages] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/rounds').then(r => r.json()).then((data: Round[]) => {
      setRounds(data);
      const active = data.find(r => r.status === 'active');
      if (active) {
        setSelectedRound(active.id);
        if (active.brief) setBrief(active.brief);
      }
    });
  }, []);

  async function handleGenerateConcepts() {
    setError('');
    setGeneratingConcepts(true);
    setConcepts([]);
    setPublishDone(false);

    const res = await fetch('/api/generate/concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, count }),
    });

    if (!res.ok) {
      setError('Failed to generate concepts');
      setGeneratingConcepts(false);
      return;
    }

    const data = await res.json();
    setConcepts(data.concepts.map((c: ConceptDraft) => ({ ...c, selected: true, status: 'pending' })));
    setGeneratingConcepts(false);
  }

  async function handleRenderImages() {
    if (!selectedRound) { setError('Select a round first'); return; }
    const selected = concepts.filter(c => c.selected);
    if (selected.length === 0) { setError('Select at least one concept'); return; }

    setError('');
    setRenderingImages(true);
    setPublishDone(false);

    // Mark all selected as generating
    setConcepts(prev => prev.map(c => c.selected ? { ...c, status: 'generating' } : c));

    const res = await fetch('/api/generate/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: selectedRound, concepts: selected }),
    });

    if (!res.ok) {
      setError('Image generation failed');
      setRenderingImages(false);
      return;
    }

    const data = await res.json();
    let resultIndex = 0;
    setConcepts(prev => prev.map(c => {
      if (!c.selected) return c;
      const result = data.results[resultIndex++];
      return {
        ...c,
        status: result.success ? 'done' : 'error',
        image_url: result.image_url,
        error: result.error,
      };
    }));

    setRenderingImages(false);
    setPublishDone(true);
  }

  const selectedCount = concepts.filter(c => c.selected).length;
  const doneCount = concepts.filter(c => c.status === 'done').length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <h1 className="font-bold text-2xl text-sp-white" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>GENERATE PINS</h1>
      </div>

      {/* Config panel */}
      <div className="bg-charcoal border border-gray-800 rounded-xl p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1.5 block">Round</label>
          <select
            value={selectedRound}
            onChange={e => setSelectedRound(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full bg-black/40 border border-gray-700 text-sp-white px-4 py-3 rounded-lg focus:outline-none focus:border-crimson"
          >
            <option value="">Select a round...</option>
            {rounds.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1.5 block">Design Brief</label>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={4}
            placeholder="Describe what you want. Team colors (crimson + black), motifs (hurricane, SP logo), style (vintage enamel, bold modern), etc."
            className="w-full bg-black/40 border border-gray-700 text-sp-white px-4 py-3 rounded-lg focus:outline-none focus:border-crimson transition-colors resize-none"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1.5 block">Number of Concepts</label>
          <input
            type="number"
            min={1}
            max={12}
            value={count}
            onChange={e => setCount(parseInt(e.target.value) || 6)}
            className="w-full bg-black/40 border border-gray-700 text-sp-white px-4 py-3 rounded-lg focus:outline-none focus:border-crimson transition-colors"
          />
        </div>
        <button
          onClick={handleGenerateConcepts}
          disabled={!brief.trim() || generatingConcepts || renderingImages}
          className="bg-crimson text-sp-white font-bold py-3 rounded-lg uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
        >
          {generatingConcepts ? 'Generating Concepts...' : 'Generate Concepts'}
        </button>
      </div>

      {error && <p className="text-fire text-sm mb-4">{error}</p>}

      {/* Concepts list */}
      {concepts.length > 0 && (
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sp-white font-bold">Concepts ({selectedCount} selected)</h2>
            <button
              onClick={handleRenderImages}
              disabled={selectedCount === 0 || !selectedRound || renderingImages || generatingConcepts}
              className="bg-fire text-black font-bold px-5 py-2 rounded-lg uppercase tracking-widest text-sm disabled:opacity-50 transition-all active:scale-95"
            >
              {renderingImages
                ? `Rendering... (${doneCount}/${selectedCount})`
                : `Render ${selectedCount} Image${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
          <p className="text-gray-500 text-xs -mt-2">Note: DALL-E generates 1 image per 12 seconds. {selectedCount} images will take ~{selectedCount * 12}s.</p>

          {concepts.map((concept, idx) => (
            <div
              key={idx}
              className={`bg-charcoal rounded-xl border transition-colors ${concept.selected ? 'border-crimson/50' : 'border-gray-800 opacity-50'}`}
            >
              <div className="flex gap-4 p-4">
                <div className="flex items-start pt-1">
                  <input
                    type="checkbox"
                    checked={concept.selected}
                    onChange={() => setConcepts(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c))}
                    className="w-5 h-5 accent-crimson cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sp-white text-sm leading-relaxed">{concept.concept}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...concept.tags.color_palette, ...concept.tags.style].slice(0, 5).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-black/40 text-gray-400 rounded border border-gray-700">{tag}</span>
                    ))}
                  </div>
                </div>
                {concept.status === 'generating' && (
                  <div className="shrink-0 w-16 h-16 bg-black/40 rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-fire border-t-transparent rounded-full animate-spin"/>
                  </div>
                )}
                {concept.status === 'done' && concept.image_url && (
                  <div className="shrink-0 w-16 h-16 relative rounded-lg overflow-hidden">
                    <Image src={concept.image_url} alt="Generated pin" fill className="object-contain" sizes="64px" />
                  </div>
                )}
                {concept.status === 'error' && (
                  <div className="shrink-0 w-16 h-16 bg-black/40 rounded-lg flex items-center justify-center">
                    <span className="text-fire text-xs">Error</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {publishDone && doneCount > 0 && (
        <div className="bg-fire/10 border border-fire/40 rounded-xl p-4 text-center">
          <p className="text-fire font-bold">{doneCount} pin{doneCount !== 1 ? 's' : ''} published to the active round!</p>
          <div className="flex gap-3 justify-center mt-3">
            <Link href="/admin/results" className="text-sm text-gray-400 hover:text-sp-white transition-colors">View Results</Link>
            <Link href="/admin" className="text-sm text-gray-400 hover:text-sp-white transition-colors">Back to Admin</Link>
          </div>
        </div>
      )}
    </div>
  );
}
