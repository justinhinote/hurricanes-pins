'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Auto-expanding textarea hook. Resizes when the value changes AND when the
 * textarea attaches to the DOM, so a textarea that mounts already populated
 * still grows to fit. Hard cap keeps very long content from blowing the page.
 *
 * Returns:
 *   setRef — pass to <textarea ref={...}>
 *   ref    — imperative ref for things like .focus()
 */
export function useAutoResize(value: string, maxHeight = 600) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fit = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [maxHeight]);
  const setRef = useCallback((node: HTMLTextAreaElement | null) => {
    ref.current = node;
    if (node) fit(node);
  }, [fit]);
  useEffect(() => {
    if (ref.current) fit(ref.current);
  }, [value, fit]);
  return { setRef, ref };
}
