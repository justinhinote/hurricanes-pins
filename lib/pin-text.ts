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
