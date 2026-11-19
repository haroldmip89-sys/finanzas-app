import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const bud = vi.hoisted(() => ({ listBudgetsAction: vi.fn() }));
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("@/modules/budgets/actions/budgets.actions", () => bud);

import { AvailableMoneyCard } from "./available-money-card";

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

const overview = (items: { amountCents: number; spentCents: number }[]) => ({
  ok: true,
  data: {
    month: "2026-11",
    items: items.map((i, n) => ({
      id: `b${n}`,
      categoryId: `c${n}`,
      categoryName: `Cat ${n}`,
      categoryIcon: null,
      ...i,
    })),
    unbudgeted: [],
    totals: { budgetedCents: 0, spentCents: 0, remainingCents: 0 },
    previousMonthHasBudgets: false,
  },
});

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AvailableMoneyCard />
    </QueryClientProvider>,
  );
}

describe("AvailableMoneyCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
    bud.listBudgetsAction.mockResolvedValue(overview([]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("without budgets shows the estimate, the label and an orienting per-day figure", async () => {
    acc.listAccountsAction.mockResolvedValue({
      ok: true,
      data: [account({ balanceCents: 166070 })],
    });
    renderCard();

    expect(await screen.findByText(/S\/\s1,660\.70/)).toBeInTheDocument();
    expect(screen.getByText("Estimado")).toBeInTheDocument();
    expect(await screen.findByText(/Sin presupuestos este mes/)).toBeInTheDocument();
    expect(screen.getByText(/hasta el 30 nov 2026/)).toBeInTheDocument();
    expect(screen.getByText(/≈ S\/\s103\.79/)).toBeInTheDocument();
    expect(screen.getByText(/\(orientativo\)/)).toBeInTheDocument();
  });

  it("explains the calculation with reserves and card debt", async () => {
    acc.listAccountsAction.mockResolvedValue({
      ok: true,
      data: [
        account({ balanceCents: 100000 }),
        account({ balanceCents: 50000, includeInAvailable: false }),
        account({ type: "card", balanceCents: -20000 }),
      ],
    });
    const user = userEvent.setup();
    renderCard();

    const toggle = await screen.findByRole("button", { name: "¿Cómo se calculó?" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Saldo en cuentas")).toBeInTheDocument();
    expect(screen.getByText("Reservado")).toBeInTheDocument();
    expect(screen.getByText("Deuda de tarjetas")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("states a negative amount calmly and without a per-day figure", async () => {
    acc.listAccountsAction.mockResolvedValue({
      ok: true,
      data: [account({ balanceCents: 10000 }), account({ type: "card", balanceCents: -25000 })],
    });
    renderCard();

    expect(await screen.findByText(/−S\/\s150\.00/)).toBeInTheDocument();
    expect(screen.getByText("Tu deuda de tarjetas supera tu dinero líquido.")).toBeInTheDocument();
    expect(screen.queryByText(/por día/)).not.toBeInTheDocument();
  });

  it("with budgets shows what is pending and unassigned, and no per-day figure", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [account({ balanceCents: 100000 })] });
    bud.listBudgetsAction.mockResolvedValue(
      overview([
        { amountCents: 30000, spentCents: 5000 },
        { amountCents: 10000, spentCents: 15000 },
      ]),
    );
    renderCard();

    expect(await screen.findByText(/Pendiente en presupuestos/)).toBeInTheDocument();
    expect(screen.getByText("S/ 250.00")).toBeInTheDocument();
    expect(screen.getByText(/Sin asignar a presupuestos/)).toBeInTheDocument();
    expect(screen.getByText("S/ 750.00")).toBeInTheDocument();
    expect(screen.queryByText(/por día/)).not.toBeInTheDocument();
    expect(screen.queryByText(/promedio diario/)).not.toBeInTheDocument();
  });

  it("says so calmly when the pending budgets exceed the available money", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [account({ balanceCents: 20000 })] });
    bud.listBudgetsAction.mockResolvedValue(overview([{ amountCents: 50000, spentCents: 0 }]));
    renderCard();

    expect(
      await screen.findByText(/Tus presupuestos pendientes superan tu dinero disponible en/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Sin asignar a presupuestos/)).not.toBeInTheDocument();
  });

  it("shows neither a per-day nor an unassigned figure while the budgets are unknown", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [account({ balanceCents: 100000 })] });
    bud.listBudgetsAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    renderCard();

    expect(await screen.findByText("Estimado")).toBeInTheDocument();
    expect(await screen.findByText(/Hasta el 30 nov 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/promedio diario/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sin asignar/)).not.toBeInTheDocument();
  });

  it("adds the budgets to the explanation", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [account({ balanceCents: 100000 })] });
    bud.listBudgetsAction.mockResolvedValue(overview([{ amountCents: 30000, spentCents: 0 }]));
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "¿Cómo se calculó?" }));

    expect(screen.getAllByText("Pendiente en presupuestos").length).toBeGreaterThan(0);
    expect(screen.getByText("Sin asignar")).toBeInTheDocument();
  });

  it("shows a retryable error when the accounts fail to load", async () => {
    acc.listAccountsAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup();
    renderCard();

    expect(await screen.findByText(/No pudimos calcular tu dinero disponible/)).toBeInTheDocument();

    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [account({ balanceCents: 1000 })] });
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Estimado")).toBeInTheDocument();
  });
});
