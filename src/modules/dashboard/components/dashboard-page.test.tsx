import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dash = vi.hoisted(() => ({ spendingSummaryAction: vi.fn(), dailySpendingAction: vi.fn() }));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const bud = vi.hoisted(() => ({ listBudgetsAction: vi.fn() }));
const tx = vi.hoisted(() => ({ listTransactionsAction: vi.fn() }));
const quick = vi.hoisted(() => ({ open: vi.fn() }));

vi.mock("../actions/dashboard.actions", () => dash);
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("@/modules/budgets/actions/budgets.actions", () => bud);
vi.mock("@/modules/transactions/actions/transactions.actions", () => tx);
vi.mock("@/modules/quick-add/hooks/use-quick-add", () => ({ useQuickAdd: () => quick }));
vi.mock("@/modules/quick-add/components/quick-actions", () => ({ QuickActions: () => null }));

import { DashboardPage } from "./dashboard-page";

const account = (overrides: Record<string, unknown>) => ({
  id: crypto.randomUUID(),
  name: "Cuenta",
  type: "bank",
  initialBalanceCents: 0,
  archivedAt: null,
  includeInAvailable: true,
  balanceCents: 0,
  ...overrides,
});

const movement = (overrides: Record<string, unknown>) => ({
  id: crypto.randomUUID(),
  type: "expense",
  amountCents: 1850,
  date: "2026-11-14",
  note: null,
  accountId: "a1",
  accountName: "BCP Ahorros",
  categoryId: "c1",
  categoryName: "Comida",
  categoryIcon: "utensils",
  isAdjustment: false,
  ...overrides,
});

