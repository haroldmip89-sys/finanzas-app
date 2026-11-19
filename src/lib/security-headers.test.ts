import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";
import { securityHeaders } from "./security-headers";

describe("security headers", () => {
  it("are applied to every route", async () => {
    const rules = await nextConfig.headers?.();

    expect(rules).toHaveLength(1);
    expect(rules?.[0].source).toBe("/:path*");
    expect(rules?.[0].headers).toEqual(securityHeaders);
  });

  it("include the basic protections", () => {
    const byKey = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]));

    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });

  it("do not set a CSP that could break Clerk", () => {
    expect(securityHeaders.some((h) => /content-security-policy/i.test(h.key))).toBe(false);
  });
});
