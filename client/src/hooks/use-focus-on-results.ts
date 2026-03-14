import { useEffect, useRef } from 'react';

import type { RefObject } from 'react';

/**
 * Moves focus to a target element when new results arrive.
 * Designed for accessibility — after a successful search, keyboard
 * and screen-reader users are brought directly to the results area.
 *
 * @param {boolean} shouldFocus - Whether the focus condition is met (e.g. results exist).
 * @returns {RefObject<HTMLDivElement | null>} A ref to attach to the focusable container element.
 */
export const useFocusOnResults = (
  shouldFocus: boolean,
): RefObject<HTMLDivElement | null> => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldFocus) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      ref.current?.focus({ preventScroll: true });
    }
  }, [shouldFocus]);

  return ref;
};
