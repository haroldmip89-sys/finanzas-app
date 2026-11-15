import { describe, expect, it } from "vitest";

import { isActive, isItemActive, navItems, settingsItem } from "./nav-items";

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

describe("isItemActive", () => {
  const movements = navItems.find((i) => i.label === "Movimientos")!;

  it("is active on the item's own route", () => {
    expect(isItemActive("/transactions", movements)).toBe(true);
  });

  it("is active on its extra routes", () => {
    expect(isItemActive("/transfers", movements)).toBe(true);
    expect(isItemActive("/transfers/anything", movements)).toBe(true);
  });

  it("is not active on other routes or partial prefixes", () => {
    expect(isItemActive("/accounts", movements)).toBe(false);
    expect(isItemActive("/transferencias-x", movements)).toBe(false);
  });

  it("marks settings on /settings and /categories only", () => {
    expect(isItemActive("/settings", settingsItem)).toBe(true);
    expect(isItemActive("/categories", settingsItem)).toBe(true);
    expect(isItemActive("/accounts", settingsItem)).toBe(false);
  });
});

describe("navItems", () => {
  it("has the three main destinations", () => {
    expect(navItems.map((i) => i.label)).toEqual(["Inicio", "Movimientos", "Cuentas"]);
  });

  it("keeps transfers and categories out of the main navigation", () => {
    const hrefs = navItems.map((i) => i.href);

    expect(hrefs).not.toContain("/transfers");
    expect(hrefs).not.toContain("/categories");
  });

  it("highlights exactly one destination on every known route", () => {
    for (const route of ["/dashboard", "/transactions", "/transfers", "/accounts"]) {
      expect(navItems.filter((i) => isItemActive(route, i))).toHaveLength(1);
    }
    // Categories belong to Ajustes, not to the main navigation.
    expect(navItems.filter((i) => isItemActive("/categories", i))).toHaveLength(0);
  });
});
