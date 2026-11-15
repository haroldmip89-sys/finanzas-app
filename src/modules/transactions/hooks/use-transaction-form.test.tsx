import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { useTransactionForm } from "./use-transaction-form";

const ACCOUNT_ID = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";
const FOOD_ID = "11111111-1111-4111-8111-111111111111";
const SALARY_ID = "22222222-2222-4222-8222-222222222222";

const accounts = [
  { id: ACCOUNT_ID, name: "BBVA", type: "bank", archivedAt: null, balanceCents: 0 },
];
const categories = [
  { id: FOOD_ID, name: "Comida", kind: "expense", icon: "utensils", archivedAt: null },
  { id: SALARY_ID, name: "Sueldo", kind: "income", icon: "wallet", archivedAt: null },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const existing: TransactionListItem = {
  id: "99999999-9999-4999-8999-999999999999",
  type: "expense",
  amountCents: 1250,
  date: "2026-11-10",
  note: "Almuerzo",
  accountId: ACCOUNT_ID,
  accountName: "BBVA",
  categoryId: FOOD_ID,
  categoryName: "Comida",
  categoryIcon: "utensils",
};

describe("useTransactionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T03:00:00Z")); // still Nov 15 in Lima
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: accounts });
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: categories });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts as an expense dated today in Lima, with empty amount", async () => {
    const { result } = renderHook(() => useTransactionForm({ onSuccess: vi.fn() }), { wrapper });

    expect(result.current.form.getValues()).toMatchObject({
      type: "expense",
      amount: "",
      date: "2026-11-15",
      categoryId: "",
    });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));
  });

  it("offers only categories of the chosen type", async () => {
    const { result } = renderHook(() => useTransactionForm({ onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.categoryOptions.map((c) => c.name)).toEqual(["Comida"]);

    act(() => result.current.changeType("income"));

    await waitFor(() =>
      expect(result.current.categoryOptions.map((c) => c.name)).toEqual(["Sueldo"]),
    );
  });

  it("clears the chosen category when the type changes", async () => {
    const { result } = renderHook(() => useTransactionForm({ onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));
    act(() => result.current.form.setValue("categoryId", FOOD_ID));

    act(() => result.current.changeType("income"));

    expect(result.current.form.getValues("categoryId")).toBe("");
  });

  it("reports when there are no accounts", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [] });
    const { result } = renderHook(() => useTransactionForm({ onSuccess: vi.fn() }), { wrapper });

    await waitFor(() => expect(result.current.hasNoAccounts).toBe(true));
  });

  it("does not call the action when the form is invalid", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTransactionForm({ onSuccess }), { wrapper });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(tx.createTransactionAction).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.amount?.message).toBeDefined();
  });

  it("creates the transaction sending the amount in cents", async () => {
    tx.createTransactionAction.mockResolvedValue({ ok: true, data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTransactionForm({ onSuccess }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    act(() => {
      result.current.form.setValue("accountId", ACCOUNT_ID);
      result.current.form.setValue("categoryId", FOOD_ID);
      result.current.form.setValue("amount", "25.50");
      result.current.form.setValue("note", "  Menú  ");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(tx.createTransactionAction).toHaveBeenCalledWith({
      type: "expense",
      accountId: ACCOUNT_ID,
      categoryId: FOOD_ID,
      amountCents: 2550,
      date: "2026-11-15",
      note: "Menú",
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("starts from the transaction values when editing and updates it", async () => {
    tx.updateTransactionAction.mockResolvedValue({ ok: true, data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useTransactionForm({ transaction: existing, onSuccess }),
      { wrapper },
    );

    expect(result.current.isEditing).toBe(true);
    expect(result.current.form.getValues()).toEqual({
      type: "expense",
      accountId: ACCOUNT_ID,
      categoryId: FOOD_ID,
      amount: "12.50",
      date: "2026-11-10",
      note: "Almuerzo",
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(tx.updateTransactionAction).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({ amountCents: 1250, date: "2026-11-10" }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("keeps an archived account and category available when editing", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [] });
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: [] });
    const { result } = renderHook(
      () => useTransactionForm({ transaction: existing, onSuccess: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.accountOptions.map((a) => a.id)).toContain(ACCOUNT_ID);
    expect(result.current.categoryOptions.map((c) => c.id)).toContain(FOOD_ID);
  });

  it("maps server field errors to the field and keeps the dialog open", async () => {
    tx.createTransactionAction.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Revisa los datos ingresados.",
        fieldErrors: { categoryId: "La categoría no es de gasto." },
      },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTransactionForm({ onSuccess }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    act(() => {
      result.current.form.setValue("accountId", ACCOUNT_ID);
      result.current.form.setValue("categoryId", FOOD_ID);
      result.current.form.setValue("amount", "5");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() =>
      expect(result.current.form.formState.errors.categoryId?.message).toBe(
        "La categoría no es de gasto.",
      ),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
