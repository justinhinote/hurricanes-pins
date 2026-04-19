'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PlayerNav from '@/components/PlayerNav';

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
  { name: 'Hurricane Baseball', prompt: 'A baseball at the eye of a hurricane storm with red-and-black lightning, custom cyclone-shaped pin outline', color: '#FF5500' },
  { name: 'Storm Flag', prompt: 'Hurricane warning pennant flag shape with a dangling Cooperstown 2026 charm, team colors', color: '#C41230' },
  { name: 'Cooperstown Arrival', prompt: 'Dreams Park entrance arch under a storm sky with South Park Hurricanes wordmark, badge-style pin', color: '#4488FF' },
  { name: 'Radar Pin', prompt: 'Weather radar screen showing a glowing storm cell over a baseball diamond, circular pin with glow effect', color: '#22FF66' },
  { name: 'Spinner Pin', prompt: 'A spinning hurricane eye that could rotate as a moving spinner pin, the SP logo in the center', color: '#00BBFF' },
  { name: 'Fire & Lightning', prompt: 'A flaming baseball with lightning bolts and SP diamond, star-shaped pin with pointed edges', color: '#FF8800' },
  { name: 'Oversized Wild', prompt: 'A big oversized unusually shaped pin with a 3D hurricane tornado, dangling baseball charms', color: '#AA44FF' },
  { name: 'Series Set', prompt: 'A collectible pin in a series of 3, SP diamond shield with unique pattern background', color: '#FFD700' },
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
  const [customText, setCustomText] = useState('');
  const textareaRef = useAutoResize(description);
  const refineRef = useAutoResize(description);
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

    const body: Record<string, unknown> = { description: prompt };
    if (isEdit && draft) body.edit_of = draft.concept_text;
    if (photoData) body.photo = photoData;
    if (customText.trim()) body.custom_text = customText.trim();

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
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoData(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
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

            {/* Step 1: Pick a starting point */}
            <p className="text-sp-white text-lg font-bold mb-2">Step 1: Pick a Starting Point</p>
            <p className="text-gray-400 text-sm mb-3">Tap one to start. You can customize it after.</p>
            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {STYLE_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleStylePick(t)}
                  className="flex items-center gap-3 bg-charcoal border border-gray-800 rounded-xl p-3 hover:border-crimson/50 active:scale-95 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-all"
                    style={{ background: `${t.color}15`, border: `1.5px solid ${t.color}35` }}>
                    <div className="w-4 h-4 rounded-full" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}40` }}/>
                  </div>
                  <span className="text-sp-white text-sm font-bold leading-tight">{t.name}</span>
                </button>
              ))}
            </div>

            {/* Step 2: Describe or customize */}
            <p className="text-sp-white text-lg font-bold mb-2">Step 2: Describe Your Pin</p>
            <p className="text-gray-400 text-sm mb-3">Or just type your own idea from scratch. Keep it simple — the AI handles the details.</p>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 mb-4">
              <textarea
                ref={textareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Example: A baseball in the eye of a hurricane with lightning..."
                rows={2}
                className="w-full bg-charcoal border border-gray-700 text-sp-white text-base px-4 py-3 rounded-xl focus:outline-none focus:border-crimson placeholder-gray-500 resize-none overflow-hidden"
              />

              {/* Custom text field */}
              <div>
                <label className="text-gray-400 text-sm font-bold block mb-1">
                  Add custom text to pin <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  maxLength={30}
                  placeholder="Your name, number, nickname..."
                  className="w-full bg-charcoal border border-gray-700 text-fire text-base px-4 py-3 rounded-xl focus:outline-none focus:border-crimson placeholder-gray-500"
                />
                <p className="text-gray-500 text-xs mt-1">Shows on the pin banner. Team name + Cooperstown 2026 are already included.</p>
              </div>

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
                  {photoData ? 'Photo attached' : 'Upload a sketch'}
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
              <p className="text-gray-400 text-xs leading-relaxed">
                <span className="text-sp-white font-bold">Tips:</span> Bold shapes trade best. One special feature (spinner, dangler, glitter, glow) is better than five. The AI will add team colors and a pin look automatically. Text is added perfectly by code — no misspellings.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
