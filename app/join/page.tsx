'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong');
        setLoading(false);
        return;
      }

      router.push('/design');
    } catch {
      setError('Connection error. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      {/* Lightning decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute top-0 left-0 w-32 h-64 animate-lightning opacity-20" viewBox="0 0 60 120" fill="none">
          <polyline points="40,0 20,50 35,50 10,120" stroke="#FF5500" strokeWidth="3" strokeLinejoin="round"/>
        </svg>
        <svg className="absolute top-0 right-0 w-32 h-64 animate-lightning opacity-20" viewBox="0 0 60 120" fill="none" style={{ animationDelay: '1.5s' }}>
          <polyline points="20,0 40,50 25,50 50,120" stroke="#FF5500" strokeWidth="3" strokeLinejoin="round"/>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <span className="text-crimson text-5xl font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', textShadow: '2px 2px 0 #0D0000' }}>SP</span>
          <div className="text-center">
            <h1 className="font-anton text-5xl text-sp-white leading-none tracking-tight" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', textShadow: '2px 2px 0 #C41230, 4px 4px 8px rgba(0,0,0,0.8)' }}>
              SOUTH PARK
            </h1>
            <h1 className="font-anton text-5xl text-crimson leading-none tracking-tight" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', textShadow: '2px 2px 0 #8B0D22, 4px 4px 8px rgba(0,0,0,0.8)' }}>
              HURRICANES
            </h1>
            <p className="mt-3 text-fire text-base font-bold tracking-widest uppercase">
              Cooperstown 2026
            </p>
            <p className="mt-1 text-gray-400 text-base text-center">
              Design a pin &bull; Vote on everyone&apos;s &bull; Best ones get made
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="block text-sp-white text-base font-bold tracking-wider uppercase mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name..."
              autoFocus
              autoComplete="given-name"
              className="w-full bg-charcoal border-2 border-charcoal text-sp-white text-lg px-4 py-4 rounded-lg focus:outline-none focus:border-crimson transition-colors placeholder-gray-500"
            />
          </div>

          {error && (
            <p className="text-fire text-base text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-crimson text-sp-white font-bold text-2xl py-5 rounded-lg tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(196,18,48,0.5)' }}
          >
            {loading ? 'Getting Ready...' : "Let's Go"}
          </button>
        </form>

        <p className="text-gray-400 text-base text-center">
          Vote on pin designs. No scores shown until the end.
        </p>
      </div>
    </div>
  );
}
