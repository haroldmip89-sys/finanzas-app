import { describe, expect, it } from "vitest";

import {
  describeDebt,
  describeSpendingChange,
  getDebtCents,
  sumCardDebt,
  sumLiquidBalance,
} from "./card-summary";
import type { AccountType } from "./types/account.types";

const account = (type: AccountType, balanceCents: number, archived = false) => ({
  type,
  balanceCents,
  archivedAt: archived ? new Date() : null,
});

describe("getDebtCents", () => {
  it("turns a negative balance into a positive debt", () => {
    expect(getDebtCents(-35000)).toBe(35000);
  });

  it("is 0 for zero or positive balances", () => {
    expect(getDebtCents(0)).toBe(0);
    expect(getDebtCents(5000)).toBe(0);
  });
});

describe("describeDebt", () => {
  it("describes a debt, a credit in favor and no debt", () => {
    expect(describeDebt(-1200)).toEqual({ kind: "debt", cents: 1200 });
    expect(describeDebt(800)).toEqual({ kind: "credit", cents: 800 });
    expect(describeDebt(0)).toEqual({ kind: "none", cents: 0 });
  });
});

describe("sumLiquidBalance", () => {
  it("adds cash, bank and wallet balances and ignores cards", () => {
    const accounts = [
      account("bank", 100000),
      account("wallet", 2500),
      account("cash", 500),
      account("card", -40000),
    ];

    expect(sumLiquidBalance(accounts)).toBe(103000);
  });

  it("ignores archived accounts", () => {
    expect(sumLiquidBalance([account("bank", 100000), account("bank", 9999, true)])).toBe(100000);
  });

  it("is 0 with no accounts and keeps negative liquid balances", () => {
    expect(sumLiquidBalance([])).toBe(0);
    expect(sumLiquidBalance([account("bank", -300), account("cash", 100)])).toBe(-200);
  });
});

describe("sumCardDebt", () => {
  it("adds the debt of every card and ignores other accounts", () => {
    const accounts = [
      account("card", -40000),
      account("card", -10000),
      account("bank", -999),
      account("wallet", 5000),
    ];

    expect(sumCardDebt(accounts)).toBe(50000);
  });

  it("ignores archived cards", () => {
    expect(sumCardDebt([account("card", -40000), account("card", -9000, true)])).toBe(40000);
  });

  it("does not let credit in favor of one card offset the debt of another", () => {
    expect(sumCardDebt([account("card", -40000), account("card", 15000)])).toBe(40000);
  });

  it("is 0 when there are no cards", () => {
    expect(sumCardDebt([account("bank", 100)])).toBe(0);
  });
});

describe("describeSpendingChange", () => {
  it("is none when there were no purchases in either month", () => {
    expect(describeSpendingChange(0, 0)).toEqual({ kind: "none" });
  });

  it("is same when both months match and are not zero", () => {
    expect(describeSpendingChange(5000, 5000)).toEqual({ kind: "same" });
  });

  it("is more when this month is higher", () => {
    expect(describeSpendingChange(12000, 5000)).toEqual({ kind: "more", cents: 7000 });
    expect(describeSpendingChange(100, 0)).toEqual({ kind: "more", cents: 100 });
  });

  it("is less when this month is lower", () => {
    expect(describeSpendingChange(2000, 5000)).toEqual({ kind: "less", cents: 3000 });
    expect(describeSpendingChange(0, 800)).toEqual({ kind: "less", cents: 800 });
  });
});
