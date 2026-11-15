import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bud = vi.hoisted(() => ({
  listBudgetsAction: vi.fn(),
  createBudgetAction: vi.fn(),
  updateBudgetAction: vi.fn(),
  deleteBudgetAction: vi.fn(),
  copyBudgetsFromPreviousMonthAction: vi.fn(),
}));
const cat = vi.hoisted(() => ({ listCategoriesAction: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../actions/budgets.actions", () => bud);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);
vi.mock("sonner", () => ({ toast: toastMock }));

import type { BudgetsOverview } from "../types/budget.types";
import { BudgetsPage } from "./budgets-page";

const FOOD = "11111111-1111-4111-8111-111111111111";
const FUN = "22222222-2222-4222-8222-222222222222";

const categories = [
  { id: FOOD, name: "Comida", kind: "expense", icon: "utensils", archivedAt: null, systemKey: null },
  { id: FUN, name: "Ocio", kind: "expense", icon: "gamepad", archivedAt: null, systemKey: null },
];

function overview(overrides: Partial<BudgetsOverview> = {}): BudgetsOverview {
  return {
    month: "2026-11",
    items: [
      { id: "b1", categoryId: FOOD, categoryName: "Comida", categoryIcon: "utensils", amountCents: 20000, spentCents: 17000 },
    ],
    unbudgeted: [
      { categoryId: FUN, categoryName: "Ocio", categoryIcon: "gamepad", spentCents: 3500 },
    ],
    totals: { budgetedCents: 20000, spentCents: 17000, remainingCents: 3000 },
    previousMonthHasBudgets: true,
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BudgetsPage />
    </QueryClientProvider>,
  );
}

describe("BudgetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T03:00:00Z")); // still Nov 15 in Lima
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: categories });
    bud.listBudgetsAction.mockImplementation(async (month: string) => ({
      ok: true,
      data: overview({ month }),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the month, the totals, the budgets and the unbudgeted spending", async () => {
    renderPage();

    expect(await screen.findByText("noviembre 2026")).toBeInTheDocument();
    expect(await screen.findByText("Presupuestado")).toBeInTheDocument();
    expect(screen.getByText("Restante")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /Comida: 85 %/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gastos sin presupuesto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Presupuestar Ocio" })).toBeInTheDocument();
  });

  it("labels the total as exceeded when the remainder is negative", async () => {
    bud.listBudgetsAction.mockResolvedValue({
      ok: true,
      data: overview({ totals: { budgetedCents: 20000, spentCents: 25000, remainingCents: -5000 } }),
    });
    renderPage();

    expect(await screen.findByText("Excedido")).toBeInTheDocument();
    expect(screen.queryByText("Restante")).not.toBeInTheDocument();
  });

  it("navigates to the previous month and back with 'Este mes'", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("noviembre 2026");

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));

    expect(await screen.findByText("octubre 2026")).toBeInTheDocument();
    await waitFor(() => expect(bud.listBudgetsAction).toHaveBeenLastCalledWith("2026-10"));

    await user.click(screen.getByRole("button", { name: "Este mes" }));

    expect(await screen.findByText("noviembre 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Este mes" })).not.toBeInTheDocument();
  });

  describe("empty month", () => {
    const empty = (previous: boolean) =>
      overview({
        items: [],
        unbudgeted: [],
        totals: { budgetedCents: 0, spentCents: 0, remainingCents: 0 },
        previousMonthHasBudgets: previous,
      });

    it("offers copying the previous month when it has budgets, and copies", async () => {
      bud.listBudgetsAction.mockResolvedValue({ ok: true, data: empty(true) });
      bud.copyBudgetsFromPreviousMonthAction.mockResolvedValue({ ok: true, data: { created: 2 } });
      const user = userEvent.setup();
      renderPage();

      const copy = await screen.findByRole("button", { name: /Copiar del mes anterior/ });
      await user.click(copy);

      await waitFor(() =>
        expect(bud.copyBudgetsFromPreviousMonthAction).toHaveBeenCalledWith("2026-11"),
      );
      await waitFor(() =>
        expect(toastMock.success).toHaveBeenCalledWith("Se copiaron 2 presupuestos del mes anterior."),
      );
    });

    it("does not offer copying when the previous month has none", async () => {
      bud.listBudgetsAction.mockResolvedValue({ ok: true, data: empty(false) });
      renderPage();

      expect(await screen.findByText(/Aún no tienes presupuestos en noviembre 2026/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Copiar del mes anterior/ })).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Nuevo presupuesto/ }).length).toBeGreaterThan(0);
    });
  });

  it("opens the form with the category already chosen from 'Presupuestar'", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Presupuestar Ocio" }));

    expect(await screen.findByRole("heading", { name: "Nuevo presupuesto" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("Ocio"));
  });

  it("opens the form to edit with a fixed category", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Acciones del presupuesto de Comida" }));
    await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

    expect(await screen.findByRole("heading", { name: "Editar presupuesto" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Presupuesto (S/)")).toHaveValue("200.00");
  });

  it("deletes a budget after confirming", async () => {
    bud.deleteBudgetAction.mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Acciones del presupuesto de Comida" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    expect(await screen.findByRole("heading", { name: "Eliminar presupuesto" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(bud.deleteBudgetAction).toHaveBeenCalledWith("b1"));
  });

  it("shows a retryable error when loading fails", async () => {
    bud.listBudgetsAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Ocurrió un error inesperado.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Presupuestado")).toBeInTheDocument();
  });
});
