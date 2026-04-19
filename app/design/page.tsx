'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PlayerNav from '@/components/PlayerNav';

interface GeneratedPin {
  id: number;
  image_url: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'pin';
  text: string;
  image_url?: string;
  pin_id?: number;
}

const STYLE_TEMPLATES = [
  {
    name: 'Hurricane Storm',
    icon: '/templates/storm.svg',
    prompt: 'A fierce hurricane storm with lightning and the SP diamond logo',
    color: '#FF5500',
  },
  {
    name: 'Classic Baseball',
    icon: '/templates/baseball.svg',
    prompt: 'Classic baseball bats and ball with the SP Hurricanes shield',
    color: '#C41230',
  },
  {
    name: 'Skull & Crossbats',
    icon: '/templates/skull.svg',
    prompt: 'A skull with baseball bats crossed behind it and the SP logo',
    color: '#888',
  },
  {
    name: 'Fire & Lightning',
    icon: '/templates/fire.svg',
    prompt: 'A flaming baseball with lightning bolts and SP diamond',
    color: '#FF8800',
  },
  {
    name: 'Cooperstown',
    icon: '/templates/cooperstown.svg',
    prompt: 'Cooperstown Dreams Park with Hurricanes banner and SP logo',
    color: '#4488FF',
  },
  {
    name: 'Championship',
    icon: '/templates/trophy.svg',
    prompt: 'A championship trophy surrounded by hurricane winds with SP shield',
    color: '#FFD700',
  },
];

const MODIFIERS = [
  'Make it look vintage',
  'Add more lightning',
  'Make the colors really bold',
  'Add "Cooperstown 2026" text',
  'Make it look metallic and shiny',
  'Make it more aggressive looking',
  'Add flames coming off the sides',
  'Put a big SP diamond in the center',
];

