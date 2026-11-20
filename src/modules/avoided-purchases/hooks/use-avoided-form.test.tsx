import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const av = vi.hoisted(() => ({
  listAvoidedAction: vi.fn(),
  createAvoidedAction: vi.fn(),
  updateAvoidedAction: vi.fn(),
  setAvoidedStatusAction: vi.fn(),
  deleteAvoidedAction: vi.fn(),
}));
const cat = vi.hoisted(() => ({ listCategoriesAction: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../actions/avoided.actions", () => av);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);
vi.mock("sonner", () => ({ toast: toastMock }));

import type { AvoidedItem } from "../types/avoided.types";
import { NONE, useAvoidedForm } from "./use-avoided-form";

const CLOTHES = "11111111-1111-4111-8111-111111111111";
const categories = [
  { id: CLOTHES, name: "Ropa", kind: "expense", icon: "shirt", archivedAt: null, systemKey: null },
  { id: "22222222-2222-4222-8222-222222222222", name: "Sueldo", kind: "income", icon: "wallet", archivedAt: null, systemKey: null },
  { id: "33333333-3333-4333-8333-333333333333", name: "Ajuste", kind: "expense", icon: "scale", archivedAt: null, systemKey: "adjustment_expense" },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const existing: AvoidedItem = {
  id: "99999999-9999-4999-8999-999999999999",
  amountCents: 8990,
  date: "2026-11-10",
  categoryId: CLOTHES,
  categoryName: "Ropa",
  categoryIcon: "shirt",
  reason: "can_wait",
  note: "Zapatillas",
  status: "postponed",
  remindAt: null,
};

describe("useAvoidedForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: categories });
  });

  it("starts empty, avoided and dated today", () => {
    const { result } = renderHook(() => useAvoidedForm({ onSuccess: vi.fn() }), { wrapper });

    expect(result.current.form.getValues()).toEqual({
      amount: "",
      date: "2026-11-15",
      categoryId: "",
      reason: "",
      note: "",
      status: "avoided",
    });
    expect(result.current.isEditing).toBe(false);
  });

  it("offers 'none' plus only the active expense categories", async () => {
    const { result } = renderHook(() => useAvoidedForm({ onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.categoryOptions).toEqual([
      { id: NONE, name: "Sin categoría" },
      { id: CLOTHES, name: "Ropa" },
    ]);
    expect(result.current.reasonOptions[0]).toEqual({ id: NONE, name: "Sin motivo" });
    expect(result.current.reasonOptions).toHaveLength(5);
  });

  it("does not submit without an amount", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAvoidedForm({ onSuccess }), { wrapper });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(av.createAvoidedAction).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.amount?.message).toBeDefined();
  });

  it("creates with only the amount, in cents, and toasts without claiming savings", async () => {
    av.createAvoidedAction.mockResolvedValue({ ok: true, data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAvoidedForm({ onSuccess }), { wrapper });

    act(() => result.current.form.setValue("amount", "89.90"));
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(av.createAvoidedAction).toHaveBeenCalledWith({
      amountCents: 8990,
      date: "2026-11-15",
      categoryId: null,
      reason: null,
      note: null,
      status: "avoided",
    });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/Compra evitada registrada · S\/\s89\.90/));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("sends the optional fields and the postponed status", async () => {
    av.createAvoidedAction.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useAvoidedForm({ onSuccess: vi.fn() }), { wrapper });

    act(() => {
      result.current.form.setValue("amount", "40");
      result.current.form.setValue("categoryId", CLOTHES);
      result.current.form.setValue("reason", "out_of_budget");
      result.current.form.setValue("note", "Campera");
      result.current.form.setValue("status", "postponed");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(av.createAvoidedAction).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: CLOTHES, reason: "out_of_budget", note: "Campera", status: "postponed" }),
    );
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/Compra pospuesta registrada/));
  });

  it("starts from the purchase values when editing and updates it", async () => {
    av.updateAvoidedAction.mockResolvedValue({ ok: true, data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAvoidedForm({ item: existing, onSuccess }), { wrapper });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.form.getValues()).toMatchObject({
      amount: "89.90",
      categoryId: CLOTHES,
      reason: "can_wait",
      note: "Zapatillas",
      status: "postponed",
    });

    act(() => result.current.form.setValue("amount", "100"));
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(av.updateAvoidedAction).toHaveBeenCalledWith(existing.id, expect.objectContaining({ amountCents: 10000 }));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("keeps an archived category of the purchase among the options when editing", async () => {
    const archived = { ...existing, categoryId: "44444444-4444-4444-8444-444444444444", categoryName: "Vieja" };
    const { result } = renderHook(() => useAvoidedForm({ item: archived, onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.categoryOptions.map((c) => c.name)).toContain("Vieja");
  });

  it("maps a server field error to the field and keeps the dialog open", async () => {
    av.createAvoidedAction.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Revisa los datos ingresados.",
        fieldErrors: { date: "La fecha no puede ser futura." },
      },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAvoidedForm({ onSuccess }), { wrapper });

    act(() => result.current.form.setValue("amount", "10"));
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() =>
      expect(result.current.form.formState.errors.date?.message).toBe("La fecha no puede ser futura."),
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });
});
