import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("manifest", () => {
  it("is installable: standalone, starts at Inicio and has icons", () => {
    const m = manifest();
    expect(m.name).toContain("Yupi");
    expect(m.short_name).toBe("Yupi");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/dashboard");
    expect(m.icons?.map((i) => i.src)).toEqual(["/icon.png", "/apple-icon.png"]);
    expect(m.theme_color).toMatch(/^#/);
  });
});
