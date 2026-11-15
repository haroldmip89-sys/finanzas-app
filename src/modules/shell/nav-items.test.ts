import { describe, expect, it } from "vitest";

import { isActive } from "./nav-items";

describe("isActive", () => {
  it("matches the exact route", () => {
    expect(isActive("/dashboard", "/dashboard")).toBe(true);
  });

  it("matches nested routes", () => {
    expect(isActive("/transactions/new", "/transactions")).toBe(true);
  });

  it("does not match by partial prefix", () => {
    expect(isActive("/dashboard", "/dash")).toBe(false);
    expect(isActive("/dashboards", "/dashboard")).toBe(false);
  });

  it("matches the root only exactly", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/dashboard", "/")).toBe(false);
  });
});
