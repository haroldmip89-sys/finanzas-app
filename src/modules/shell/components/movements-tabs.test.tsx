import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/transactions" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { MovementsTabs } from "./movements-tabs";

describe("MovementsTabs", () => {
  beforeEach(() => {
    pathname.value = "/transactions";
  });

  it("links to transactions and transfers", () => {
    render(<MovementsTabs />);

    expect(screen.getByRole("link", { name: "Transacciones" })).toHaveAttribute(
      "href",
      "/transactions",
    );
    expect(screen.getByRole("link", { name: "Transferencias" })).toHaveAttribute(
      "href",
      "/transfers",
    );
  });

  it("marks the transactions tab on /transactions", () => {
    render(<MovementsTabs />);

    expect(screen.getByRole("link", { name: "Transacciones" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Transferencias" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the transfers tab on /transfers", () => {
    pathname.value = "/transfers";
    render(<MovementsTabs />);

    expect(screen.getByRole("link", { name: "Transferencias" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Transacciones" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps the tab active on sub routes and has exactly one active tab", () => {
    pathname.value = "/transfers/anything";
    render(<MovementsTabs />);

    expect(
      screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page"),
    ).toHaveLength(1);
  });
});
