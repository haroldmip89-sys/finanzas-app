import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  listTransactionsAction: vi.fn(),
  createTransactionAction: vi.fn(),
  updateTransactionAction: vi.fn(),
  deleteTransactionAction: vi.fn(),
}));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const cat = vi.hoisted(() => ({ listCategoriesAction: vi.fn() }));

vi.mock("../actions/transactions.actions", () => tx);
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);

import type { TransactionListItem } from "../types/transaction.types";
import { useTransactionsManager } from "./use-transactions-manager";

const item: TransactionListItem = {
  id: "99999999-9999-4999-8999-999999999999",
  type: "expense",
  amountCents: 1250,
  date: "2026-11-10",
  note: null,
  accountId: "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab",
  accountName: "BBVA",
  categoryId: "11111111-1111-4111-8111-111111111111",
  categoryName: "Comida",
  categoryIcon: "utensils",
  isAdjustment: false,
};

function pageOf(total: number, items = [item]) {
  return {
    ok: true,
    data: {
      items,
      total,
      page: 1,
      pageSize: 20,
      totals: { incomeCents: 5000, expenseCents: 1250 },
    },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useTransactionsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.listTransactionsAction.mockResolvedValue(pageOf(45));
    acc.listAccountsAction.mockResolvedValue({
      ok: true,
      data: [{ id: item.accountId, name: "BBVA", archivedAt: null, balanceCents: 0 }],
    });
    cat.listCategoriesAction.mockResolvedValue({
      ok: true,
      data: [
        { id: item.categoryId, name: "Comida", kind: "expense", icon: "utensils", archivedAt: null },
        { id: "22222222-2222-4222-8222-222222222222", name: "Sueldo", kind: "income", icon: "wallet", archivedAt: null },
      ],
    });
  });

  it("loads the page, totals and the page count", async () => {
    const { result } = renderHook(() => useTransactionsManager(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([item]);
    expect(result.current.totals).toEqual({ incomeCents: 5000, expenseCents: 1250 });
    expect(result.current.total).toBe(45);
    expect(result.current.totalPages).toBe(3);
  });

  it("has at least one page when empty", async () => {
    tx.listTransactionsAction.mockResolvedValue(pageOf(0, []));
    const { result } = renderHook(() => useTransactionsManager(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalPages).toBe(1);
  });

  it("exposes a safe load error", async () => {
    tx.listTransactionsAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const { result } = renderHook(() => useTransactionsManager(), { wrapper });

    await waitFor(() => expect(result.current.loadError).toBe("Ocurrió un error inesperado."));
  });

  it("requests the next page and goes back to page 1 when filtering", async () => {
    const { result } = renderHook(() => useTransactionsManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(2));
    await waitFor(() =>
      expect(tx.listTransactionsAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );

    act(() => result.current.setFilter("type", "income"));
    await waitFor(() =>
      expect(tx.listTransactionsAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, type: "income" }),
      ),
    );
    expect(result.current.isFiltered).toBe(true);
  });

  it("limits the category filter to the selected type", async () => {
    const { result } = renderHook(() => useTransactionsManager(), { wrapper });
    await waitFor(() => expect(result.current.categoryOptions).toHaveLength(2));

    act(() => result.current.setFilter("type", "income"));

    expect(result.current.categoryOptions.map((c) => c.name)).toEqual(["Sueldo"]);
  });

  it("opens and closes the form", async () => {
    const { result } = renderHook(() => useTransactionsManager(), { wrapper });

    act(() => result.current.openCreate());
    expect(result.current.formState).toEqual({ mode: "create" });

    act(() => result.current.openEdit(item));
    expect(result.current.formState).toEqual({ mode: "edit", transaction: item });

    act(() => result.current.closeForm());
    expect(result.current.formState).toEqual({ mode: "closed" });
  });

  it("deletes after confirmation, closes the dialog and reloads the list", async () => {
    tx.deleteTransactionAction.mockResolvedValue({ ok: true, data: null });
    const { result } = renderHook(() => useTransactionsManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = tx.listTransactionsAction.mock.calls.length;

    act(() => result.current.askDelete(item));
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(result.current.toDelete).toBeNull());
    expect(tx.deleteTransactionAction).toHaveBeenCalledWith(item.id);
    await waitFor(() =>
      expect(tx.listTransactionsAction.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it("keeps the dialog open and shows the error when deleting fails", async () => {
    tx.deleteTransactionAction.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND", message: "La transacción no existe." },
    });
    const { result } = renderHook(() => useTransactionsManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.askDelete(item));
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(result.current.deleteError).toBe("La transacción no existe."));
    expect(result.current.toDelete).toEqual(item);
  });
});
