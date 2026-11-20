import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/transactions" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const tx = vi.hoisted(() => ({
  listTransactionsAction: vi.fn(),
  createTransactionAction: vi.fn(),
  updateTransactionAction: vi.fn(),
  deleteTransactionAction: vi.fn(),
  listFrequentCategoriesAction: vi.fn(),
}));
const tr = vi.hoisted(() => ({
  listTransfersAction: vi.fn(),
  createTransferAction: vi.fn(),
  updateTransferAction: vi.fn(),
  deleteTransferAction: vi.fn(),
}));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const cat = vi.hoisted(() => ({ listCategoriesAction: vi.fn() }));
const mind = vi.hoisted(() => ({ getMindfulSettingsAction: vi.fn(), saveMindfulSettingsAction: vi.fn() }));
const bud = vi.hoisted(() => ({ listBudgetsAction: vi.fn() }));
const avd = vi.hoisted(() => ({
  listAvoidedAction: vi.fn(),
  createAvoidedAction: vi.fn(),
  updateAvoidedAction: vi.fn(),
  setAvoidedStatusAction: vi.fn(),
  deleteAvoidedAction: vi.fn(),
}));

vi.mock("@/modules/transactions/actions/transactions.actions", () => tx);
vi.mock("@/modules/calibration/actions/calibration.actions", () => ({
  calibrateAccountAction: vi.fn(),
}));
vi.mock("@/modules/transfers/actions/transfers.actions", () => tr);
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);
vi.mock("@/modules/mindful-purchase/actions/settings.actions", () => mind);
vi.mock("@/modules/budgets/actions/budgets.actions", () => bud);
vi.mock("@/modules/avoided-purchases/actions/avoided.actions", () => avd);

import { useQuickAdd } from "../hooks/use-quick-add";
import { QuickActions } from "./quick-actions";
import { QuickAddFab } from "./quick-add-fab";
import { QuickAddProvider } from "./quick-add-provider";

const accounts = [
  { id: "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab", name: "BBVA", type: "bank", archivedAt: null, balanceCents: 0 },
  { id: "44444444-4444-4444-8444-444444444444", name: "Yape", type: "wallet", archivedAt: null, balanceCents: 0 },
];
const categories = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Comida", kind: "expense", icon: "utensils", archivedAt: null },
  { id: "22222222-2222-4222-8222-222222222222", name: "Sueldo", kind: "income", icon: "wallet", archivedAt: null },
];

function renderWithProviders(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <QuickAddProvider>{ui}</QuickAddProvider>
    </QueryClientProvider>,
  );
}

function BuyButton() {
  const { open } = useQuickAdd();
  return (
    <button
      onClick={() =>
        open("expense", { prefill: { amountCents: 4550, categoryId: "11111111-1111-4111-8111-111111111111" } })
      }
    >
      buy
    </button>
  );
}

function PayButton({ accountId }: { accountId: string }) {
  const { open } = useQuickAdd();
  return <button onClick={() => open("pay-card", { accountId })}>pay</button>;
}

