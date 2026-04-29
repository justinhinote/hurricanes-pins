'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PlayerNav from '@/components/PlayerNav';
import { PIN_TEXT_LIMITS, PIN_TEXT_DEFAULTS, sanitizeLine, type PinText } from '@/lib/pin-text';
import { useAutoResize } from '@/lib/use-auto-resize';

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

type Mode = 'ai' | 'upload';

export default function DesignPage() {
  const [mode, setMode] = useState<Mode>('ai');
  const [showIdeas, setShowIdeas] = useState(false);
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPins, setSubmittedPins] = useState<SubmittedPin[]>([]);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadConcept, setUploadConcept] = useState('');
  const [uploading, setUploading] = useState(false);
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
  const uploadRef = useRef<HTMLInputElement>(null);

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
    refineRef.ref.current?.focus();
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

  function handleUploadSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cap at 1280px and encode as JPEG 0.92 to keep request bodies well under
    // Vercel's 4.5MB serverless body limit while still looking sharp on a pin.
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxSize = 1280;
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
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
      }
      const dataUri = canvas.toDataURL('image/jpeg', 0.92);
      setUploadData(dataUri);
      setUploadPreview(dataUri);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function clearUpload() {
    setUploadData(null);
    setUploadPreview(null);
    setUploadConcept('');
    if (uploadRef.current) uploadRef.current.value = '';
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadData || !uploadConcept.trim()) return;
    setUploading(true);
    setError('');
    setJustSubmitted(false);
    const res = await fetch('/api/design/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: uploadData, concept_text: uploadConcept.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Upload failed');
      setUploading(false);
      return;
    }
    setSubmittedPins(prev => [{ id: data.pin.id, image_url: data.pin.image_url, concept_text: data.pin.concept_text }, ...prev]);
    clearUpload();
    setJustSubmitted(true);
    setUploading(false);
  }

  function handleStylePick(template: typeof STYLE_TEMPLATES[0]) {
    setDescription(template.prompt);
    textareaRef.ref.current?.focus();
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
    <div className="min-h-screen flex flex-col pb-24" style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #0D0000 70%)' }}>
      <PlayerNav />

      {/* Header */}
      <div className="px-5 pt-6 pb-4 max-w-md mx-auto w-full">
        <h1 className="text-sp-white text-3xl font-bold tracking-wide" style={{ fontFamily: 'var(--font-anton), Impact, sans-serif' }}>
          DESIGN YOUR PIN
        </h1>
        <p className="text-gray-400 text-lg mt-1">Best ones get made for Cooperstown</p>
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
              <p className="text-fire text-base font-bold uppercase tracking-wide mb-1">Refine This Design</p>
              <p className="text-gray-400 text-base mb-3">Describe what to change</p>

              <div className="flex flex-wrap gap-2 mb-3">
                {REFINE_CHIPS.slice(0, 6).map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleRefine(chip)}
                    className="text-base px-3 py-1.5 bg-black/40 border border-gray-700 text-gray-300 rounded-full hover:border-crimson/50 hover:text-sp-white active:scale-95 transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFormSubmit} className="flex gap-2 items-end">
                <textarea
                  ref={refineRef.setRef}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Change the colors, add text, make it bigger..."
                  disabled={generating}
                  rows={2}
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
                <p className="text-gray-400 text-base mt-1">AI is drawing your design (~30s)</p>
              </div>
            </div>
          </div>
        )}

        {/* === DESIGN INPUT (no draft, not generating) === */}
        {!draft && !generating && !justSubmitted && (
          <div className="max-w-md mx-auto w-full">
            {/* Submitted pins gallery — compact */}
            {submittedPins.length > 0 && (
              <div className="mb-6">
                <p className="text-gray-400 text-lg mb-2">Your submissions</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {submittedPins.map(pin => (
                    <div key={pin.id} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-800">
                      <Image src={pin.image_url} alt={pin.concept_text} fill className="object-contain" sizes="80px" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-charcoal rounded-xl mb-6 border border-gray-800">
              <button
                onClick={() => setMode('ai')}
                className={`flex-1 py-3 rounded-lg text-lg font-bold transition-all ${mode === 'ai' ? 'bg-crimson text-sp-white' : 'text-gray-400'}`}
              >
                Generate with AI
              </button>
              <button
                onClick={() => setMode('upload')}
                className={`flex-1 py-3 rounded-lg text-lg font-bold transition-all ${mode === 'upload' ? 'bg-crimson text-sp-white' : 'text-gray-400'}`}
              >
                Upload my own
              </button>
            </div>

            {/* === AI MODE === */}
            {mode === 'ai' && (
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
                {/* Describe */}
                <div>
                  <label className="block text-sp-white text-xl font-bold mb-2">Describe your pin</label>
                  <textarea
                    ref={textareaRef.setRef}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="A baseball in the eye of a hurricane with lightning..."
                    rows={3}
                    className="w-full bg-charcoal border border-gray-700 text-sp-white text-lg px-4 py-3 rounded-xl focus:outline-none focus:border-crimson placeholder-gray-500 resize-none overflow-hidden"
                  />
                </div>

                {/* Pin text */}
                <div>
                  <label className="block text-sp-white text-xl font-bold mb-1">Pin text</label>
                  <p className="text-gray-400 text-base mb-2">Optional. The AI bakes it into the design.</p>
                  <div className="flex flex-col gap-2">
                    {(['top', 'middle', 'bottom'] as const).map(slot => {
                      const labels = { top: 'Top', middle: 'Middle', bottom: 'Bottom' };
                      const value = pinText[slot] ?? '';
                      const max = PIN_TEXT_LIMITS[slot];
                      return (
                        <input
                          key={slot}
                          type="text"
                          value={value}
                          maxLength={max}
                          onChange={e => updateTextSlot(slot, e.target.value)}
                          placeholder={labels[slot]}
                          className="w-full bg-charcoal border border-gray-700 text-sp-white text-lg px-4 py-3 rounded-xl focus:outline-none focus:border-crimson placeholder-gray-500 uppercase"
                          style={{ textTransform: 'uppercase' }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Optional photo */}
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-charcoal border border-gray-700 text-gray-300 px-4 py-3 rounded-xl text-lg active:scale-95 transition-all"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    {photoData ? 'Photo attached — tap to replace' : 'Add a reference photo'}
                  </button>
                  {photoData && (
                    <button type="button" onClick={() => setPhotoData(null)} className="block mt-2 mx-auto text-base text-gray-400">Remove photo</button>
                  )}
                </div>

                {error && <p className="text-fire text-lg text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={!description.trim() && !photoData}
                  className="w-full bg-crimson text-sp-white font-bold text-xl py-5 rounded-xl uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all"
                  style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(196,18,48,0.4)' }}
                >
                  Generate my pin
                </button>

                {/* Need ideas? — collapsible */}
                <button
                  type="button"
                  onClick={() => setShowIdeas(s => !s)}
                  className="text-gray-400 text-lg py-2 active:text-sp-white transition-colors flex items-center justify-center gap-2"
                >
                  {showIdeas ? 'Hide ideas' : 'Need ideas?'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showIdeas ? 'rotate(180deg)' : 'none' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {showIdeas && (
                  <div className="flex flex-col gap-2 animate-fade-in">
                    {STYLE_TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => { handleStylePick(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="flex items-center gap-3 bg-charcoal border border-gray-800 rounded-xl px-4 py-3 active:scale-[0.98] transition-all text-left"
                      >
                        <div className="w-4 h-4 rounded-full shrink-0" style={{ background: t.color }}/>
                        <span className="text-sp-white text-lg font-bold">{t.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            )}

            {/* === UPLOAD MODE === */}
            {mode === 'upload' && (
              <form onSubmit={handleUploadSubmit} className="flex flex-col gap-5">
                <input
                  ref={uploadRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadSelect}
                />

                {!uploadPreview && (
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    className="w-full bg-charcoal border-2 border-dashed border-gray-700 text-gray-300 px-4 py-12 rounded-xl active:scale-95 transition-all flex flex-col items-center gap-3"
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span className="text-xl font-bold">Choose an image</span>
                    <span className="text-base text-gray-500">PNG, JPG, or HEIC</span>
                  </button>
                )}

                {uploadPreview && (
                  <>
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-crimson/40 bg-white">
                      <Image src={uploadPreview} alt="Your design" fill className="object-contain" sizes="500px" unoptimized />
                    </div>
                    <button type="button" onClick={clearUpload} className="text-gray-400 text-lg active:text-fire self-center">
                      Choose a different image
                    </button>

                    <div>
                      <label className="block text-sp-white text-xl font-bold mb-2">What is it?</label>
                      <input
                        type="text"
                        value={uploadConcept}
                        onChange={e => setUploadConcept(e.target.value.slice(0, 140))}
                        placeholder="Hurricanes lightning baseball"
                        maxLength={140}
                        className="w-full bg-charcoal border border-gray-700 text-sp-white text-lg px-4 py-3 rounded-xl focus:outline-none focus:border-crimson placeholder-gray-500"
                      />
                    </div>

                    {error && <p className="text-fire text-lg text-center">{error}</p>}

                    <button
                      type="submit"
                      disabled={!uploadConcept.trim() || uploading}
                      className="w-full bg-green-600 text-white font-bold text-xl py-5 rounded-xl uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all"
                      style={{ fontFamily: 'var(--font-anton), Impact, sans-serif', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}
                    >
                      {uploading ? 'Submitting...' : 'Submit my design'}
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
