'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import PlayerNav from '@/components/PlayerNav';

interface Pin {
  id: number;
  image_url: string;
  concept_text: string;
}

interface VoteCardProps {
  initialPin: Pin | null;
  initialDone: boolean;
}

type ExitDirection = 'cash' | 'trash' | null;

export default function VoteCard({ initialPin, initialDone }: VoteCardProps) {
  const [currentPin, setCurrentPin] = useState<Pin | null>(initialPin);
  const [nextPin, setNextPin] = useState<Pin | null>(null);
  const [done, setDone] = useState(initialDone);
  const [voting, setVoting] = useState(false);
  const [exitDir, setExitDir] = useState<ExitDirection>(null);
  const [showHint, setShowHint] = useState(false);

  // Prefetch next pin
  async function prefetchNext() {
    const res = await fetch('/api/vote/next');
    if (res.ok) {
      const data = await res.json();
      if (data.done) setNextPin(null);
      else setNextPin(data.pin);
    }
  }

  useEffect(() => {
    // Show swipe hint once
    const seen = localStorage.getItem('hint_seen');
    if (!seen && currentPin) {
      setShowHint(true);
      setTimeout(() => {
        setShowHint(false);
        localStorage.setItem('hint_seen', '1');
      }, 2500);
    }

    if (currentPin) prefetchNext();
    // Prevent pull-to-refresh on mobile
    document.body.classList.add('no-overscroll');
    return () => document.body.classList.remove('no-overscroll');
  }, [currentPin]);

  const castVote = useCallback(async (value: 'cash' | 'trash') => {
    if (!currentPin || voting) return;

    setVoting(true);
    setExitDir(value);

    // Fire vote in parallel with animation
    fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin_id: currentPin.id, value }),
    }).catch(() => {}); // Best-effort; server enforces uniqueness

    // Wait for exit animation
    await new Promise(r => setTimeout(r, 350));

    setExitDir(null);

    if (nextPin) {
      setCurrentPin(nextPin);
      setNextPin(null);
      prefetchNext();
    } else {
      setCurrentPin(null);
      setDone(true);
    }

    setVoting(false);
  }, [currentPin, nextPin, voting]);

  if (done || !currentPin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
        <div className="text-6xl mb-6">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="#C41230" strokeWidth="4"/>
            <polyline points="20,42 34,56 60,28" stroke="#C41230" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="font-bold text-3xl text-sp-white mb-3" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
          ALL DONE!
        </h2>
        <p className="text-gray-400 text-lg max-w-xs">
          You&apos;ve voted on all the pins. Nice work, Hurricane. Check back later for results!
        </p>
        <p className="mt-8 text-fire text-sm font-bold tracking-widest uppercase">
          South Park Hurricanes &mdash; Cooperstown 2025
        </p>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = exitDir === 'cash'
    ? { transform: 'translateX(130%) rotate(15deg)', opacity: 0, transition: 'transform 0.35s ease-in, opacity 0.35s ease-in' }
    : exitDir === 'trash'
    ? { transform: 'translateX(-130%) rotate(-15deg)', opacity: 0, transition: 'transform 0.35s ease-in, opacity 0.35s ease-in' }
    : { transform: 'translateX(0) rotate(0deg)', opacity: 1, transition: 'none' };

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <PlayerNav />
      {/* Swipe hint overlay */}
      {showHint && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 rounded-2xl px-8 py-6 text-center border border-fire/30">
            <p className="text-sp-white text-lg font-bold">Tap or swipe to vote</p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-crimson font-bold">CASH &rarr;</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-400">&larr; TRASH</span>
            </div>
          </div>
        </div>
      )}

      {/* Pin image */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 overflow-hidden">
        <div
          style={{ ...cardStyle, boxShadow: '0 0 40px rgba(255,85,0,0.3), 0 20px 60px rgba(0,0,0,0.8)', borderRadius: '16px', border: '2px solid rgba(196,18,48,0.4)' }}
          className="relative w-full max-w-sm animate-fade-in"
        >
          <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
            <Image
              src={currentPin.image_url}
              alt="Pin design"
              fill
              className="object-contain rounded-2xl"
              priority
              sizes="(max-width: 640px) 100vw, 384px"
            />
          </div>
        </div>
      </div>

      {/* Vote buttons */}
      <div className="flex gap-0 w-full" style={{ minHeight: '5rem' }}>
        <button
          onClick={() => castVote('trash')}
          disabled={voting}
          className="flex-1 flex items-center justify-center gap-2 bg-charcoal border-t-2 border-r border-crimson/40 text-sp-white font-bold text-2xl tracking-widest uppercase disabled:opacity-50 active:bg-black transition-colors"
          style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', minHeight: '80px' }}
          aria-label="Trash — not this one"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          TRASH
        </button>
        <button
          onClick={() => castVote('cash')}
          disabled={voting}
          className="flex-1 flex items-center justify-center gap-2 bg-crimson text-sp-white font-bold text-2xl tracking-widest uppercase disabled:opacity-50 active:bg-crimson-dark transition-colors border-t-2 border-crimson"
          style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', minHeight: '80px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
          aria-label="Cash — I want this one"
        >
          CASH
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
