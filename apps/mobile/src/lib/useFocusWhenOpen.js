import { useEffect, useRef } from 'react';

// Long enough for the sheet's slide-in to finish, so the keyboard and the sheet do not fight.
const DELAY_MS = 250;

/**
 * Ref for a text input that is focused, with the cursor at the end of its text, each time `open`
 * turns true. The input's own `autoFocus` only runs once and phones often ignore it inside a modal.
 * @param {boolean} open
 * @param {string} value current text, to place the cursor after it
 */
export function useFocusWhenOpen(open, value) {
  const ref = useRef(/** @type {any} */ (null));
  const text = useRef(value);
  text.current = value;

  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => {
      const input = ref.current;
      if (!input) return;
      input.focus?.();
      const end = text.current.length;
      // On the web the ref is the DOM element and React Native's setSelection does nothing there,
      // so move the caret on the element itself (and scroll a long note to its last line).
      if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(end, end);
        input.scrollTop = input.scrollHeight;
      } else {
        input.setSelection?.(end, end);
      }
    }, DELAY_MS);
    return () => clearTimeout(id);
  }, [open]);

  return ref;
}
