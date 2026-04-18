'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Wrong password');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <Image src="/logo.svg" alt="SP Hurricanes" width={70} height={70} />
        <h1 className="font-bold text-3xl text-sp-white text-center" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
          ADMIN ACCESS
        </h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            className="w-full bg-charcoal border-2 border-charcoal text-sp-white text-lg px-4 py-4 rounded-lg focus:outline-none focus:border-crimson transition-colors"
          />
          {error && <p className="text-fire text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={!password || loading}
            className="w-full bg-crimson text-sp-white font-bold text-xl py-4 rounded-lg uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
