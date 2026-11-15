import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLastAccount } from "./use-last-account";

const KEY = "finanzas:last-account";

describe("useLastAccount", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("is empty when nothing was saved", () => {
    const { result } = renderHook(() => useLastAccount());

    expect(result.current.lastAccountId).toBe("");
  });

  it("reads the saved account", () => {
    window.localStorage.setItem(KEY, "acc-1");

    const { result } = renderHook(() => useLastAccount());

    expect(result.current.lastAccountId).toBe("acc-1");
  });

  it("saves the account for the next time", () => {
    const { result } = renderHook(() => useLastAccount());

    result.current.saveLastAccount("acc-2");

    expect(window.localStorage.getItem(KEY)).toBe("acc-2");
    expect(renderHook(() => useLastAccount()).result.current.lastAccountId).toBe("acc-2");
  });

  it("does not fail when reading from storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { result } = renderHook(() => useLastAccount());

    expect(result.current.lastAccountId).toBe("");
  });

  it("does not fail when writing to storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useLastAccount());

    expect(() => result.current.saveLastAccount("acc-3")).not.toThrow();
  });
});