function ok<T>(data: T) {
  return { ok: true as const, data };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

function setup(
  overrides: {
    accounts?: unknown[];
    spending?: unknown;
    budgets?: unknown;
    transactions?: unknown[];
    daily?: unknown;
  } = {},
) {
  acc.listAccountsAction.mockResolvedValue(
    ok(overrides.accounts ?? [account({ balanceCents: 300000 })]),
  );
  dash.spendingSummaryAction.mockResolvedValue(
    ok(
      overrides.spending ?? {
        currentCents: 123640,
        previousCents: 139000,
        byCategory: [
          { categoryId: "1", name: "Comida", cents: 80000 },
          { categoryId: "2", name: "Servicios", cents: 43640 },
        ],
      },
    ),
  );
  dash.dailySpendingAction.mockResolvedValue(
    ok(overrides.daily ?? { currentDaily: [1000, 0, 2000], previousDaily: [500, 500, 500] }),
  );
  bud.listBudgetsAction.mockResolvedValue(
    ok(
      overrides.budgets ?? {
        month: "2026-11",
        items: [
          { id: "b1", categoryId: "1", categoryName: "Comida", categoryIcon: null, amountCents: 200000, spentCents: 124000 },
        ],
        unbudgeted: [],
        totals: { budgetedCents: 200000, spentCents: 124000, remainingCents: 76000 },
        previousMonthHasBudgets: false,
      },
    ),
  );
  tx.listTransactionsAction.mockResolvedValue(
    ok({
      items: overrides.transactions ?? [movement({})],
      total: 1,
      page: 1,
      pageSize: 5,
      totals: { incomeCents: 0, expenseCents: 0 },
    }),
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the available money, the spending, the budget and the latest movements", async () => {
    setup();
    renderPage();

    expect(await screen.findByText("Dinero disponible")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Gastos del mes" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Presupuesto restante" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Últimos movimientos" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Evolución del gasto" })).toBeInTheDocument();
    expect(screen.getByText("−S/ 18.50")).toBeInTheDocument();
  });

  it("compares the spending with the same point of last month, in words", async () => {
    setup();
    renderPage();

    expect(await screen.findByText(/menos que a esta altura de octubre/)).toBeInTheDocument();
    expect(screen.getByText(/S\/\s153\.60/)).toBeInTheDocument();
  });

  it("describes the spending chart in text with the amounts", async () => {
    setup();
    renderPage();

    const chart = await screen.findByRole("img", { name: /Gastos por categoría/ });
    expect(chart).toHaveAccessibleName(/Comida S\/\s800\.00, Servicios S\/\s436\.40/);
    const spending = screen.getByRole("region", { name: "Gastos del mes" });
    expect(within(spending).getByText("Comida")).toBeInTheDocument();
  });

  it("groups the smallest categories as Otros", async () => {
    setup({
      spending: {
        currentCents: 2100,
        previousCents: 0,
        byCategory: ["A", "B", "C", "D", "E", "F"].map((name, i) => ({
          categoryId: String(i),
          name,
          cents: 600 - i * 100,
        })),
      },
    });
    renderPage();

    expect(await screen.findByText("Otros")).toBeInTheDocument();
  });

  it("hides the card debt section when there are no cards", async () => {
    setup();
    renderPage();
    await screen.findByRole("heading", { name: "Gastos del mes" });

    expect(screen.queryByRole("heading", { name: "Deuda de tarjetas" })).not.toBeInTheDocument();
  });

  it("shows the card debt with how many cards owe", async () => {
    setup({
      accounts: [
        account({ balanceCents: 300000 }),
        account({ type: "card", name: "Visa", balanceCents: -86020 }),
        account({ type: "card", name: "Master", balanceCents: 0 }),
      ],
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Deuda de tarjetas" })).toBeInTheDocument();
    expect(screen.getAllByText(/S\/\s860\.20/).length).toBeGreaterThan(0);
    expect(screen.getByText("1 de 2 tarjetas con deuda")).toBeInTheDocument();
  });

  it("shows what is left of the budget with its state in text", async () => {
    setup();
    renderPage();

    expect(await screen.findByText(/62 % de S\/\s2,000\.00 · Holgado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver presupuestos" })).toHaveAttribute("href", "/analysis");
  });

  it("states an exceeded budget in words", async () => {
    setup({
      budgets: {
        month: "2026-11",
        items: [{ id: "b1", categoryId: "1", categoryName: "Comida", categoryIcon: null, amountCents: 10000, spentCents: 12500 }],
        unbudgeted: [],
        totals: { budgetedCents: 10000, spentCents: 12500, remainingCents: -2500 },
        previousMonthHasBudgets: false,
      },
    });
    renderPage();

    expect(await screen.findByText(/Excedido por\s+S\/\s25\.00/)).toBeInTheDocument();
    expect(screen.getByText(/· Excedido/)).toBeInTheDocument();
  });

  it("invites to create the first budget when there are none", async () => {
    setup({
      budgets: {
        month: "2026-11",
        items: [],
        unbudgeted: [],
        totals: { budgetedCents: 0, spentCents: 0, remainingCents: 0 },
        previousMonthHasBudgets: false,
      },
    });
    renderPage();

    expect(await screen.findByRole("link", { name: "Crear presupuesto" })).toHaveAttribute("href", "/analysis");
  });

  it("marks balance adjustments and shows income with a plus sign", async () => {
    setup({
      transactions: [
        movement({ type: "income", amountCents: 320000, categoryName: "Sueldo" }),
        movement({ type: "income", amountCents: 1240, categoryName: "Calibración", isAdjustment: true }),
      ],
    });
    renderPage();

    expect(await screen.findByText("+S/ 3,200.00")).toBeInTheDocument();
    expect(screen.getByText("Ajuste")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute("href", "/transactions");
  });

  it("offers to register the first expense when there are no movements", async () => {
    setup({ transactions: [], spending: { currentCents: 0, previousCents: 0, byCategory: [] } });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nuevo gasto" }));

    expect(quick.open).toHaveBeenCalledWith("expense");
    expect(screen.getByText("Aún no registras gastos este mes.")).toBeInTheDocument();
  });

  it("shows a retryable error in a section without breaking the others", async () => {
    setup();
    dash.spendingSummaryAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/No pudimos cargar tus gastos/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Últimos movimientos" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Gastos del mes" })).toBeInTheDocument();
  });
});
