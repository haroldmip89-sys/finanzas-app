"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

type UseImageCarouselOptions = {
  count: number;
  intervalMs?: number;
};

/**
 * State and timing of an auto-advancing carousel. Pauses on hover, on focus
 * inside, and manually; does not animate with fewer than 2 slides or when the
 * user prefers reduced motion.
 */
export function useImageCarousel({
  count,
  intervalMs = 3000,
}: UseImageCarouselOptions) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const animated = count >= 2 && !reducedMotion;
  const running = animated && playing && !hovered && !focused;
  const activeIndex = animated ? index : 0;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [running, count, intervalMs]);

  return {
    activeIndex,
    playing,
    animated,
    togglePlaying: () => setPlaying((p) => !p),
    containerProps: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}
