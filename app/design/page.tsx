'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PlayerNav from '@/components/PlayerNav';

interface GeneratedPin {
  id: number;
  image_url: string;
}

const SUGGESTIONS = [
  'Lightning bolt hurricane with the SP logo',
  'Vintage Cooperstown skyline with a baseball',
  'Fire and storm with our diamond shield',
  'Classic baseball with SP and crossed bats',
  'Hurricane eye with a baseball inside',
  'Retro 1950s style with team name banner',
];

export default function DesignPage() {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<GeneratedPin | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [submittedPins, setSubmittedPins] = useState<Array<{ id: number; image_url: string; concept_text: string }>>([]);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/design/my-pins')
      .then(r => r.json())
      .then(data => {
        if (data.pins) setSubmittedPins(data.pins);
        if (typeof data.attempts_remaining === 'number') setAttemptsRemaining(data.attempts_remaining);
      })
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    if (!description.trim() || generating) return;
    setGenerating(true);
    setError('');
    setGeneratedPin(null);
    setSubmitted(false);

    const res = await fetch('/api/design/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      setGenerating(false);
      return;
    }

    setGeneratedPin(data.pin);
    setAttemptsRemaining(data.attempts_remaining);
    setGenerating(false);
  }

  function handleSubmit() {
    if (!generatedPin) return;
    setSubmittedPins(prev => [{ id: generatedPin.id, image_url: generatedPin.image_url, concept_text: description }, ...prev]);
    setGeneratedPin(null);
    setDescription('');
    setSubmitted(true);
  }

  function handleTryAgain() {
    setGeneratedPin(null);
  }

  const outOfAttempts = attemptsRemaining !== null && attemptsRemaining <= 0;

  return (
    <div className="min-h-screen pb-28" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <PlayerNav />
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/vote" className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <h1 className="text-sp-white text-2xl font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
            DESIGN YOUR PIN
          </h1>
        </div>
        <p className="text-gray-500 text-sm ml-8">
          Describe your idea — AI will generate it. Best designs get made for real.
        </p>
        {attemptsRemaining !== null && (
          <div className="ml-8 mt-2 flex items-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${i < (5 - attemptsRemaining) ? 'bg-crimson' : 'bg-gray-700'}`}
              />
            ))}
            <span className="text-gray-500 text-xs ml-1">
              {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} left
            </span>
          </div>
        )}
      </div>

      <div className="px-5 flex flex-col gap-5">

        {/* Already submitted pins */}
        {submittedPins.length > 0 && (
          <div>
            <p className="text-fire text-xs font-bold uppercase tracking-widest mb-3">Your Submissions</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {submittedPins.map(pin => (
                <div key={pin.id} className="shrink-0 w-28">
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-crimson/40"
                    style={{ boxShadow: '0 0 12px rgba(255,85,0,0.2)' }}>
                    <Image src={pin.image_url} alt={pin.concept_text} fill className="object-contain" sizes="112px" />
                  </div>
                  <p className="text-gray-500 text-xs mt-1 leading-tight line-clamp-2">{pin.concept_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted confirmation */}
        {submitted && (
          <div className="bg-fire/10 border border-fire/40 rounded-xl p-4 text-center animate-fade-in">
            <p className="text-fire font-bold">Pin submitted to the contest!</p>
            <p className="text-gray-400 text-sm mt-1">Now get your teammates to vote on it.</p>
            <Link href="/vote" className="inline-block mt-3 text-sm text-crimson font-bold hover:text-fire transition-colors">
              Go vote on everyone's pins &rarr;
            </Link>
          </div>
        )}

        {/* Generated pin preview */}
        {generatedPin && !submitted && (
          <div className="animate-fade-in">
            <p className="text-sp-white font-bold mb-3 text-center">How does this look?</p>
            <div className="relative w-full max-w-xs mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-crimson/50"
              style={{ boxShadow: '0 0 40px rgba(255,85,0,0.25)' }}>
              <Image src={generatedPin.image_url} alt="Your pin design" fill className="object-contain" sizes="320px" priority />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleTryAgain}
                disabled={outOfAttempts}
                className="flex-1 py-4 rounded-xl border-2 border-gray-700 text-gray-300 font-bold uppercase tracking-widest text-sm disabled:opacity-40 active:scale-95 transition-all"
              >
                {outOfAttempts ? 'No attempts left' : 'Try Again'}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-4 rounded-xl bg-crimson text-sp-white font-bold uppercase tracking-widest text-sm active:scale-95 transition-all"
                style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(196,18,48,0.4)' }}
              >
                Submit It!
              </button>
            </div>
          </div>
        )}

        {/* Design form */}
        {!generatedPin && (
          <>
            {outOfAttempts ? (
              <div className="bg-charcoal border border-gray-800 rounded-xl p-5 text-center">
                <p className="text-gray-400">You&apos;ve used all your design attempts.</p>
                <p className="text-gray-500 text-sm mt-1">Your pins are in the contest. Time to vote!</p>
                <Link href="/vote" className="inline-block mt-4 bg-crimson text-sp-white font-bold px-6 py-3 rounded-xl uppercase tracking-widest text-sm">
                  Go Vote
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-2 block">
                    Describe your pin idea
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. A fierce hurricane with lightning bolts around the SP diamond, red and black, Cooperstown 2025 on the bottom..."
                    rows={4}
                    className="w-full bg-charcoal border-2 border-charcoal text-sp-white text-base px-4 py-4 rounded-xl focus:outline-none focus:border-crimson transition-colors resize-none placeholder-gray-700"
                  />
                </div>

                {/* Suggestion chips */}
                <div>
                  <p className="text-gray-600 text-xs mb-2">Need ideas? Tap one to start:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => { setDescription(s); textareaRef.current?.focus(); }}
                        className="text-xs px-3 py-1.5 bg-charcoal border border-gray-700 text-gray-400 rounded-full hover:border-crimson/50 hover:text-sp-white transition-colors active:scale-95"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-fire text-sm">{error}</p>}

                <button
                  onClick={handleGenerate}
                  disabled={!description.trim() || generating}
                  className="w-full bg-crimson text-sp-white font-bold text-xl py-5 rounded-xl uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all"
                  style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(196,18,48,0.4)' }}
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="w-5 h-5 border-2 border-sp-white border-t-transparent rounded-full animate-spin inline-block"/>
                      Generating... (~30s)
                    </span>
                  ) : 'Generate My Pin'}
                </button>

                <p className="text-gray-600 text-xs text-center">
                  AI will turn your idea into a pin design. You have {attemptsRemaining ?? '...'} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
