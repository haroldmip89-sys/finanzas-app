import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { QuickAddContext, useQuickAdd, useQuickAddState } from "./use-quick-add";

describe("useQuickAddState", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useQuickAddState());

    expect(result.current.kind).toBeNull();
  });

  it("opens each kind and closes", () => {
    const { result } = renderHook(() => useQuickAddState());

    act(() => result.current.open("expense"));
    expect(result.current.kind).toBe("expense");

    act(() => result.current.open("income"));
    expect(result.current.kind).toBe("income");

    act(() => result.current.open("transfer"));
    expect(result.current.kind).toBe("transfer");

    act(() => result.current.close());
    expect(result.current.kind).toBeNull();
  });

  it("opens the calibration dialog for a given account and forgets it on close", () => {
    const { result } = renderHook(() => useQuickAddState());

    act(() => result.current.open("calibrate", { accountId: "acc-1" }));
    expect(result.current.kind).toBe("calibrate");
    expect(result.current.accountId).toBe("acc-1");

    act(() => result.current.close());
    expect(result.current.kind).toBeNull();
    expect(result.current.accountId).toBeUndefined();
  });

  it("opens calibrate without an account when none is given", () => {
    const { result } = renderHook(() => useQuickAddState());

    act(() => result.current.open("calibrate"));

    expect(result.current.kind).toBe("calibrate");
    expect(result.current.accountId).toBeUndefined();
  });

  it("does not keep the previous account when another kind opens", () => {
    const { result } = renderHook(() => useQuickAddState());

    act(() => result.current.open("calibrate", { accountId: "acc-1" }));
    act(() => result.current.open("expense"));

    expect(result.current.kind).toBe("expense");
    expect(result.current.accountId).toBeUndefined();
  });

  it("keeps only one dialog open at a time", () => {
    const { result } = renderHook(() => useQuickAddState());

    act(() => result.current.open("expense"));
    act(() => result.current.open("transfer"));

    expect(result.current.kind).toBe("transfer");
  });
});

describe("useQuickAdd", () => {
  it("returns the API from the provider", () => {
    const api = { open: vi.fn(), close: vi.fn() };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QuickAddContext.Provider value={api}>{children}</QuickAddContext.Provider>
    );

    const { result } = renderHook(() => useQuickAdd(), { wrapper });
    result.current.open("expense");

    expect(api.open).toHaveBeenCalledWith("expense");
  });

  it("throws a clear error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useQuickAdd())).toThrow(/QuickAddProvider/);

    vi.restoreAllMocks();
  });
});
