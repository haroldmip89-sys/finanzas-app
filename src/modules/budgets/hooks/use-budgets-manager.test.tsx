import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bud = vi.hoisted(() => ({
  listBudgetsAction: vi.fn(),
  createBudgetAction: vi.fn(),
  updateBudgetAction: vi.fn(),
  deleteBudgetAction: vi.fn(),
  copyBudgetsFromPreviousMonthAction: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../actions/budgets.actions", () => bud);
vi.mock("sonner", () => ({ toast: toastMock }));

import type { BudgetListItem, BudgetsOverview } from "../types/budget.types";
import { useBudgetsManager } from "./use-budgets-manager";

const item: BudgetListItem = {
  id: "99999999-9999-4999-8999-999999999999",
  categoryId: "11111111-1111-4111-8111-111111111111",
  categoryName: "Comida",
  categoryIcon: "utensils",
  amountCents: 30000,
  spentCents: 5000,
};

function overview(month: string, overrides: Partial<BudgetsOverview> = {}): BudgetsOverview {
  return {
    month,
    items: [item],
    unbudgeted: [
      { categoryId: "22222222-2222-4222-8222-222222222222", categoryName: "Ocio", categoryIcon: "gamepad", spentCents: 3500 },
    ],
    totals: { budgetedCents: 30000, spentCents: 5000, remainingCents: 25000 },
    previousMonthHasBudgets: true,
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useBudgetsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T03:00:00Z")); // still Nov 15 in Lima
    bud.listBudgetsAction.mockImplementation(async (month: string) => ({
      ok: true,
      data: overview(month),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on the current month in Lima and loads its budgets", async () => {
    const { result } = renderHook(() => useBudgetsManager(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.month).toBe("2026-11");
    expect(result.current.isCurrentMonth).toBe(true);
    expect(bud.listBudgetsAction).toHaveBeenCalledWith("2026-11");
    expect(result.current.items).toEqual([item]);
    expect(result.current.totals.remainingCents).toBe(25000);
    expect(result.current.unbudgeted.map((u) => u.categoryName)).toEqual(["Ocio"]);
    expect(result.current.budgetedCategoryIds).toEqual([item.categoryId]);
  });

  it("moves to the previous and next month and back to this month", async () => {
    const { result } = renderHook(() => useBudgetsManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.previousMonth());
    expect(result.current.month).toBe("2026-10");
    expect(result.current.isCurrentMonth).toBe(false);
    await waitFor(() => expect(bud.listBudgetsAction).toHaveBeenLastCalledWith("2026-10"));

    act(() => result.current.nextMonth());
    act(() => result.current.nextMonth());
    expect(result.current.month).toBe("2026-12");

    act(() => result.current.goToThisMonth());
    expect(result.current.month).toBe("2026-11");
    expect(result.current.isCurrentMonth).toBe(true);
  });

  it("crosses the year boundary when navigating", async () => {
    const { result } = renderHook(() => useBudgetsManager(), { wrapper });

    act(() => result.current.nextMonth());
    act(() => result.current.nextMonth());

    expect(result.current.month).toBe("2027-01");
  });

  it("exposes a safe load error", async () => {
    bud.listBudgetsAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const { result } = renderHook(() => useBudgetsManager(), { wrapper });

    await waitFor(() => expect(result.current.loadError).toBe("Ocurrió un error inesperado."));
  });

  it("opens the form to create, with a preset category, and to edit", async () => {
    const { result } = renderHook(() => useBudgetsManager(), { wrapper });

    act(() => result.current.openCreate());
    expect(result.current.formState).toEqual({ mode: "create", presetCategoryId: undefined });

    act(() => result.current.openCreate("cat-1"));
    expect(result.current.formState).toEqual({ mode: "create", presetCategoryId: "cat-1" });

    act(() => result.current.openEdit(item));
    expect(result.current.formState).toEqual({ mode: "edit", budget: item });

    act(() => result.current.closeForm());
    expect(result.current.formState).toEqual({ mode: "closed" });
  });

  describe("copy from the previous month", () => {
    it("copies, toasts the amount created and refreshes the list", async () => {
      bud.copyBudgetsFromPreviousMonthAction.mockResolvedValue({ ok: true, data: { created: 3 } });
      const { result } = renderHook(() => useBudgetsManager(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const callsBefore = bud.listBudgetsAction.mock.calls.length;

      act(() => result.current.copyPrevious());

      await waitFor(() =>
        expect(bud.copyBudgetsFromPreviousMonthAction).toHaveBeenCalledWith("2026-11"),
      );
      await waitFor(() =>
        expect(toastMock.success).toHaveBeenCalledWith("Se copiaron 3 presupuestos del mes anterior."),
      );
      await waitFor(() =>
        expect(bud.listBudgetsAction.mock.calls.length).toBeGreaterThan(callsBefore),
      );
    });

    it("uses the singular for one budget and says when nothing was new", async () => {
      bud.copyBudgetsFromPreviousMonthAction.mockResolvedValueOnce({ ok: true, data: { created: 1 } });
      const { result } = renderHook(() => useBudgetsManager(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.copyPrevious());
      await waitFor(() =>
        expect(toastMock.success).toHaveBeenCalledWith("Se copió 1 presupuesto del mes anterior."),
      );

      bud.copyBudgetsFromPreviousMonthAction.mockResolvedValueOnce({ ok: true, data: { created: 0 } });
      act(() => result.current.copyPrevious());
      await waitFor(() =>
        expect(toastMock.success).toHaveBeenCalledWith("No había nada nuevo que copiar."),
      );
    });

    it("copies into the month being viewed", async () => {
      bud.copyBudgetsFromPreviousMonthAction.mockResolvedValue({ ok: true, data: { created: 1 } });
      const { result } = renderHook(() => useBudgetsManager(), { wrapper });
      act(() => result.current.nextMonth());

      act(() => result.current.copyPrevious());

      await waitFor(() =>
        expect(bud.copyBudgetsFromPreviousMonthAction).toHaveBeenCalledWith("2026-12"),
      );
    });

    it("shows the server message when the previous month is empty", async () => {
      bud.copyBudgetsFromPreviousMonthAction.mockResolvedValue({
        ok: false,
        error: { code: "VALIDATION", message: "El mes anterior no tiene presupuestos para copiar." },
      });
      const { result } = renderHook(() => useBudgetsManager(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.copyPrevious());

      await waitFor(() =>
        expect(result.current.copyError).toBe("El mes anterior no tiene presupuestos para copiar."),
      );
      expect(toastMock.success).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes after confirmation, closes the dialog and reloads", async () => {
      bud.deleteBudgetAction.mockResolvedValue({ ok: true, data: null });
      const { result } = renderHook(() => useBudgetsManager(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const callsBefore = bud.listBudgetsAction.mock.calls.length;

      act(() => result.current.askDelete(item));
      expect(result.current.toDelete).toEqual(item);
      act(() => result.current.confirmDelete());

      await waitFor(() => expect(result.current.toDelete).toBeNull());
      expect(bud.deleteBudgetAction).toHaveBeenCalledWith(item.id);
      await waitFor(() =>
        expect(bud.listBudgetsAction.mock.calls.length).toBeGreaterThan(callsBefore),
      );
    });

    it("keeps the dialog open and shows the error when deleting fails", async () => {
      bud.deleteBudgetAction.mockResolvedValue({
        ok: false,
        error: { code: "NOT_FOUND", message: "El presupuesto no existe." },
      });
      const { result } = renderHook(() => useBudgetsManager(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.askDelete(item));
      act(() => result.current.confirmDelete());

      await waitFor(() => expect(result.current.deleteError).toBe("El presupuesto no existe."));
      expect(result.current.toDelete).toEqual(item);
    });

    it("can cancel the confirmation", async () => {
      const { result } = renderHook(() => useBudgetsManager(), { wrapper });

      act(() => result.current.askDelete(item));
      act(() => result.current.cancelDelete());

      expect(result.current.toDelete).toBeNull();
      expect(bud.deleteBudgetAction).not.toHaveBeenCalled();
    });
  });
});
