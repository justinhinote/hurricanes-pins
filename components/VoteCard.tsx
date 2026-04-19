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
  const [showReasons, setShowReasons] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [pendingPinId, setPendingPinId] = useState<number | null>(null);
  const reasonsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  // Track every pin we've shown the user this session so the server can never
  // re-surface one (defends against the race between fire-and-forget vote POST
  // and the next prefetch).
  const seenIds = useRef<Set<number>>(new Set(initialPin ? [initialPin.id] : []));

  function buildExcludeQuery(extra?: number | null): string {
    const ids = new Set(seenIds.current);
    if (extra != null) ids.add(extra);
    if (ids.size === 0) return '';
    return `?exclude=${[...ids].join(',')}`;
  }

  async function prefetchNext() {
    const res = await fetch(`/api/vote/next${buildExcludeQuery()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.done || !data.pin) {
        setNextPin(null);
      } else {
        seenIds.current.add(data.pin.id);
        setNextPin(data.pin);
      }
    }
  }

  useEffect(() => {
    if (currentPin) prefetchNext();
    document.body.classList.add('no-overscroll');
    return () => document.body.classList.remove('no-overscroll');
  }, [currentPin]);

  const advanceToNext = useCallback(async () => {
    setVoteCount(prev => prev + 1);
    if (nextPin) {
      setCurrentPin(nextPin);
      setNextPin(null);
    } else {
      const res = await fetch(`/api/vote/next${buildExcludeQuery()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.pin) {
          seenIds.current.add(data.pin.id);
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
  }, [nextPin]);

  const submitReasons = useCallback(async (reasons: string[]) => {
    if (reasonsTimerRef.current) {
      clearTimeout(reasonsTimerRef.current);
      reasonsTimerRef.current = null;
    }
    if (pendingPinId && reasons.length > 0) {
      fetch('/api/vote/reasons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: pendingPinId, reasons }),
      }).catch(() => {});
    }
    setShowReasons(false);
    setSelectedReasons([]);
    setPendingPinId(null);
    await advanceToNext();
  }, [pendingPinId, advanceToNext]);

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

    if (value === 'cash') {
      setPendingPinId(currentPin.id);
      setSelectedReasons([]);
      setShowReasons(true);
      // Auto-advance after 4 seconds
      reasonsTimerRef.current = setTimeout(() => {
        setShowReasons(false);
        setSelectedReasons([]);
        setPendingPinId(null);
        advanceToNext();
      }, 4000);
    } else {
      await advanceToNext();
    }
  }, [currentPin, voting, advanceToNext]);

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
        <h2 className="font-bold text-4xl text-sp-white mb-3" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
          ALL DONE!
        </h2>
        <p className="text-gray-400 text-xl max-w-xs">
          You voted on all {voteCount} pin{voteCount !== 1 ? 's' : ''}. Nice work, Hurricane!
        </p>
        <p className="mt-4 text-gray-400 text-base max-w-xs">
          Come back later to see if new designs have been added. Go design your own pin!
        </p>
        <p className="mt-8 text-fire text-sm font-bold tracking-widest uppercase">
          South Park Hurricanes &mdash; Cooperstown 2026
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
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-red-500">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
            <span className="font-bold uppercase tracking-wide">Swipe left = Trash</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-500">
            <span className="font-bold uppercase tracking-wide">Swipe right = Cash</span>
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
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

      {/* "Why Cash?" quick-tag overlay */}
      {showReasons && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
        >
          <div className="flex flex-col items-center gap-5 px-6 w-full max-w-sm">
            <h2
              className="text-3xl tracking-wider text-green-500"
              style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}
            >
              WHY CASH?
            </h2>
            <p className="text-gray-400 text-sm -mt-2">Tap one or more, or skip</p>

            <div className="grid grid-cols-2 gap-3 w-full">
              {([
                { key: 'trade_it', label: 'TRADE IT', desc: 'Other teams would want this', icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  </svg>
                )},
                { key: 'thats_us', label: "THAT'S US", desc: 'Feels like Hurricanes', icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                )},
                { key: 'clean_design', label: 'CLEAN DESIGN', desc: 'Looks like a real pin', icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                )},
                { key: 'never_seen_that', label: 'NEVER SEEN THAT', desc: 'Totally original', icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )},
              ] as const).map(({ key, label, desc, icon }) => {
                const isSelected = selectedReasons.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedReasons(prev =>
                        prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
                      );
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-4 transition-all"
                    style={{
                      background: '#1f1f1f',
                      border: isSelected ? '2px solid #16a34a' : '2px solid #374151',
                      color: isSelected ? '#22c55e' : '#9ca3af',
                    }}
                  >
                    <span style={{ color: isSelected ? '#22c55e' : '#6b7280' }}>{icon}</span>
                    <span
                      className="text-sm font-bold tracking-wide"
                      style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', color: isSelected ? '#22c55e' : '#d1d5db' }}
                    >
                      {label}
                    </span>
                    <span className="text-sm leading-snug" style={{ color: '#6b7280' }}>{desc}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => submitReasons(selectedReasons)}
              className="w-full rounded-xl py-3 text-white font-bold text-lg tracking-widest uppercase transition-all active:brightness-75"
              style={{
                fontFamily: 'var(--font-anton), Impact, sans-serif',
                background: selectedReasons.length > 0 ? '#16a34a' : '#374151',
              }}
            >
              {selectedReasons.length > 0 ? 'NEXT' : 'SKIP'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
