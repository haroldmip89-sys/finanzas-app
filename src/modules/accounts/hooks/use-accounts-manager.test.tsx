import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountWithBalance } from "../types/account.types";

const actions = vi.hoisted(() => ({
  listAccountsAction: vi.fn(),
  createAccountAction: vi.fn(),
  updateAccountAction: vi.fn(),
  setAccountArchivedAction: vi.fn(),
  deleteAccountAction: vi.fn(),
  cardSpendingAction: vi.fn(),
}));

vi.mock("../actions/accounts.actions", () => actions);

import { useAccountsManager } from "./use-accounts-manager";

const account: AccountWithBalance = {
  id: "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab",
  userId: "user_a",
  name: "BCP",
  type: "bank",
  initialBalanceCents: 1000,
  includeInAvailable: true,
  balanceCents: 1000,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAccountsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.listAccountsAction.mockResolvedValue({ ok: true, data: [account] });
  });

  it("loads the accounts", async () => {
    const { result } = renderHook(() => useAccountsManager(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.accounts).toEqual([account]);
    expect(result.current.loadError).toBeUndefined();
  });

  it("exposes a safe load error when the action fails", async () => {
    actions.listAccountsAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const { result } = renderHook(() => useAccountsManager(), { wrapper });

    await waitFor(() => expect(result.current.loadError).toBe("Ocurrió un error inesperado."));
    expect(result.current.accounts).toEqual([]);
  });

  it("requests archived accounts when the switch is on", async () => {
    const { result } = renderHook(() => useAccountsManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setShowArchived(true));

    await waitFor(() =>
      expect(actions.listAccountsAction).toHaveBeenLastCalledWith({ includeArchived: true }),
    );
  });

  it("archives an active account", async () => {
    actions.setAccountArchivedAction.mockResolvedValue({ ok: true, data: account });
    const { result } = renderHook(() => useAccountsManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.toggleArchived(account));

    await waitFor(() =>
      expect(actions.setAccountArchivedAction).toHaveBeenCalledWith(account.id, true),
    );
  });

  it("opens and closes the form", async () => {
    const { result } = renderHook(() => useAccountsManager(), { wrapper });

    act(() => result.current.openCreate());
    expect(result.current.formState).toEqual({ mode: "create" });

    act(() => result.current.openEdit(account));
    expect(result.current.formState).toEqual({ mode: "edit", account });

    act(() => result.current.closeForm());
    expect(result.current.formState).toEqual({ mode: "closed" });
  });

  it("deletes after confirmation, closes the dialog and reloads the list", async () => {
    actions.deleteAccountAction.mockResolvedValue({ ok: true, data: null });
    const { result } = renderHook(() => useAccountsManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = actions.listAccountsAction.mock.calls.length;

    act(() => result.current.askDelete(account));
    expect(result.current.confirm?.account).toEqual(account);
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(result.current.confirm).toBeNull());
    expect(actions.deleteAccountAction).toHaveBeenCalledWith(account.id);
    await waitFor(() =>
      expect(actions.listAccountsAction.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it("keeps the dialog open and shows the error when the account is in use", async () => {
    actions.deleteAccountAction.mockResolvedValue({
      ok: false,
      error: { code: "IN_USE", message: "No se puede eliminar. Archívala en su lugar." },
    });
    const { result } = renderHook(() => useAccountsManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.askDelete(account));
    act(() => result.current.confirmDelete());

    await waitFor(() =>
      expect(result.current.deleteError).toBe("No se puede eliminar. Archívala en su lugar."),
    );
    expect(result.current.confirm).not.toBeNull();
  });

  describe("cards and totals", () => {
    const card: AccountWithBalance = {
      ...account,
      id: "77777777-7777-4777-8777-777777777777",
      name: "Visa",
      type: "card",
      initialBalanceCents: 0,
      balanceCents: -35000,
    };
    const wallet: AccountWithBalance = {
      ...account,
      id: "88888888-8888-4888-8888-888888888888",
      name: "Yape",
      type: "wallet",
      balanceCents: 2500,
    };

    it("splits cards from the rest and totals liquid money and debt", async () => {
      actions.listAccountsAction.mockResolvedValue({ ok: true, data: [account, wallet, card] });
      actions.cardSpendingAction.mockResolvedValue({
        ok: true,
        data: { currentMonthCents: 12000, previousMonthCents: 5000 },
      });
      const { result } = renderHook(() => useAccountsManager(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.regularAccounts.map((a) => a.name)).toEqual(["BCP", "Yape"]);
      expect(result.current.cardAccounts.map((a) => a.name)).toEqual(["Visa"]);
      expect(result.current.liquidCents).toBe(1000 + 2500);
      expect(result.current.debtCents).toBe(35000);
      expect(result.current.hasActiveCards).toBe(true);
      await waitFor(() =>
        expect(result.current.cardSpending).toEqual({ currentMonthCents: 12000, previousMonthCents: 5000 }),
      );
    });

    it("does not ask for card spending when there are no cards", async () => {
      actions.listAccountsAction.mockResolvedValue({ ok: true, data: [account, wallet] });
      const { result } = renderHook(() => useAccountsManager(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasActiveCards).toBe(false);
      expect(result.current.cardAccounts).toEqual([]);
      expect(result.current.debtCents).toBe(0);
      expect(actions.cardSpendingAction).not.toHaveBeenCalled();
    });

    it("ignores archived cards for the debt and for asking card spending", async () => {
      actions.listAccountsAction.mockResolvedValue({
        ok: true,
        data: [account, { ...card, archivedAt: new Date() }],
      });
      const { result } = renderHook(() => useAccountsManager(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.cardAccounts).toHaveLength(1);
      expect(result.current.debtCents).toBe(0);
      expect(result.current.hasActiveCards).toBe(false);
      expect(actions.cardSpendingAction).not.toHaveBeenCalled();
    });

    it("keeps archived liquid accounts out of the liquid total", async () => {
      actions.listAccountsAction.mockResolvedValue({
        ok: true,
        data: [account, { ...wallet, archivedAt: new Date() }],
      });
      const { result } = renderHook(() => useAccountsManager(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.liquidCents).toBe(1000);
    });
  });
});
