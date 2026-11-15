import { describe, expect, it } from "vitest";

import {
  avoidedCreateSchema,
  avoidedFormSchema,
  toAvoidedCreateInput,
} from "./avoided-purchase.schema";

describe("avoided purchase schemas", () => {
  it("defaults the status to avoided and trims the note", () => {
    const parsed = avoidedCreateSchema.parse({
      amountCents: 1000,
      date: "2026-11-10",
      note: "  zapatillas ",
    });
    expect(parsed.status).toBe("avoided");
    expect(parsed.note).toBe("zapatillas");
  });

  it("rejects bad amounts, dates, reasons and categories", () => {
    const ok = { amountCents: 1000, date: "2026-11-10" };
    expect(avoidedCreateSchema.safeParse({ ...ok, amountCents: 0 }).success).toBe(false);
    expect(avoidedCreateSchema.safeParse({ ...ok, amountCents: 1.5 }).success).toBe(false);
    expect(avoidedCreateSchema.safeParse({ ...ok, date: "2026-02-31" }).success).toBe(false);
    expect(avoidedCreateSchema.safeParse({ ...ok, reason: "x" }).success).toBe(false);
    expect(avoidedCreateSchema.safeParse({ ...ok, categoryId: "no" }).success).toBe(false);
  });

  it("validates the form amount and converts to cents", () => {
    const values = { amount: "150.50", categoryId: "", reason: "can_wait", date: "2026-11-10", note: "" };
    expect(avoidedFormSchema.safeParse(values).success).toBe(true);
    expect(avoidedFormSchema.safeParse({ ...values, amount: "0" }).success).toBe(false);
    expect(toAvoidedCreateInput(values)).toMatchObject({
      amountCents: 15050,
      categoryId: null,
      reason: "can_wait",
      status: "avoided",
    });
  });
});
