import { describe, expect, it } from "vitest";

import { availableChangeText, weekComparisonText } from "./weekly-text";

describe("weekComparisonText", () => {
  it("covers every case in neutral words", () => {
    expect(weekComparisonText(0, 0)).toMatch(/Aún no registras gastos/);
    expect(weekComparisonText(500, 500)).toMatch(/Igual/);
    expect(weekComparisonText(1500, 500)).toMatch(/S\/\s10\.00 más/);
    expect(weekComparisonText(500, 1500)).toMatch(/S\/\s10\.00 menos/);
  });
});

describe("availableChangeText", () => {
  it("says up, down or the same", () => {
    expect(availableChangeText(1000, 1000)).toMatch(/sigue igual/);
    expect(availableChangeText(1000, 3000)).toMatch(/subió S\/\s20\.00/);
    expect(availableChangeText(3000, 1000)).toMatch(/bajó S\/\s20\.00/);
  });
});
