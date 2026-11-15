import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BudgetListItem } from "../types/budget.types";
import { BudgetCard } from "./budget-card";

const base: BudgetListItem = {
  id: "99999999-9999-4999-8999-999999999999",
  categoryId: "11111111-1111-4111-8111-111111111111",
  categoryName: "Comida",
  categoryIcon: "utensils",
  amountCents: 20000,
  spentCents: 6000,
};

function renderCard(budget: BudgetListItem) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn() };
  render(
    <ul>
      <BudgetCard budget={budget} {...handlers} />
    </ul>,
  );
  return handlers;
}

describe("BudgetCard", () => {
  it("shows the category, what was spent and the budget", () => {
    renderCard(base);

    expect(screen.getByText("Comida")).toBeInTheDocument();
    expect(screen.getByText(/S\/\s60\.00\s+de\s+S\/\s200\.00/)).toBeInTheDocument();
  });

  it("says how much is left when there is room", () => {
    renderCard(base);

    expect(screen.getByText(/Te quedan\s+S\/\s140\.00/)).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Comida: 30 % del presupuesto" });
    expect(bar).toHaveAttribute("aria-valuenow", "30");
  });

  it("warns calmly when it is near the limit", () => {
    renderCard({ ...base, spentCents: 17000 });

    expect(screen.getByText(/Cerca del límite · te quedan\s+S\/\s30\.00/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "85");
  });

  it("states the excess in text and keeps the bar at 100 %", () => {
    renderCard({ ...base, spentCents: 21200 });

    expect(screen.getByText(/Excedido por\s+S\/\s12\.00/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("progressbar", { name: /106 % del presupuesto/ })).toBeInTheDocument();
  });

  it("shows zero spending as having the whole budget left", () => {
    renderCard({ ...base, spentCents: 0 });

    expect(screen.getByText(/Te quedan\s+S\/\s200\.00/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("offers edit and delete from its menu", async () => {
    const handlers = renderCard(base);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Acciones del presupuesto de Comida" }));
    const items = (await screen.findAllByRole("menuitem")).map((i) => i.textContent?.trim());
    expect(items).toEqual(["Editar", "Eliminar"]);

    await user.click(screen.getByRole("menuitem", { name: "Editar" }));
    expect(handlers.onEdit).toHaveBeenCalledWith(base);
  });

  it("calls onDelete from the menu", async () => {
    const handlers = renderCard(base);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Acciones del presupuesto de Comida" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    expect(handlers.onDelete).toHaveBeenCalledWith(base);
  });
});
