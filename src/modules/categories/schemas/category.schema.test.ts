import { describe, expect, it } from "vitest";

import {
  categoryCreateSchema,
  categoryIdSchema,
  categoryUpdateSchema,
} from "./category.schema";

describe("categoryCreateSchema", () => {
  it("accepts a valid category and trims the name", () => {
    const result = categoryCreateSchema.parse({
      name: "  Comida  ",
      kind: "expense",
      icon: "utensils",
    });

    expect(result.name).toBe("Comida");
  });

  it("rejects an empty or too long name", () => {
    expect(
      categoryCreateSchema.safeParse({ name: "   ", kind: "expense", icon: "tag" })
        .success,
    ).toBe(false);
    expect(
      categoryCreateSchema.safeParse({
        name: "x".repeat(41),
        kind: "expense",
        icon: "tag",
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid kind or icon", () => {
    expect(
      categoryCreateSchema.safeParse({ name: "A", kind: "other", icon: "tag" })
        .success,
    ).toBe(false);
    expect(
      categoryCreateSchema.safeParse({ name: "A", kind: "income", icon: "nope" })
        .success,
    ).toBe(false);
  });
});

describe("categoryUpdateSchema", () => {
  it("does not carry the kind", () => {
    const result = categoryUpdateSchema.parse({
      name: "A",
      icon: "tag",
      kind: "income",
    });

    expect(result).toEqual({ name: "A", icon: "tag" });
  });
});

describe("categoryIdSchema", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(
      categoryIdSchema.safeParse("3f1c2b4a-1b2c-4d5e-8f90-1234567890ab").success,
    ).toBe(true);
    expect(categoryIdSchema.safeParse("123").success).toBe(false);
  });
});
