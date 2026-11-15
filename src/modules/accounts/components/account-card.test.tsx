import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AccountWithBalance } from "../types/account.types";
import { AccountCard } from "./account-card";

const base: AccountWithBalance = {
  id: "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab",
  userId: "user_a",
  name: "BBVA",
  type: "bank",
  initialBalanceCents: 10000,
  balanceCents: 82000,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function renderCard(account: AccountWithBalance) {
  const handlers = {
    onEdit: vi.fn(),
    onCalibrate: vi.fn(),
    onPay: vi.fn(),
    onToggleArchived: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <ul>
      <AccountCard account={account} {...handlers} />
    </ul>,
  );
  return handlers;
}

async function menuItems(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: `Acciones de ${name}` }));
  return (await screen.findAllByRole("menuitem")).map((i) => i.textContent?.trim());
}

describe("AccountCard", () => {
  it("shows the balance of a normal account", () => {
    renderCard(base);

    expect(screen.getByText(/S\/\s820\.00/)).toBeInTheDocument();
  });

  it("offers calibrate but not pay for a normal account", async () => {
    renderCard(base);

    const items = await menuItems("BBVA");

    expect(items).toContain("Calibrar saldo");
    expect(items).not.toContain("Pagar tarjeta");
  });

  describe("credit card", () => {
    const card: AccountWithBalance = { ...base, name: "Visa", type: "card", balanceCents: -35000 };

    it("shows the debt instead of a balance", () => {
      renderCard(card);

      expect(screen.getByText(/Deuda\s+S\/\s350\.00/)).toBeInTheDocument();
      expect(screen.getByText("Tarjeta de crédito")).toBeInTheDocument();
    });

    it("shows credit in favor when the balance is positive", () => {
      renderCard({ ...card, balanceCents: 5000 });

      expect(screen.getByText(/A favor\s+S\/\s50\.00/)).toBeInTheDocument();
    });

    it("shows 'Sin deuda' when nothing is owed", () => {
      renderCard({ ...card, balanceCents: 0 });

      expect(screen.getByText("Sin deuda")).toBeInTheDocument();
    });

    it("offers pay and calibrate", async () => {
      renderCard(card);

      const items = await menuItems("Visa");

      expect(items).toContain("Pagar tarjeta");
      expect(items).toContain("Calibrar saldo");
    });

    it("calls onPay when choosing 'Pagar tarjeta'", async () => {
      const handlers = renderCard(card);
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Acciones de Visa" }));
      await user.click(await screen.findByRole("menuitem", { name: "Pagar tarjeta" }));

      expect(handlers.onPay).toHaveBeenCalledWith(card);
    });

    it("offers neither pay nor calibrate when archived", async () => {
      renderCard({ ...card, archivedAt: new Date() });

      const items = await menuItems("Visa");

      expect(items).not.toContain("Pagar tarjeta");
      expect(items).not.toContain("Calibrar saldo");
      expect(items).toContain("Desarchivar");
    });
  });
});
