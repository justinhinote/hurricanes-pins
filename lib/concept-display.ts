/**
 * Strip prompt-engineering artifacts from a stored concept_text before
 * showing it publicly. Defends against any future leakage of:
 *   - Markdown headings ("# Design Description for...")
 *   - Internal stitching like "User notes:" or "User said:"
 *   - Multi-paragraph LLM output that should be a one-line caption
 * Returns a single trimmed line, hard-capped at maxLen.
 */
export function displayConcept(raw: string | null | undefined, maxLen = 140): string {
  if (!raw) return '';
  let s = raw;

  // Drop everything from "User notes:" / "User said:" onward (internal stitch)
  s = s.split(/\b(?:User notes|User said|user notes|user said)\s*:/u)[0];

  // Strip markdown headings and bullet markers line by line
  s = s
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*#{1,6}\s*/, '').replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean)
    .join(' ');

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();

  // Old pins were generated when prompts said 2025. The team trip is 2026.
  s = s.replace(/\b2025\b/g, '2026');

  // Take just the first sentence-ish chunk
  const firstStop = s.search(/[.!?]\s/);
  if (firstStop > 20) s = s.slice(0, firstStop + 1);

  if (s.length > maxLen) s = s.slice(0, maxLen - 1).trimEnd() + '…';

  return s;
}
