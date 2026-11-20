import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ getMindfulSettingsAction: vi.fn(), saveMindfulSettingsAction: vi.fn() }));
const av = vi.hoisted(() => ({
  listAvoidedAction: vi.fn(),
  createAvoidedAction: vi.fn(),
  updateAvoidedAction: vi.fn(),
  setAvoidedStatusAction: vi.fn(),
  deleteAvoidedAction: vi.fn(),
}));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const bud = vi.hoisted(() => ({ listBudgetsAction: vi.fn() }));
const cat = vi.hoisted(() => ({ listCategoriesAction: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../actions/settings.actions", () => settings);
vi.mock("@/modules/avoided-purchases/actions/avoided.actions", () => av);
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("@/modules/budgets/actions/budgets.actions", () => bud);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);
vi.mock("sonner", () => ({ toast: toastMock }));

import { EvaluatePurchaseDialog } from "./evaluate-purchase-dialog";

const FOOD = "11111111-1111-4111-8111-111111111111";

const account = (balanceCents: number, extra: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  name: "BCP",
  type: "bank",
  initialBalanceCents: 0,
  archivedAt: null,
  includeInAvailable: true,
  balanceCents,
  ...extra,
});

function ok<T>(data: T) {
  return { ok: true as const, data };
}

function setup({ budgets = [] as { amountCents: number; spentCents: number }[], balance = 100000 } = {}) {
  settings.getMindfulSettingsAction.mockResolvedValue(ok({ enabled: true, thresholdCents: 10000, pauseMinutes: 1440 }));
  acc.listAccountsAction.mockResolvedValue(ok([account(balance)]));
  cat.listCategoriesAction.mockResolvedValue(
    ok([{ id: FOOD, name: "Comida", kind: "expense", icon: "utensils", archivedAt: null, systemKey: null }]),
  );
  bud.listBudgetsAction.mockResolvedValue(
    ok({
      month: "2026-11",
      items: budgets.map((b, i) => ({
        id: `b${i}`,
        categoryId: FOOD,
        categoryName: "Comida",
        categoryIcon: null,
        ...b,
      })),
      unbudgeted: [],
      totals: { budgetedCents: 0, spentCents: 0, remainingCents: 0 },
      previousMonthHasBudgets: false,
    }),
  );
  av.createAvoidedAction.mockResolvedValue(ok({}));
}

function renderDialog(props: { onBuy?: () => void; onClose?: () => void } = {}) {
  const onBuy = props.onBuy ?? vi.fn();
  const onClose = props.onClose ?? vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <EvaluatePurchaseDialog open onBuy={onBuy} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { ...utils, onBuy, onClose };
}

describe("EvaluatePurchaseDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says it registers nothing and keeps the outcomes disabled until there is an amount", async () => {
    setup();
    renderDialog();

    expect(await screen.findByRole("heading", { name: "Evaluar una compra" })).toBeInTheDocument();
    expect(screen.getByText(/No registra ningún gasto ni cambia tus saldos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "La compraré" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "No la compraré" })).toBeDisabled();
  });

  it("shows what would be left of the available money, as an estimate", async () => {
    setup({ balance: 100000 });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "89.90");

    expect(await screen.findByText(/Te quedarían S\/\s910\.10 disponibles \(estimado\)/)).toBeInTheDocument();
  });

  it("uses the money not earmarked by budgets when there are budgets", async () => {
    setup({ balance: 100000, budgets: [{ amountCents: 30000, spentCents: 5000 }] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "80");

    expect(await screen.findByText(/Te quedarían S\/\s670\.00 sin asignar \(estimado\)/)).toBeInTheDocument();
  });

  it("shows how the category budget would end up, and no budget fact without a category", async () => {
    setup({ budgets: [{ amountCents: 20000, spentCents: 15000 }] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "80");
    await screen.findByText(/sin asignar/);
    expect(screen.queryByText(/presupuesto de Comida/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /Categoría/ }));
    await user.click(await screen.findByRole("option", { name: "Comida" }));

    expect(await screen.findByText(/Te pasarías S\/\s30\.00 de tu presupuesto de Comida/)).toBeInTheDocument();
  });

  it("states it calmly when the amount exceeds the money", async () => {
    setup({ balance: 5000 });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "200");

    expect(await screen.findByText(/Supera tu dinero disponibles? en S\/\s150\.00 \(estimado\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "La compraré" })).toBeEnabled();
  });

  it("'La compraré' hands the amount and category to the expense form", async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onBuy } = renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "45.50");
    await user.click(screen.getByRole("combobox", { name: /Categoría/ }));
    await user.click(await screen.findByRole("option", { name: "Comida" }));
    await user.click(screen.getByRole("button", { name: "La compraré" }));

    expect(onBuy).toHaveBeenCalledWith({ amountCents: 4550, categoryId: FOOD });
    expect(av.createAvoidedAction).not.toHaveBeenCalled();
  });

  it("'No la compraré' registers an avoided purchase and keeps the necessity answer as the reason", async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onClose } = renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "120");
    await user.click(screen.getByRole("button", { name: "Puede esperar" }));
    await user.click(screen.getByRole("button", { name: "No la compraré" }));

    await waitFor(() =>
      expect(av.createAvoidedAction).toHaveBeenCalledWith({
        amountCents: 12000,
        date: "2026-11-15",
        categoryId: null,
        reason: "can_wait",
        note: null,
        status: "avoided",
        remindInMinutes: null,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/Compra evitada registrada/));
  });

  it("'Pensarlo' registers a postponed purchase with the default pause, or the one chosen", async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "300");
    await user.click(screen.getByRole("button", { name: "Pensarlo" }));
    await waitFor(() =>
      expect(av.createAvoidedAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "postponed", remindInMinutes: 1440 }),
      ),
    );

    await user.click(screen.getByRole("tab", { name: "10 minutos" }));
    await user.click(screen.getByRole("button", { name: "Pensarlo" }));
    await waitFor(() =>
      expect(av.createAvoidedAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "postponed", remindInMinutes: 10 }),
      ),
    );
  });

  it("never creates a transaction or touches the accounts", async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "50");
    await user.click(screen.getByRole("button", { name: "No la compraré" }));

    await waitFor(() => expect(av.createAvoidedAction).toHaveBeenCalled());
    expect(acc.listAccountsAction).toHaveBeenCalledTimes(1);
  });

  it("shows a server error without closing", async () => {
    setup();
    av.createAvoidedAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onClose } = renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "50");
    await user.click(screen.getByRole("button", { name: "No la compraré" }));

    expect(await screen.findByText("Ocurrió un error inesperado.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses wording that states facts without orders or blame", async () => {
    setup({ balance: 5000 });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();

    await user.type(await screen.findByLabelText("Monto (S/)"), "200");
    const facts = await screen.findByRole("list", { name: "Cómo encaja" });

    expect(facts.textContent).not.toMatch(/debes|no deber|evita|cuidado|culpa|mal /i);
  });
});
