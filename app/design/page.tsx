'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PlayerNav from '@/components/PlayerNav';
import { PIN_TEXT_LIMITS, PIN_TEXT_DEFAULTS, sanitizeLine, type PinText } from '@/lib/pin-text';

interface DraftPin {
  image_url: string;
  blob_key: string;
  concept_text: string;
  prompt_used: string;
  tags: string[];
  round_id: number;
}

interface SubmittedPin {
  id: number;
  image_url: string;
  concept_text: string;
}

const STYLE_TEMPLATES = [
  { name: 'Hurricanes Baseball', prompt: 'A baseball surrounded by Hurricanes wind and red-and-black lightning, custom cyclone-shaped pin for the South Park Hurricanes team', color: '#FF5500' },
  { name: 'Hurricanes Flag', prompt: 'Hurricanes pennant flag shape with a dangling Cooperstown 2026 charm, South Park Hurricanes team colors', color: '#C41230' },
  { name: 'Cooperstown Arrival', prompt: 'Dreams Park entrance arch with the South Park Hurricanes arriving, badge-style team pin', color: '#4488FF' },
  { name: 'Radar Pin', prompt: 'Weather radar screen showing the Hurricanes approaching over a baseball diamond, team circular pin with glow effect', color: '#22FF66' },
  { name: 'Spinner Pin', prompt: 'A spinning Hurricanes eye that rotates as a moving spinner pin, the SP Hurricanes logo in the center', color: '#00BBFF' },
  { name: 'Fire & Lightning', prompt: 'A flaming baseball with lightning bolts and SP Hurricanes diamond, star-shaped team pin', color: '#FF8800' },
  { name: 'Oversized Wild', prompt: 'A big oversized unusually shaped pin with a 3D Hurricanes tornado, dangling baseball charms, team pin', color: '#AA44FF' },
  { name: 'Series Set', prompt: 'A collectible team pin in a series of 3, SP Hurricanes diamond shield with unique pattern background', color: '#FFD700' },
];

const REFINE_CHIPS = [
  'Make the shape bolder',
  'Simplify the design',
  'Add one spinner element',
  'Make it a dangler pin',
  'Bolder color contrast',
  'Fewer words on the pin',
  'Make it look like real enamel',
  'Add glitter to one element',
  'Shield shape instead',
  'Add a Cooperstown charm',
];

