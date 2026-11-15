import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("next.config", () => {
  it("sends the baseline security headers on every route", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");

    const keys = rules[0].headers.map((h) => h.key);
    expect(keys).toEqual([
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Permissions-Policy",
      "Strict-Transport-Security",
    ]);
    const get = (key: string) => rules[0].headers.find((h) => h.key === key)?.value;
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("X-Frame-Options")).toBe("DENY");
  });

  it("hides the X-Powered-By header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
