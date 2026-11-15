import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);

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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the estimate, the label and the per-day figure", async () => {
    acc.listAccountsAction.mockResolvedValue({
      ok: true,
      data: [account({ balanceCents: 166070 })],
    });
    renderCard();

    expect(await screen.findByText(/S\/\s1,660\.70/)).toBeInTheDocument();
    expect(screen.getByText("Estimado")).toBeInTheDocument();
    expect(screen.getByText(/Para gastar hasta el 30 nov 2026/)).toBeInTheDocument();
    expect(screen.getByText(/≈ S\/\s103\.79 por día/)).toBeInTheDocument();
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
