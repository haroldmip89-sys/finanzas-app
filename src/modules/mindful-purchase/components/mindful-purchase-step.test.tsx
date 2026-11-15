import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const bud = vi.hoisted(() => ({ listBudgetsAction: vi.fn() }));
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("@/modules/budgets/actions/budgets.actions", () => bud);

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { MindfulPurchaseStep } from "./mindful-purchase-step";

const A1 = "a1";
const CAT = "c1";

const account = (over: Record<string, unknown> = {}) => ({
  id: A1,
  name: "BBVA",
  type: "bank",
  archivedAt: null,
  balanceCents: 100000,
  includeInAvailable: true,
  ...over,
});

function budgets(items: unknown[] = []) {
  return { ok: true, data: { month: "2026-11", items, unbudgeted: [], totals: {}, previousMonthHasBudgets: false } };
}

function renderStep(over: Partial<React.ComponentProps<typeof MindfulPurchaseStep>> = {}) {
  const props = {
    amountCents: 25000,
    accountId: A1,
    categoryId: CAT,
    date: "2026-11-15",
    pending: false,
    onRegister: vi.fn(),
    onBack: vi.fn(),
    onPause: vi.fn(),
    ...over,
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Dialog open>
        <DialogContent>
          <MindfulPurchaseStep {...props} />
        </DialogContent>
      </Dialog>
    </QueryClientProvider>,
  );
  return props;
}

describe("MindfulPurchaseStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [account()] });
    bud.listBudgetsAction.mockResolvedValue(budgets());
  });

  it("registers right away when the purchase is needed, showing no facts", async () => {
    const props = renderStep();
    await userEvent.click(screen.getByRole("button", { name: "Es necesaria" }));

    expect(props.onRegister).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Dinero disponible/)).not.toBeInTheDocument();
  });

  it("shows the budget and available facts when it can wait", async () => {
    bud.listBudgetsAction.mockResolvedValue(
      budgets([{ id: "b", categoryId: CAT, categoryName: "Comida", categoryIcon: null, amountCents: 60000, spentCents: 20000 }]),
    );
    renderStep();
    await userEvent.click(screen.getByRole("button", { name: "Puedo esperar" }));

    expect(await screen.findByText(/te quedan\s+S\/\s400\.00 y quedarían\s+S\/\s150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/S\/\s1,000\.00 → S\/\s750\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Estimado/)).toBeInTheDocument();
  });

  it("says in plain words when it would exceed the budget or there is none", async () => {
    bud.listBudgetsAction.mockResolvedValue(
      budgets([{ id: "b", categoryId: CAT, categoryName: "Comida", categoryIcon: null, amountCents: 30000, spentCents: 20000 }]),
    );
    renderStep();
    await userEvent.click(screen.getByRole("button", { name: "Es un antojo" }));

    expect(await screen.findByText(/Te pasarías del presupuesto por S\/\s150\.00/)).toBeInTheDocument();
  });

  it("states that money from a reserve leaves the available money untouched", async () => {
    acc.listAccountsAction.mockResolvedValue({
      ok: true,
      data: [account({ id: "other" }), account({ includeInAvailable: false })],
    });
    renderStep();
    await userEvent.click(screen.getByRole("button", { name: "Puedo esperar" }));

    expect(await screen.findByText(/Sale de tu reserva/)).toBeInTheDocument();
  });

  it("lets the user register anyway, think about it, or go back", async () => {
    const props = renderStep();
    await userEvent.click(screen.getByRole("button", { name: "Es un antojo" }));

    await userEvent.click(screen.getByRole("button", { name: "Pensarlo 10 minutos" }));
    expect(props.onPause).toHaveBeenCalledWith("10m", "not_needed");

    await userEvent.click(screen.getByRole("button", { name: "Registrar gasto" }));
    expect(props.onRegister).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(props.onBack).toHaveBeenCalled();
  });
});
