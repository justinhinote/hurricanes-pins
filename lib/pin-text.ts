export interface PinText {
  top?: string;
  middle?: string;
  bottom?: string;
}

export const PIN_TEXT_LIMITS = {
  top: 18,
  middle: 14,
  bottom: 18,
} as const;

export const PIN_TEXT_DEFAULTS: Required<PinText> = {
  top: 'HURRICANES',
  middle: '12U SPYA',
  bottom: 'COOPERSTOWN 2026',
};

const ALLOWED_CHARS = /[^A-Z0-9 &\-.'/·:,!?]/g;

export function sanitizeLine(input: string | undefined | null, max: number): string {
  if (!input) return '';
  const upper = input.toUpperCase();
  const stripped = upper.replace(ALLOWED_CHARS, '');
  const collapsed = stripped.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, max);
}

export function sanitizePinText(input: PinText | undefined | null): PinText {
  return {
    top: sanitizeLine(input?.top, PIN_TEXT_LIMITS.top),
    middle: sanitizeLine(input?.middle, PIN_TEXT_LIMITS.middle),
    bottom: sanitizeLine(input?.bottom, PIN_TEXT_LIMITS.bottom),
  };
}

export function hasAnyText(text: PinText): boolean {
  return !!(text.top || text.middle || text.bottom);
}

/**
 * Build a prompt fragment that tells the image model exactly what text to
 * render on the pin and where. The user typed these strings — copy them
 * letter-for-letter, no spelling drift.
 */
export function formatTextInstructions(text: PinText): string {
  if (!hasAnyText(text)) {
    return 'NO TEXT: do not render any words, letters, or numbers anywhere in the image.';
  }
  const lines: string[] = [];
  lines.push('TEXT ON THE PIN — render exactly as written, every letter must match:');
  if (text.top) lines.push(`- Top of pin (large, bold, prominent): "${text.top}"`);
  if (text.middle) lines.push(`- Middle of pin (smaller accent line): "${text.middle}"`);
  if (text.bottom) lines.push(`- Bottom of pin (large, bold, prominent): "${text.bottom}"`);
  lines.push('Text should feel integrated into the pin design (curved banner, ribbon, raised metal letters on enamel) — NOT pasted bars across the image. Use clean serif or block lettering legible at trading-pin size. Do NOT invent additional words.');
  return lines.join('\n');
}
