import { describe, expect, it } from "vitest";

import {
  installmentCreateSchema,
  installmentFormSchema,
  toInstallmentCreateInput,
} from "./installment.schema";

const ID = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";
const ok = {
  accountId: ID,
  name: "Laptop",
  principalCents: 120000,
  installmentCount: 12,
  installmentCents: 10000,
  firstDueMonth: "2026-12",
};

describe("installment schemas", () => {
  it("accepts a valid plan and trims the name", () => {
    expect(installmentCreateSchema.parse({ ...ok, name: "  Laptop " }).name).toBe("Laptop");
  });

  it("rejects bad counts, amounts, months and names", () => {
    expect(installmentCreateSchema.safeParse({ ...ok, installmentCount: 1 }).success).toBe(false);
    expect(installmentCreateSchema.safeParse({ ...ok, installmentCount: 61 }).success).toBe(false);
    expect(installmentCreateSchema.safeParse({ ...ok, installmentCount: 2.5 }).success).toBe(false);
    expect(installmentCreateSchema.safeParse({ ...ok, installmentCents: 0 }).success).toBe(false);
    expect(installmentCreateSchema.safeParse({ ...ok, firstDueMonth: "2026-13" }).success).toBe(false);
    expect(installmentCreateSchema.safeParse({ ...ok, name: "   " }).success).toBe(false);
    expect(installmentCreateSchema.safeParse({ ...ok, accountId: "x" }).success).toBe(false);
  });

  it("converts the form to cents", () => {
    const form = {
      accountId: ID,
      name: "Laptop",
      principal: "1200.00",
      count: "12",
      installment: "110.50",
      firstDueMonth: "2026-12",
    };
    expect(installmentFormSchema.safeParse(form).success).toBe(true);
    expect(installmentFormSchema.safeParse({ ...form, count: "1" }).success).toBe(false);
    expect(installmentFormSchema.safeParse({ ...form, count: "1.5" }).success).toBe(false);
    expect(toInstallmentCreateInput(form)).toMatchObject({
      principalCents: 120000,
      installmentCents: 11050,
      installmentCount: 12,
    });
  });
});
