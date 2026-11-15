import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  listInstallmentsAction: vi.fn(),
  createInstallmentAction: vi.fn(),
  payInstallmentAction: vi.fn(),
  deleteInstallmentAction: vi.fn(),
}));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
vi.mock("../actions/installments.actions", () => actions);
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { InstallmentsPage } from "./installments-page";

const plan = {
  id: "p1",
  accountId: "a1",
  accountName: "Visa",
  name: "Laptop",
  principalCents: 110000,
  installmentCount: 12,
  installmentCents: 10000,
  firstDueMonth: "2026-10-01",
  paidCount: 3,
  remainingCount: 9,
  remainingCents: 90000,
  nextDueMonth: "2026-11",
  dueThisMonth: true,
  finished: false,
  interestCents: 10000,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <InstallmentsPage />
    </QueryClientProvider>,
  );
}

describe("InstallmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [] });
    actions.payInstallmentAction.mockResolvedValue({ ok: true, data: null });
  });

  it("invites to add the first plan when there are none", async () => {
    actions.listInstallmentsAction.mockResolvedValue({
      ok: true,
      data: { items: [], dueThisMonthCents: 0, remainingCents: 0 },
    });
    renderPage();
    expect(await screen.findByText("Aún no registras compras en cuotas")).toBeInTheDocument();
  });

  it("shows progress, what is left, the due month and the interest", async () => {
    actions.listInstallmentsAction.mockResolvedValue({
      ok: true,
      data: { items: [plan], dueThisMonthCents: 10000, remainingCents: 90000 },
    });
    renderPage();

    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText(/3 de 12 cuotas · Falta S\/\s900\.00/)).toBeInTheDocument();
    expect(screen.getAllByText("Vence este mes")).toHaveLength(2);
    expect(screen.getByText(/Intereses: S\/\s100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/no cambia tus saldos ni tu dinero disponible/)).toBeInTheDocument();
  });

  it("registers a paid installment from the actions menu", async () => {
    actions.listInstallmentsAction.mockResolvedValue({
      ok: true,
      data: { items: [plan], dueThisMonthCents: 10000, remainingCents: 90000 },
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Acciones del plan Laptop/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Pagué una cuota" }));

    expect(actions.payInstallmentAction).toHaveBeenCalledWith("p1");
  });

  it("shows a retryable error", async () => {
    actions.listInstallmentsAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "x" },
    });
    renderPage();
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