// Auto-expanding textarea hook
function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 200)}px`;
    }
  }, [value]);
  return ref;
}

export default function DesignPage() {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPins, setSubmittedPins] = useState<SubmittedPin[]>([]);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [pinText, setPinText] = useState<PinText>({
    top: PIN_TEXT_DEFAULTS.top,
    middle: PIN_TEXT_DEFAULTS.middle,
    bottom: PIN_TEXT_DEFAULTS.bottom,
  });
  const textareaRef = useAutoResize(description);
  const refineRef = useAutoResize(description);

  function updateTextSlot(slot: keyof PinText, value: string) {
    setPinText(prev => ({ ...prev, [slot]: sanitizeLine(value, PIN_TEXT_LIMITS[slot]) }));
  }
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/design/my-pins')
      .then(r => r.json())
      .then(data => {
        if (data.pins) setSubmittedPins(data.pins);
      })
      .catch(() => {});
  }, []);

  const handleGenerate = useCallback(async (isEdit = false) => {
    const prompt = description.trim();
    if (!prompt && !photoData) return;
    setGenerating(true);
    setError('');
    setJustSubmitted(false);

    const body: Record<string, unknown> = { description: prompt, text: pinText };
    if (isEdit && draft) body.edit_of = draft.concept_text;
    if (photoData) body.photo = photoData;

    const res = await fetch('/api/design/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      setGenerating(false);
      return;
    }

    setDraft(data.draft);
    setPhotoData(null);
    setGenerating(false);
  }, [description, photoData, draft]);

  async function handleSubmit() {
    if (!draft) return;
    setSubmitting(true);
    const res = await fetch('/api/design/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const data = await res.json();
      setSubmittedPins(prev => [{ id: data.pin.id, image_url: draft.image_url, concept_text: draft.concept_text }, ...prev]);
      setDraft(null);
      setDescription('');
      setJustSubmitted(true);
    }
    setSubmitting(false);
  }

  function handleDiscard() {
    setDraft(null);
    setDescription('');
  }

  function handleRefine(chip: string) {
    setDescription(chip);
    refineRef.current?.focus();
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress client-side: resize to max 800px and convert to JPEG at 70% quality
    // This cuts a 5-8MB phone photo down to ~100-200KB
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxSize = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      setPhotoData(compressed.split(',')[1]);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function handleStylePick(template: typeof STYLE_TEMPLATES[0]) {
    setDescription(template.prompt);
    textareaRef.current?.focus();
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleGenerate(!!draft);
  }

  // Handle Ctrl+Enter / Cmd+Enter to submit
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate(!!draft);
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-16" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <PlayerNav />

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-crimson text-2xl font-bold shrink-0" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>SP</span>
          <div className="flex-1">
            <h1 className="text-sp-white text-2xl font-bold" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
              DESIGN YOUR PIN
            </h1>
            <p className="text-gray-400 text-sm">Best designs get made into real trading pins</p>
          </div>
          {submittedPins.length > 0 && (
            <span className="text-fire text-sm font-bold">{submittedPins.length} submitted</span>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto px-5">

        {/* === DRAFT PREVIEW MODE === */}
        {draft && !justSubmitted && (
          <div className="animate-fade-in">
            <p className="text-sp-white text-lg font-bold text-center mb-3">Your Design</p>

            {/* Pin preview */}
            <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-crimson/40 mb-4"
              style={{ boxShadow: '0 0 40px rgba(255,85,0,0.2)' }}>
              <Image src={draft.image_url} alt="Your pin design" fill className="object-contain" sizes="380px" priority />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-4 max-w-sm mx-auto">
              <button
                onClick={handleDiscard}
                className="flex-1 py-4 rounded-xl border-2 border-gray-700 text-gray-300 font-bold text-base uppercase tracking-widest active:scale-95 transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="py-4 rounded-xl bg-green-600 text-white font-bold text-lg uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(34,197,94,0.3)', flex: 2 }}
              >
                {submitting ? 'Submitting...' : 'Submit to Contest'}
              </button>
            </div>

            {/* Refine section */}
            <div className="bg-charcoal/60 border border-gray-800 rounded-xl p-4 max-w-sm mx-auto">
              <p className="text-fire text-sm font-bold uppercase tracking-wide mb-1">Refine This Design</p>
              <p className="text-gray-400 text-sm mb-3">Describe what to change</p>

              <div className="flex flex-wrap gap-2 mb-3">
                {REFINE_CHIPS.slice(0, 6).map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleRefine(chip)}
                    className="text-sm px-3 py-1.5 bg-black/40 border border-gray-700 text-gray-300 rounded-full hover:border-crimson/50 hover:text-sp-white active:scale-95 transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFormSubmit} className="flex gap-2 items-end">
                <textarea
                  ref={refineRef}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Change the colors, add text, make it bigger..."
                  disabled={generating}
                  rows={1}
                  className="flex-1 bg-black/40 border border-gray-700 text-sp-white text-base px-4 py-3 rounded-2xl focus:outline-none focus:border-crimson placeholder-gray-500 disabled:opacity-50 resize-none overflow-hidden"
                />
                <button
                  type="submit"
                  disabled={!description.trim() || generating}
                  className="shrink-0 w-12 h-12 bg-fire rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
                >
                  {generating ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* === JUST SUBMITTED === */}
        {justSubmitted && (
          <div className="bg-green-600/10 border border-green-600/40 rounded-xl p-5 text-center animate-fade-in mb-5">
            <p className="text-green-500 text-lg font-bold">Pin submitted to the contest!</p>
            <p className="text-gray-400 text-base mt-1">Now get your teammates to vote on it.</p>
            <div className="flex gap-4 justify-center mt-4">
              <Link href="/vote" className="text-base text-crimson font-bold hover:text-fire transition-colors">
                Go vote
              </Link>
              <button onClick={() => setJustSubmitted(false)} className="text-base text-gray-400 font-bold hover:text-sp-white transition-colors">
                Design another
              </button>
            </div>
          </div>
        )}

        {/* === GENERATING SPINNER === */}
        {generating && !draft && (
          <div className="animate-fade-in flex flex-col items-center py-10">
            <div className="w-64 h-64 bg-charcoal rounded-2xl border border-crimson/20 flex flex-col items-center justify-center gap-4"
              style={{ boxShadow: '0 0 30px rgba(255,85,0,0.1)' }}>
              <div className="w-14 h-14 border-3 border-fire border-t-transparent rounded-full animate-spin"/>
              <div className="text-center">
                <p className="text-sp-white text-lg font-bold">Creating your pin...</p>
                <p className="text-gray-400 text-sm mt-1">AI is drawing your design (~30s)</p>
              </div>
            </div>
          </div>
        )}

        {/* === DESIGN INPUT (no draft, not generating) === */}
        {!draft && !generating && !justSubmitted && (
          <div>
            {/* Submitted pins gallery */}
            {submittedPins.length > 0 && (
              <div className="mb-5">
                <p className="text-fire text-sm font-bold uppercase tracking-wide mb-2">Your Submissions ({submittedPins.length})</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {submittedPins.map(pin => (
                    <div key={pin.id} className="shrink-0 w-24">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-crimson/30"
                        style={{ boxShadow: '0 0 10px rgba(255,85,0,0.15)' }}>
                        <Image src={pin.image_url} alt={pin.concept_text} fill className="object-contain" sizes="96px" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick brief — kid-friendly */}
            <div className="bg-charcoal/60 border border-gray-800 rounded-xl p-4 mb-5">
              <p className="text-sp-white text-base leading-relaxed">Design a pin kids from other teams would trade for. Think Hurricanes + baseball. One bold shape, one cool feature. That&apos;s it.</p>
            </div>

            {/* Award categories as design prompts */}
            <p className="text-sp-white text-lg font-bold mb-2">Design for an Award</p>
            <p className="text-gray-400 text-sm mb-3">Tap a category to design for it, or scroll down to freestyle.</p>
            <div className="grid grid-cols-1 gap-2 mb-5">
              {[
                { name: 'Best Trader', prompt: 'Design the pin everyone at Cooperstown fights over. Bold shape, clean look, impossible to pass up in a trade.', color: '#FFD700', icon: 'M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3' },
                { name: 'Most Creative', prompt: 'Make something nobody has ever seen on a pin before. Surprise everyone. Go weird.', color: '#FF5500', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z' },
                { name: 'Cooperstown Spirit', prompt: 'Capture the Cooperstown Dreams Park experience. The trip, the fields, the feeling of being there.', color: '#4488FF', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4' },
                { name: "Coach's Pick", prompt: 'Design the pin the coaches would want on their lanyard. Clean, tough, represents the team.', color: '#C41230', icon: 'M9 2h6l3 7H6L9 2zM4 9h16v13H4z' },
                { name: 'Secret Drop', prompt: 'Design the mystery limited-edition surprise pin. Something rare, something special, something nobody expects.', color: '#22FF66', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8' },
              ].map(cat => (
                <button
                  key={cat.name}
                  onClick={() => { setDescription(cat.prompt); textareaRef.current?.focus(); }}
                  className="flex items-center gap-3 bg-charcoal border border-gray-800 rounded-xl p-3.5 hover:border-crimson/50 active:scale-[0.98] transition-all text-left group"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all" style={{ background: `${cat.color}15`, border: `1.5px solid ${cat.color}40` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={cat.icon}/></svg>
                  </div>
                  <div>
                    <p className="text-sp-white text-sm font-bold">{cat.name}</p>
                    <p className="text-gray-500 text-sm mt-0.5 leading-relaxed break-words">{cat.prompt}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Style templates */}
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Or pick a style</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {STYLE_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleStylePick(t)}
                  className="flex items-center gap-2.5 bg-charcoal border border-gray-800 rounded-xl p-3 hover:border-crimson/50 active:scale-95 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-all" style={{ background: `${t.color}15`, border: `1.5px solid ${t.color}35` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: t.color }}/>
                  </div>
                  <span className="text-sp-white text-sm font-bold leading-tight">{t.name}</span>
                </button>
              ))}
            </div>

            {/* Pin text fields */}
            <p className="text-sp-white text-lg font-bold mb-1">Pin Text</p>
            <p className="text-gray-400 text-sm mb-3">All optional. Leave blank for a text-free pin. We add the text after — the AI never has to spell it.</p>
            <div className="bg-charcoal/60 border border-gray-800 rounded-xl p-3 mb-5 flex flex-col gap-2.5">
              {(['top', 'middle', 'bottom'] as const).map(slot => {
                const labels = { top: 'Top', middle: 'Middle', bottom: 'Bottom' };
                const value = pinText[slot] ?? '';
                const max = PIN_TEXT_LIMITS[slot];
                return (
                  <div key={slot}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-gray-400 text-sm font-bold uppercase tracking-wider">{labels[slot]}</label>
                      <span className={`text-xs ${value.length >= max ? 'text-fire' : 'text-gray-500'}`}>{value.length}/{max}</span>
                    </div>
                    <input
                      type="text"
                      value={value}
                      maxLength={max}
                      onChange={e => updateTextSlot(slot, e.target.value)}
                      placeholder={`Optional · max ${max} chars`}
                      className="w-full bg-black/40 border border-gray-700 text-sp-white text-base px-3 py-2.5 rounded-lg focus:outline-none focus:border-crimson placeholder-gray-600 uppercase tracking-wide"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Describe your pin */}
            <p className="text-sp-white text-lg font-bold mb-2">Or Just Describe It</p>
            <p className="text-gray-400 text-sm mb-3">Type your own idea. Keep it simple — the AI handles the details.</p>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 mb-4">
              <textarea
                ref={textareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Example: A baseball in the eye of the Hurricanes with lightning..."
                rows={2}
                className="w-full bg-charcoal border border-gray-700 text-sp-white text-base px-4 py-3 rounded-xl focus:outline-none focus:border-crimson placeholder-gray-500 resize-none overflow-hidden"
              />

              {/* Photo upload */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 bg-charcoal border border-gray-700 text-gray-400 px-4 py-3 rounded-xl hover:border-crimson/50 active:scale-95 transition-all text-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  {photoData ? 'Photo attached' : 'Upload a photo or design file for context'}
                </button>
                {photoData && (
                  <button type="button" onClick={() => setPhotoData(null)} className="text-gray-500 text-sm hover:text-fire">Remove</button>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
              />

              {error && <p className="text-fire text-sm">{error}</p>}

              <button
                type="submit"
                disabled={!description.trim() && !photoData}
                className="w-full bg-crimson text-sp-white font-bold text-lg py-4 rounded-xl uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all"
                style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(196,18,48,0.4)' }}
              >
                Generate My Pin
              </button>
            </form>

            {/* Tips */}
            <div className="bg-charcoal/40 border border-gray-800 rounded-xl p-3 mb-4">
              <p className="text-gray-400 text-sm leading-relaxed">
                <span className="text-sp-white font-bold">Tips:</span> These are team pins — we order 100+ of the winners. Bold shapes trade best. One special feature (spinner, dangler, glitter, glow) beats five stacked together. Whatever you typed in the text fields above gets added after the AI finishes drawing.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
