import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reducedMotion = vi.fn(() => false);

vi.mock("./use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => reducedMotion(),
}));

import { useImageCarousel } from "./use-image-carousel";

describe("useImageCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances every interval and loops back to the first slide", () => {
    const { result } = renderHook(() => useImageCarousel({ count: 3 }));
    expect(result.current.activeIndex).toBe(0);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.activeIndex).toBe(1);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.activeIndex).toBe(2);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.activeIndex).toBe(0);
  });

  it("does not advance while paused, and resumes after toggling", () => {
    const { result } = renderHook(() => useImageCarousel({ count: 3 }));

    act(() => result.current.togglePlaying());
    expect(result.current.playing).toBe(false);
    act(() => vi.advanceTimersByTime(9000));
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.togglePlaying());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.activeIndex).toBe(1);
  });

  it("pauses while hovered", () => {
    const { result } = renderHook(() => useImageCarousel({ count: 3 }));

    act(() => result.current.containerProps.onMouseEnter());
    act(() => vi.advanceTimersByTime(9000));
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.containerProps.onMouseLeave());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.activeIndex).toBe(1);
  });

  it("pauses while focus is inside", () => {
    const { result } = renderHook(() => useImageCarousel({ count: 3 }));

    act(() => result.current.containerProps.onFocus());
    act(() => vi.advanceTimersByTime(9000));
    expect(result.current.activeIndex).toBe(0);

    act(() => result.current.containerProps.onBlur());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.activeIndex).toBe(1);
  });

  it("does not animate with fewer than 2 slides", () => {
    const { result } = renderHook(() => useImageCarousel({ count: 1 }));

    act(() => vi.advanceTimersByTime(9000));

    expect(result.current.animated).toBe(false);
    expect(result.current.activeIndex).toBe(0);
  });

  it("does not animate when the user prefers reduced motion", () => {
    reducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useImageCarousel({ count: 3 }));

    act(() => vi.advanceTimersByTime(9000));

    expect(result.current.animated).toBe(false);
    expect(result.current.activeIndex).toBe(0);
  });

  it("honors a custom interval", () => {
    const { result } = renderHook(() =>
      useImageCarousel({ count: 3, intervalMs: 1000 }),
    );

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.activeIndex).toBe(1);
  });
});