describe("quick add", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname.value = "/transactions";
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: accounts });
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: categories });
    mind.getMindfulSettingsAction.mockResolvedValue({
      ok: true,
      data: { enabled: true, thresholdCents: 10000, pauseMinutes: 1440 },
    });
    bud.listBudgetsAction.mockResolvedValue({
      ok: true,
      data: {
        month: "2026-11",
        items: [],
        unbudgeted: [],
        totals: { budgetedCents: 0, spentCents: 0, remainingCents: 0 },
        previousMonthHasBudgets: false,
      },
    });
    tx.listFrequentCategoriesAction.mockImplementation(async (type: string) => ({
      ok: true,
      data: categories
        .filter((c) => c.kind === type)
        .map((c) => ({ id: c.id, name: c.name, icon: c.icon, uses: 0 })),
    }));
  });

  describe("QuickActions (home buttons)", () => {
    it("shows the four actions", () => {
      renderWithProviders(<QuickActions />);

      expect(screen.getByRole("button", { name: /Nuevo gasto/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Nuevo ingreso/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Transferir/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Calibrar saldos/ })).toBeInTheDocument();
    });

    it("opens the expense form with the expense type selected", async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickActions />);

      await user.click(screen.getByRole("button", { name: /Nuevo gasto/ }));

      expect(await screen.findByRole("heading", { name: "Nueva transacción" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Gasto" })).toHaveAttribute("aria-selected", "true");
    });

    it("opens the income form with the income type selected", async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickActions />);

      await user.click(screen.getByRole("button", { name: /Nuevo ingreso/ }));

      expect(await screen.findByRole("heading", { name: "Nueva transacción" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Ingreso" })).toHaveAttribute("aria-selected", "true");
    });

    it("opens the transfer form", async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickActions />);

      await user.click(screen.getByRole("button", { name: /Transferir/ }));

      expect(await screen.findByRole("heading", { name: "Nueva transferencia" })).toBeInTheDocument();
    });

    it("opens the balance calibration dialog with an account selector", async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickActions />);

      await user.click(screen.getByRole("button", { name: /Calibrar saldos/ }));

      expect(await screen.findByRole("heading", { name: "Calibrar saldo" })).toBeInTheDocument();
      expect(screen.getByLabelText("Saldo real (S/)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Calibrar" })).toBeDisabled();
    });

    it("shows the most used categories as one-tap buttons and the 'Más' button", async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickActions />);

      await user.click(screen.getByRole("button", { name: /Nuevo gasto/ }));

      expect(await screen.findByRole("radio", { name: /Comida/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Más/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar y agregar otro" })).toBeInTheDocument();
    });
  });

  describe("pay card", () => {
    const VISA = "66666666-6666-4666-8666-666666666666";

    it("opens the payment with the card as destination and its debt as the amount", async () => {
      acc.listAccountsAction.mockResolvedValue({
        ok: true,
        data: [
          ...accounts,
          { id: VISA, name: "Visa", type: "card", archivedAt: null, balanceCents: -35000 },
        ],
      });
      const user = userEvent.setup();
      renderWithProviders(<PayButton accountId={VISA} />);

      await user.click(screen.getByRole("button", { name: "pay" }));

      expect(await screen.findByRole("heading", { name: "Pagar tarjeta" })).toBeInTheDocument();
      await waitFor(() => expect(screen.getByLabelText("Monto (S/)")).toHaveValue("350.00"));
      expect(screen.getByText("Visa", { selector: "p" })).toBeInTheDocument();
    });
  });

  describe("expense prefill", () => {
    it("opens the expense form with the amount and category from 'Evaluar una compra'", async () => {
      const user = userEvent.setup();
      renderWithProviders(<BuyButton />);

      await user.click(screen.getByRole("button", { name: "buy" }));

      expect(await screen.findByRole("heading", { name: "Nueva transacción" })).toBeInTheDocument();
      await waitFor(() => expect(screen.getByLabelText("Monto (S/)")).toHaveValue("45.50"));
      await waitFor(() => expect(screen.getByRole("combobox", { name: /Categoría/ })).toHaveTextContent("Comida"));
    });

    it("shows the soft hint for a large new expense and not for a small one", async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickAddFab />);

      await user.click(screen.getByRole("button", { name: "Nuevo registro" }));
      await user.click(await screen.findByRole("menuitem", { name: /Nuevo gasto/ }));
      const amount = await screen.findByLabelText("Monto (S/)");

      await user.type(amount, "50");
      expect(screen.queryByText(/Es una compra grande para ti/)).not.toBeInTheDocument();

      await user.clear(amount);
      await user.type(amount, "150");
      expect(await screen.findByText(/Es una compra grande para ti/)).toBeInTheDocument();
      // The hint never replaces or disables saving.
      expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    });
  });

  describe("QuickAddFab", () => {
    it("is shown on the movement screens", () => {
      renderWithProviders(<QuickAddFab />);

      expect(screen.getByRole("button", { name: "Nuevo registro" })).toBeInTheDocument();
    });

    it("is also shown on the home screen", () => {
      pathname.value = "/dashboard";
      renderWithProviders(<QuickAddFab />);

      expect(screen.getByRole("button", { name: "Nuevo registro" })).toBeInTheDocument();
    });

    it("offers 'Evaluar una compra' when the mindful purchase is on, and opens its sheet", async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickAddFab />);

      await user.click(screen.getByRole("button", { name: "Nuevo registro" }));
      await user.click(await screen.findByRole("menuitem", { name: /Evaluar una compra/ }));

      expect(await screen.findByRole("heading", { name: "Evaluar una compra" })).toBeInTheDocument();
    });

    it("does not offer 'Evaluar una compra' when the mindful purchase is off", async () => {
      mind.getMindfulSettingsAction.mockResolvedValue({
        ok: true,
        data: { enabled: false, thresholdCents: 10000, pauseMinutes: 1440 },
      });
      const user = userEvent.setup();
      renderWithProviders(<QuickAddFab />);
      await waitFor(() => expect(mind.getMindfulSettingsAction).toHaveBeenCalled());

      await user.click(screen.getByRole("button", { name: "Nuevo registro" }));

      expect(await screen.findByRole("menuitem", { name: /Nuevo gasto/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Evaluar una compra/ })).not.toBeInTheDocument();
    });

    it("opens a menu with the three options and then the chosen form", async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickAddFab />);

      await user.click(screen.getByRole("button", { name: "Nuevo registro" }));

      expect(await screen.findByRole("menuitem", { name: /Nuevo gasto/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Nuevo ingreso/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Transferir/ })).toBeInTheDocument();

      await user.click(screen.getByRole("menuitem", { name: /Nuevo ingreso/ }));

      await waitFor(() =>
        expect(screen.getByRole("heading", { name: "Nueva transacción" })).toBeInTheDocument(),
      );
      expect(screen.getByRole("tab", { name: "Ingreso" })).toHaveAttribute("aria-selected", "true");
    });
  });
});
