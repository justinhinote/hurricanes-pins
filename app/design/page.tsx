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
    prompt: 'A fierce hurricane storm with lightning and the SP diamond logo, shield-shaped pin',
    color: '#FF5500',
  },
  {
    name: 'Classic Baseball',
    prompt: 'Classic crossed baseball bats behind a home plate with SP logo, vintage enamel style',
    color: '#C41230',
  },
  {
    name: 'Spinner Pin',
    prompt: 'A spinning hurricane eye that could rotate as a moving spinner pin, the SP logo in the center',
    color: '#00BBFF',
  },
  {
    name: 'Fire & Lightning',
    prompt: 'A flaming baseball with lightning bolts and SP diamond, star-shaped pin with pointed edges',
    color: '#FF8800',
  },
  {
    name: 'Oversized Wild',
    prompt: 'A big oversized unusually shaped pin with a 3D hurricane tornado, dangling baseball charms hanging off the bottom',
    color: '#AA44FF',
  },
  {
    name: 'Cooperstown',
    prompt: 'Cooperstown Dreams Park entrance with SP Hurricanes banner, pennant-shaped pin',
    color: '#4488FF',
  },
  {
    name: 'Light-Up Radar',
    prompt: 'A hurricane radar weather screen showing a storm, designed as if it could glow or light up, circular pin',
    color: '#22FF66',
  },
  {
    name: 'Series Set',
    prompt: 'A collectible pin in a series of 3, this one features the SP diamond shield with a unique pattern background, designed to be collected as a set',
    color: '#FFD700',
  },
];

const MODIFIERS = [
  'Make it a spinner pin',
  'Add dangling charms hanging off it',
  'Make it oversized and wild',
  'Make it glow like a light-up pin',
  'Add lightning bolts',
  'Make it metallic and shiny',
  'Shield shape instead',
  'Add "2026" text',
  'Star-shaped pin',
  'More aggressive looking',
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
            <div className="grid grid-cols-4 gap-2">
              {STYLE_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleStylePick(t)}
                  className="flex flex-col items-center gap-1.5 bg-charcoal border border-gray-800 rounded-xl p-2.5 hover:border-crimson/50 active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${t.color}20`, border: `2px solid ${t.color}40` }}>
                    <div className="w-4 h-4 rounded-full" style={{ background: t.color }} />
                  </div>
                  <span className="text-sp-white text-[10px] font-bold leading-tight text-center">{t.name}</span>
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