export default function DesignPage() {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', text: "What kind of pin do you want? Pick a style below or describe your own idea." }
  ]);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [error, setError] = useState('');
  const [lastPinId, setLastPinId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/design/my-pins')
      .then(r => r.json())
      .then(data => {
        if (typeof data.attempts_remaining === 'number') setAttemptsRemaining(data.attempts_remaining);
        if (data.pins?.length > 0) {
          setSubmittedCount(data.pins.length);
          // Show their previous pins in chat
          const prevMessages: ChatMessage[] = [
            { role: 'system', text: `Welcome back! You've made ${data.pins.length} pin${data.pins.length > 1 ? 's' : ''} so far. ${data.attempts_remaining > 0 ? 'Design another one or go vote!' : 'You used all your attempts. Go vote!'}` }
          ];
          data.pins.forEach((pin: { id: number; image_url: string; concept_text: string }) => {
            prevMessages.push({ role: 'pin', text: pin.concept_text, image_url: pin.image_url, pin_id: pin.id });
          });
          if (data.attempts_remaining > 0) {
            prevMessages.push({ role: 'system', text: 'Pick a style or describe a new idea below.' });
          }
          setMessages(prevMessages);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleGenerate(prompt: string) {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError('');
    setDescription('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: prompt }]);

    // Add generating message
    setMessages(prev => [...prev, { role: 'system', text: 'Designing your pin... this takes about 30 seconds.' }]);

    const res = await fetch('/api/design/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessages(prev => prev.slice(0, -1)); // Remove "generating" message
      setMessages(prev => [...prev, { role: 'system', text: data.error ?? 'Something went wrong. Try again.' }]);
      setGenerating(false);
      return;
    }

    setAttemptsRemaining(data.attempts_remaining);
    setLastPinId(data.pin.id);
    setSubmittedCount(prev => prev + 1);

    // Replace generating message with the pin
    setMessages(prev => [
      ...prev.slice(0, -1),
      { role: 'pin', text: prompt, image_url: data.pin.image_url, pin_id: data.pin.id },
      { role: 'system', text: data.attempts_remaining > 0 ? `Nice! Your pin is in the contest. You have ${data.attempts_remaining} attempt${data.attempts_remaining !== 1 ? 's' : ''} left. Try another style or go vote!` : 'Your pin is in the contest! You used all your attempts. Time to go vote on everyone\'s pins!' }
    ]);

    setGenerating(false);
  }

  function handleStylePick(template: typeof STYLE_TEMPLATES[0]) {
    setDescription(template.prompt);
    inputRef.current?.focus();
  }

  function handleModifier(mod: string) {
    setDescription(prev => prev ? `${prev}. ${mod}` : mod);
    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleGenerate(description);
  }

  const outOfAttempts = attemptsRemaining !== null && attemptsRemaining <= 0;
  const showStylePicker = messages.length <= 2 && !generating;
  const hasGeneratedPin = messages.some(m => m.role === 'pin');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <PlayerNav />

      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-sp-white text-xl font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
            DESIGN YOUR PIN
          </h1>
          <p className="text-gray-600 text-xs">Best designs get made into real trading pins</p>
        </div>
        {attemptsRemaining !== null && (
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${i < (5 - attemptsRemaining) ? 'bg-crimson' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ paddingBottom: outOfAttempts ? '80px' : '180px' }}>

        {/* Style picker - shown at start */}
        {showStylePicker && (
          <div className="mb-5">
            <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-3 px-1">Pick a style to start</p>
            <div className="grid grid-cols-3 gap-2.5">
              {STYLE_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleStylePick(t)}
                  className="flex flex-col items-center gap-2 bg-charcoal border border-gray-800 rounded-xl p-3 hover:border-crimson/50 active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${t.color}20`, border: `2px solid ${t.color}40` }}>
                    <span className="text-lg" style={{ color: t.color }}>
                      {t.name === 'Hurricane Storm' && (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>)}
                      {t.name === 'Classic Baseball' && (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 2.8A14 14 0 0 0 8 21.2M16 2.8a14 14 0 0 1 0 18.4"/></svg>)}
                      {t.name === 'Skull & Crossbats' && (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5.5 4 7v3h8v-3c2.5-1.5 4-4 4-7a8 8 0 0 0-8-8z"/></svg>)}
                      {t.name === 'Fire & Lightning' && (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>)}
                      {t.name === 'Cooperstown' && (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4"/></svg>)}
                      {t.name === 'Championship' && (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 22V8h4v14M8 2h8"/></svg>)}
                    </span>
                  </div>
                  <span className="text-sp-white text-xs font-bold leading-tight text-center">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div className="flex flex-col gap-3">
          {messages.map((msg, i) => {
            if (msg.role === 'system') {
              return (
                <div key={i} className="flex justify-center">
                  <p className="text-gray-500 text-sm text-center max-w-xs bg-charcoal/50 rounded-xl px-4 py-2.5">
                    {msg.text}
                  </p>
                </div>
              );
            }
            if (msg.role === 'user') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-crimson rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sp-white text-sm">{msg.text}</p>
                  </div>
                </div>
              );
            }
            if (msg.role === 'pin') {
              return (
                <div key={i} className="flex justify-start">
                  <div className="bg-charcoal rounded-2xl rounded-bl-sm border border-crimson/30 overflow-hidden max-w-[85%]"
                    style={{ boxShadow: '0 0 24px rgba(255,85,0,0.15)' }}>
                    <div className="relative w-full" style={{ aspectRatio: '1/1', maxWidth: '280px' }}>
                      <Image
                        src={msg.image_url!}
                        alt="Your pin design"
                        fill
                        className="object-contain"
                        sizes="280px"
                      />
                    </div>
                    <div className="px-3 py-2 border-t border-gray-800">
                      <p className="text-fire text-xs font-bold">In the contest!</p>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}

          {/* Generating spinner */}
          {generating && (
            <div className="flex justify-start">
              <div className="bg-charcoal rounded-2xl rounded-bl-sm px-5 py-4 border border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-fire border-t-transparent rounded-full animate-spin"/>
                  <span className="text-gray-400 text-sm">Drawing your pin...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input area */}
      {!outOfAttempts ? (
        <div className="fixed bottom-14 left-0 right-0 z-30 bg-black/95 backdrop-blur-sm border-t border-gray-800 px-4 py-3">
          {/* Modifier chips - show after they've generated at least one pin */}
          {hasGeneratedPin && !generating && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
              {MODIFIERS.map(mod => (
                <button
                  key={mod}
                  onClick={() => handleModifier(mod)}
                  className="shrink-0 text-xs px-3 py-1.5 bg-charcoal border border-gray-700 text-gray-400 rounded-full hover:border-crimson/50 hover:text-sp-white transition-colors active:scale-95 whitespace-nowrap"
                >
                  {mod}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your pin idea..."
              disabled={generating}
              className="flex-1 bg-charcoal border border-gray-700 text-sp-white text-sm px-4 py-3 rounded-full focus:outline-none focus:border-crimson transition-colors disabled:opacity-50 placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={!description.trim() || generating}
              className="shrink-0 w-12 h-12 bg-crimson rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
          {error && <p className="text-fire text-xs mt-1 px-2">{error}</p>}
        </div>
      ) : (
        <div className="fixed bottom-14 left-0 right-0 z-30 bg-black/95 backdrop-blur-sm border-t border-gray-800 px-4 py-3 text-center">
          <p className="text-gray-500 text-sm mb-2">All {submittedCount} of your pins are in the contest!</p>
          <Link
            href="/vote"
            className="inline-block bg-crimson text-sp-white font-bold px-8 py-3 rounded-full uppercase tracking-widest text-sm active:scale-95 transition-all"
          >
            Vote Now
          </Link>
        </div>
      )}
    </div>
  );
}
