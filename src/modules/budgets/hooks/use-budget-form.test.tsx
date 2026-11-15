import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const bud = vi.hoisted(() => ({
  listBudgetsAction: vi.fn(),
  createBudgetAction: vi.fn(),
  updateBudgetAction: vi.fn(),
  deleteBudgetAction: vi.fn(),
  copyBudgetsFromPreviousMonthAction: vi.fn(),
}));
const cat = vi.hoisted(() => ({ listCategoriesAction: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../actions/budgets.actions", () => bud);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);
vi.mock("sonner", () => ({ toast: toastMock }));

import type { BudgetListItem } from "../types/budget.types";
import { useBudgetForm } from "./use-budget-form";

const FOOD = "11111111-1111-4111-8111-111111111111";
const FUN = "22222222-2222-4222-8222-222222222222";
const SALARY = "33333333-3333-4333-8333-333333333333";

const categories = [
  { id: FOOD, name: "Comida", kind: "expense", icon: "utensils", archivedAt: null, systemKey: null },
  { id: FUN, name: "Ocio", kind: "expense", icon: "gamepad", archivedAt: null, systemKey: null },
  { id: SALARY, name: "Sueldo", kind: "income", icon: "wallet", archivedAt: null, systemKey: null },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const existing: BudgetListItem = {
  id: "99999999-9999-4999-8999-999999999999",
  categoryId: FOOD,
  categoryName: "Comida",
  categoryIcon: "utensils",
  amountCents: 30000,
  spentCents: 5000,
};

describe("useBudgetForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: categories });
  });

  it("offers only expense categories", async () => {
    const { result } = renderHook(
      () => useBudgetForm({ month: "2026-11", budgetedCategoryIds: [], onSuccess: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.categoryOptions.map((c) => c.name)).toEqual(["Comida", "Ocio"]);
  });

  it("does not offer categories that already have a budget this month", async () => {
    const { result } = renderHook(
      () => useBudgetForm({ month: "2026-11", budgetedCategoryIds: [FOOD], onSuccess: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.categoryOptions.map((c) => c.name)).toEqual(["Ocio"]);
  });

  it("reports when every expense category already has a budget", async () => {
    const { result } = renderHook(
      () => useBudgetForm({ month: "2026-11", budgetedCategoryIds: [FOOD, FUN], onSuccess: vi.fn() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allBudgeted).toBe(true));
  });

  it("preselects the preset category when it is offered", async () => {
    const { result } = renderHook(
      () =>
        useBudgetForm({
          month: "2026-11",
          presetCategoryId: FUN,
          budgetedCategoryIds: [],
          onSuccess: vi.fn(),
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    await waitFor(() => expect(result.current.form.getValues("categoryId")).toBe(FUN));
  });

  it("ignores a preset category that already has a budget or is not an expense", async () => {
    const budgeted = renderHook(
      () =>
        useBudgetForm({
          month: "2026-11",
          presetCategoryId: FOOD,
          budgetedCategoryIds: [FOOD],
          onSuccess: vi.fn(),
        }),
      { wrapper },
    );
    const income = renderHook(
      () =>
        useBudgetForm({
          month: "2026-11",
          presetCategoryId: SALARY,
          budgetedCategoryIds: [],
          onSuccess: vi.fn(),
        }),
      { wrapper },
    );
    await waitFor(() => expect(budgeted.result.current.isLoadingOptions).toBe(false));
    await waitFor(() => expect(income.result.current.isLoadingOptions).toBe(false));

    expect(budgeted.result.current.form.getValues("categoryId")).toBe("");
    expect(income.result.current.form.getValues("categoryId")).toBe("");
  });

  it("does not override a category the user already picked", async () => {
    const { result } = renderHook(
      () =>
        useBudgetForm({
          month: "2026-11",
          presetCategoryId: FUN,
          budgetedCategoryIds: [],
          onSuccess: vi.fn(),
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.form.getValues("categoryId")).toBe(FUN));

    act(() => result.current.form.setValue("categoryId", FOOD));

    expect(result.current.form.getValues("categoryId")).toBe(FOOD);
  });

  it("does not call the action when the form is invalid", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useBudgetForm({ month: "2026-11", budgetedCategoryIds: [], onSuccess }),
      { wrapper },
    );

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(bud.createBudgetAction).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.categoryId?.message).toBeDefined();
    expect(result.current.form.formState.errors.amount?.message).toBeDefined();
  });

  it("creates the budget for the month in cents, toasts and closes", async () => {
    bud.createBudgetAction.mockResolvedValue({ ok: true, data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useBudgetForm({ month: "2026-11", budgetedCategoryIds: [], onSuccess }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    act(() => {
      result.current.form.setValue("categoryId", FOOD);
      result.current.form.setValue("amount", "300.50");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(bud.createBudgetAction).toHaveBeenCalledWith({
      categoryId: FOOD,
      month: "2026-11",
      amountCents: 30050,
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringMatching(/Presupuesto guardado · Comida: S\/\s300\.50/),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("starts from the budget values when editing and sends only the amount", async () => {
    bud.updateBudgetAction.mockResolvedValue({ ok: true, data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () =>
        useBudgetForm({
          month: "2026-11",
          budget: existing,
          budgetedCategoryIds: [FOOD],
          onSuccess,
        }),
      { wrapper },
    );

    expect(result.current.isEditing).toBe(true);
    expect(result.current.categoryName).toBe("Comida");
    expect(result.current.form.getValues()).toEqual({ categoryId: FOOD, amount: "300.00" });
    expect(result.current.allBudgeted).toBe(false);

    act(() => result.current.form.setValue("amount", "450"));
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(bud.updateBudgetAction).toHaveBeenCalledWith(existing.id, { amountCents: 45000 });
    expect(bud.createBudgetAction).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it("maps a server field error to the field and keeps the dialog open", async () => {
    bud.createBudgetAction.mockResolvedValue({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Ya hay un presupuesto para esta categoría en este mes.",
        fieldErrors: { categoryId: "Ya hay un presupuesto para esta categoría en este mes." },
      },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useBudgetForm({ month: "2026-11", budgetedCategoryIds: [], onSuccess }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    act(() => {
      result.current.form.setValue("categoryId", FOOD);
      result.current.form.setValue("amount", "100");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() =>
      expect(result.current.form.formState.errors.categoryId?.message).toMatch(/Ya hay un presupuesto/),
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("shows a general error for failures without field errors", async () => {
    bud.createBudgetAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const { result } = renderHook(
      () => useBudgetForm({ month: "2026-11", budgetedCategoryIds: [], onSuccess: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    act(() => {
      result.current.form.setValue("categoryId", FOOD);
      result.current.form.setValue("amount", "100");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => expect(result.current.submitError).toBe("Ocurrió un error inesperado."));
  });
});
