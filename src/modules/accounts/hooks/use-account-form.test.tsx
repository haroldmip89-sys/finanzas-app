import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  listAccountsAction: vi.fn(),
  createAccountAction: vi.fn(),
  updateAccountAction: vi.fn(),
  setAccountArchivedAction: vi.fn(),
  deleteAccountAction: vi.fn(),
}));

vi.mock("../actions/accounts.actions", () => actions);

import type { Account } from "../types/account.types";
import { useAccountForm } from "./use-account-form";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const existing: Account = {
  id: "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab",
  userId: "user_a",
  name: "BCP",
  type: "bank",
  initialBalanceCents: 15050,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("useAccountForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not call the action when the form is invalid", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAccountForm({ onSuccess }), { wrapper });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(actions.createAccountAction).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.name?.message).toBeDefined();
  });

  it("starts with an empty balance and saves it as 0", async () => {
    actions.createAccountAction.mockResolvedValue({ ok: true, data: existing });
    const { result } = renderHook(() => useAccountForm({ onSuccess: vi.fn() }), { wrapper });

    expect(result.current.form.getValues("initialBalance")).toBe("");
    act(() => result.current.form.setValue("name", "Yape"));
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(actions.createAccountAction).toHaveBeenCalledWith({
      name: "Yape",
      type: "cash",
      initialBalanceCents: 0,
    });
  });

  it("creates the account sending the balance in cents", async () => {
    actions.createAccountAction.mockResolvedValue({ ok: true, data: existing });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAccountForm({ onSuccess }), { wrapper });

    act(() => {
      result.current.form.setValue("name", "  Caja  ");
      result.current.form.setValue("initialBalance", "12.50");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(actions.createAccountAction).toHaveBeenCalledWith({
      name: "Caja",
      type: "cash",
      initialBalanceCents: 1250,
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("starts from the account values when editing and updates it", async () => {
    actions.updateAccountAction.mockResolvedValue({ ok: true, data: existing });
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useAccountForm({ account: existing, onSuccess }),
      { wrapper },
    );

    expect(result.current.isEditing).toBe(true);
    expect(result.current.form.getValues()).toEqual({
      name: "BCP",
      type: "bank",
      initialBalance: "150.50",
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(actions.updateAccountAction).toHaveBeenCalledWith(existing.id, {
      name: "BCP",
      type: "bank",
      initialBalanceCents: 15050,
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("maps a server field error to the field and keeps the dialog open", async () => {
    actions.createAccountAction.mockResolvedValue({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "Ya tienes una cuenta con ese nombre.",
        fieldErrors: { name: "Ya tienes una cuenta con ese nombre." },
      },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAccountForm({ onSuccess }), { wrapper });

    act(() => result.current.form.setValue("name", "Caja"));
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() =>
      expect(result.current.form.formState.errors.name?.message).toBe(
        "Ya tienes una cuenta con ese nombre.",
      ),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows a general error for failures without field errors", async () => {
    actions.createAccountAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const { result } = renderHook(() => useAccountForm({ onSuccess: vi.fn() }), { wrapper });

    act(() => result.current.form.setValue("name", "Caja"));
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => expect(result.current.submitError).toBe("Ocurrió un error inesperado."));
  });
});
