import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTransferFilters } from "./use-transfer-filters";

describe("useTransferFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to the current month in Lima, first page", () => {
    const { result } = renderHook(() => useTransferFilters());

    expect(result.current.query).toEqual({
      page: 1,
      pageSize: 20,
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(result.current.isDefault).toBe(true);
  });

  it("adds the account to the query and drops it when cleared", () => {
    const { result } = renderHook(() => useTransferFilters());

    act(() => result.current.setFilter("accountId", "acc-1"));
    expect(result.current.query).toMatchObject({ accountId: "acc-1" });
    expect(result.current.isDefault).toBe(false);

    act(() => result.current.setFilter("accountId", ""));
    expect(result.current.query).not.toHaveProperty("accountId");
  });

  it("omits the dates when they are cleared", () => {
    const { result } = renderHook(() => useTransferFilters());

    act(() => result.current.setFilter("from", ""));
    act(() => result.current.setFilter("to", ""));

    expect(result.current.query).not.toHaveProperty("from");
    expect(result.current.query).not.toHaveProperty("to");
  });

  it("goes back to page 1 when a filter changes", () => {
    const { result } = renderHook(() => useTransferFilters());
    act(() => result.current.setPage(4));

    act(() => result.current.setFilter("accountId", "acc-1"));

    expect(result.current.page).toBe(1);
  });

  it("reset restores the current month and the first page", () => {
    const { result } = renderHook(() => useTransferFilters());
    act(() => result.current.setFilter("accountId", "acc-1"));
    act(() => result.current.setFilter("from", "2026-01-01"));
    act(() => result.current.setPage(2));

    act(() => result.current.reset());

    expect(result.current.isDefault).toBe(true);
    expect(result.current.page).toBe(1);
    expect(result.current.query).toMatchObject({ from: "2026-11-01", to: "2026-11-30" });
  });
});
