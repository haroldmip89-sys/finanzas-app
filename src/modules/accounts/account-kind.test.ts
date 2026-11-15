import { describe, expect, it } from "vitest";

import { isCreditAccount, isLiquidAccount } from "./account-kind";

describe("account kind", () => {
  it("treats cash, bank and wallet as liquid", () => {
    for (const type of ["cash", "bank", "wallet"] as const) {
      expect(isLiquidAccount(type)).toBe(true);
      expect(isCreditAccount(type)).toBe(false);
    }
  });

  it("treats a card as credit and not liquid", () => {
    expect(isCreditAccount("card")).toBe(true);
    expect(isLiquidAccount("card")).toBe(false);
  });
});
