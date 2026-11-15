import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Category } from "../types/category.types";

const actions = vi.hoisted(() => ({
  listCategoriesAction: vi.fn(),
  createCategoryAction: vi.fn(),
  updateCategoryAction: vi.fn(),
  setCategoryArchivedAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
}));

vi.mock("../actions/categories.actions", () => actions);

import { useCategoriesManager } from "./use-categories-manager";

function make(partial: Partial<Category>): Category {
  return {
    id: "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab",
    userId: "user_a",
    name: "X",
    kind: "expense",
    icon: "tag",
    color: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

const food = make({ id: "11111111-1111-4111-8111-111111111111", name: "Comida" });
const salary = make({
  id: "22222222-2222-4222-8222-222222222222",
  name: "Sueldo",
  kind: "income",
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useCategoriesManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.listCategoriesAction.mockResolvedValue({ ok: true, data: [food, salary] });
  });

  it("shows expense categories first and switches by kind", async () => {
    const { result } = renderHook(() => useCategoriesManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.kind).toBe("expense");
    expect(result.current.categories.map((c) => c.name)).toEqual(["Comida"]);

    act(() => result.current.setKind("income"));

    expect(result.current.categories.map((c) => c.name)).toEqual(["Sueldo"]);
  });

  it("exposes a safe load error", async () => {
    actions.listCategoriesAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const { result } = renderHook(() => useCategoriesManager(), { wrapper });

    await waitFor(() => expect(result.current.loadError).toBe("Ocurrió un error inesperado."));
  });

  it("keeps the dialog open and shows the error when the category is in use", async () => {
    actions.deleteCategoryAction.mockResolvedValue({
      ok: false,
      error: { code: "IN_USE", message: "Tiene transacciones. Archívala." },
    });
    const { result } = renderHook(() => useCategoriesManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.askDelete(food));
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(result.current.deleteError).toBe("Tiene transacciones. Archívala."));
    expect(result.current.toDelete).toEqual(food);
  });

  it("deletes after confirmation and closes the dialog", async () => {
    actions.deleteCategoryAction.mockResolvedValue({ ok: true, data: null });
    const { result } = renderHook(() => useCategoriesManager(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.askDelete(food));
    act(() => result.current.confirmDelete());

    await waitFor(() => expect(result.current.toDelete).toBeNull());
    expect(actions.deleteCategoryAction).toHaveBeenCalledWith(food.id);
  });
});
