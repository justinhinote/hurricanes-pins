'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  async function prefetchNext() {
    const res = await fetch('/api/vote/next');
    if (res.ok) {
      const data = await res.json();
      if (data.done) setNextPin(null);
      else setNextPin(data.pin);
    }
  }

  useEffect(() => {
    if (currentPin) prefetchNext();
    document.body.classList.add('no-overscroll');
    return () => document.body.classList.remove('no-overscroll');
  }, [currentPin]);

  const castVote = useCallback(async (value: 'cash' | 'trash') => {
    if (!currentPin || voting) return;

    setVoting(true);
    setExitDir(value);

    fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin_id: currentPin.id, value }),
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 350));

    setExitDir(null);
    setDragX(0);
    setVoteCount(prev => prev + 1);

    if (nextPin) {
      setCurrentPin(nextPin);
      setNextPin(null);
    } else {
      // Check if there really are no more
      const res = await fetch('/api/vote/next');
      if (res.ok) {
        const data = await res.json();
        if (data.pin) {
          setCurrentPin(data.pin);
        } else {
          setCurrentPin(null);
          setDone(true);
        }
      } else {
        setCurrentPin(null);
        setDone(true);
      }
    }

    setVoting(false);
  }, [currentPin, nextPin, voting]);

  // Touch/mouse drag handlers
  function handlePointerDown(e: React.PointerEvent) {
    if (voting) return;
    startX.current = e.clientX;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || voting) return;
    const dx = e.clientX - startX.current;
    setDragX(dx);
  }

  function handlePointerUp() {
    if (!isDragging) return;
    setIsDragging(false);

    // Threshold: 80px swipe triggers a vote
    if (dragX > 80) {
      castVote('cash');
    } else if (dragX < -80) {
      castVote('trash');
    } else {
      setDragX(0);
    }
  }

  if (done || !currentPin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center pb-16" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
        <PlayerNav />
        <div className="mb-6">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="#22c55e" strokeWidth="4"/>
            <polyline points="20,42 34,56 60,28" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="font-bold text-3xl text-sp-white mb-3" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
          ALL DONE!
        </h2>
        <p className="text-gray-400 text-lg max-w-xs">
          You voted on all {voteCount} pin{voteCount !== 1 ? 's' : ''}. Nice work, Hurricane!
        </p>
        <p className="mt-4 text-gray-600 text-sm max-w-xs">
          Come back later to see if new designs have been added. Go design your own pin!
        </p>
        <p className="mt-8 text-fire text-sm font-bold tracking-widest uppercase">
          South Park Hurricanes &mdash; Cooperstown 2025
        </p>
      </div>
    );
  }

  // Card transform based on drag or exit animation
  const dragRotation = dragX * 0.08;
  const dragOpacity = Math.max(0.4, 1 - Math.abs(dragX) / 300);

  const cardStyle: React.CSSProperties = exitDir === 'cash'
    ? { transform: 'translateX(140%) rotate(20deg)', opacity: 0, transition: 'transform 0.35s ease-in, opacity 0.35s ease-in' }
    : exitDir === 'trash'
    ? { transform: 'translateX(-140%) rotate(-20deg)', opacity: 0, transition: 'transform 0.35s ease-in, opacity 0.35s ease-in' }
    : { transform: `translateX(${dragX}px) rotate(${dragRotation}deg)`, opacity: isDragging ? dragOpacity : 1, transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out' };

  // Drag indicator colors
  const showCashIndicator = dragX > 40;
  const showTrashIndicator = dragX < -40;

  return (
    <div className="min-h-screen flex flex-col select-none touch-none" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <PlayerNav />

      {/* Instructions banner */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-red-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
            <span className="font-bold uppercase tracking-wide">Swipe left = Trash</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-500">
            <span className="font-bold uppercase tracking-wide">Swipe right = Cash</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </div>

      {/* Pin image with drag */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden relative">
        {/* CASH overlay label */}
        <div
          className="absolute top-8 right-6 z-20 border-4 border-green-500 rounded-xl px-4 py-2 pointer-events-none"
          style={{ opacity: showCashIndicator ? Math.min((dragX - 40) / 60, 1) : 0, transform: 'rotate(15deg)', transition: isDragging ? 'none' : 'opacity 0.2s' }}
        >
          <span className="text-green-500 text-3xl font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>CASH</span>
        </div>

        {/* TRASH overlay label */}
        <div
          className="absolute top-8 left-6 z-20 border-4 border-red-500 rounded-xl px-4 py-2 pointer-events-none"
          style={{ opacity: showTrashIndicator ? Math.min((Math.abs(dragX) - 40) / 60, 1) : 0, transform: 'rotate(-15deg)', transition: isDragging ? 'none' : 'opacity 0.2s' }}
        >
          <span className="text-red-500 text-3xl font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>TRASH</span>
        </div>

        <div
          ref={cardRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ ...cardStyle, boxShadow: '0 0 40px rgba(255,85,0,0.25), 0 20px 60px rgba(0,0,0,0.7)', borderRadius: '16px', border: '2px solid rgba(196,18,48,0.4)', cursor: 'grab' }}
          className="relative w-full max-w-sm animate-fade-in"
        >
          <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
            <Image
              src={currentPin.image_url}
              alt="Pin design"
              fill
              className="object-contain rounded-2xl pointer-events-none"
              priority
              sizes="(max-width: 640px) 100vw, 384px"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* Vote buttons - always visible above the bottom nav */}
      <div className="flex w-full mb-14" style={{ minHeight: '72px' }}>
        <button
          onClick={() => castVote('trash')}
          disabled={voting}
          className="flex-1 flex items-center justify-center gap-2.5 text-white font-bold text-xl tracking-widest uppercase disabled:opacity-50 active:brightness-75 transition-all"
          style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', background: '#dc2626', minHeight: '72px' }}
          aria-label="Trash this pin"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          TRASH
        </button>
        <button
          onClick={() => castVote('cash')}
          disabled={voting}
          className="flex-1 flex items-center justify-center gap-2.5 text-white font-bold text-xl tracking-widest uppercase disabled:opacity-50 active:brightness-75 transition-all"
          style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', background: '#22c55e', minHeight: '72px' }}
          aria-label="Cash this pin"
        >
          CASH
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
