import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cal = vi.hoisted(() => ({ calibrateAccountAction: vi.fn() }));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const tx = vi.hoisted(() => ({ listTransactionsAction: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../actions/calibration.actions", () => cal);
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("@/modules/transactions/actions/transactions.actions", () => tx);
vi.mock("sonner", () => ({ toast: toastMock }));

import { useCalibrationForm } from "./use-calibration-form";

const BBVA = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";
const YAPE = "44444444-4444-4444-8444-444444444444";

const VISA = "55555555-5555-4555-8555-555555555555";

const accounts = [
  { id: VISA, name: "Visa", type: "card", archivedAt: null, initialBalanceCents: 0, balanceCents: -35000 },
  { id: BBVA, name: "BBVA", type: "bank", archivedAt: null, initialBalanceCents: 0, balanceCents: 82000 },
  { id: YAPE, name: "Yape", type: "wallet", archivedAt: null, initialBalanceCents: 0, balanceCents: 1500 },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useCalibrationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: accounts });
  });

  it("uses the account given by the caller and shows its current balance", async () => {
    const { result } = renderHook(() => useCalibrationForm({ accountId: BBVA, onSuccess: vi.fn() }), { wrapper });

    await waitFor(() => expect(result.current.currentBalanceCents).toBe(82000));
    expect(result.current.accountFixed).toBe(true);
    expect(result.current.selectedAccountName).toBe("BBVA");
  });

  it("lets the user pick an account when none was given", async () => {
    const { result } = renderHook(() => useCalibrationForm({ onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.accountFixed).toBe(false);
    expect(result.current.currentBalanceCents).toBeNull();

    act(() => result.current.form.setValue("accountId", YAPE));

    await waitFor(() => expect(result.current.currentBalanceCents).toBe(1500));
  });

  it("preselects the only account", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: accounts.filter((a) => a.id === BBVA) });
    const { result } = renderHook(() => useCalibrationForm({ onSuccess: vi.fn() }), { wrapper });

    await waitFor(() => expect(result.current.form.getValues("accountId")).toBe(BBVA));
  });

  it("reports when there are no accounts", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [] });
    const { result } = renderHook(() => useCalibrationForm({ onSuccess: vi.fn() }), { wrapper });

    await waitFor(() => expect(result.current.hasNoAccounts).toBe(true));
  });

  it("previews an income adjustment, an expense adjustment and a matching balance", async () => {
    const { result } = renderHook(() => useCalibrationForm({ accountId: BBVA, onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.currentBalanceCents).toBe(82000));
    expect(result.current.preview).toEqual({ kind: "none" });
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.form.setValue("realBalance", "850"));
    expect(result.current.preview).toEqual({ kind: "income", amountCents: 3000 });
    expect(result.current.canSubmit).toBe(true);

    act(() => result.current.form.setValue("realBalance", "800"));
    expect(result.current.preview).toEqual({ kind: "expense", amountCents: 2000 });
    expect(result.current.canSubmit).toBe(true);

    act(() => result.current.form.setValue("realBalance", "820.00"));
    expect(result.current.preview).toEqual({ kind: "same" });
    expect(result.current.canSubmit).toBe(false);
  });

  it("does not call the action when the form is invalid", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCalibrationForm({ accountId: BBVA, onSuccess }), { wrapper });
    await waitFor(() => expect(result.current.currentBalanceCents).toBe(82000));

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(cal.calibrateAccountAction).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.realBalance?.message).toBeDefined();
  });

  it("sends the real balance in signed cents, shows a toast and closes", async () => {
    cal.calibrateAccountAction.mockResolvedValue({
      ok: true,
      data: {
        transactionId: "t1",
        accountName: "BBVA",
        previousBalanceCents: 82000,
        newBalanceCents: 85000,
        differenceCents: 3000,
      },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCalibrationForm({ accountId: BBVA, onSuccess }), { wrapper });
    await waitFor(() => expect(result.current.currentBalanceCents).toBe(82000));

    act(() => result.current.form.setValue("realBalance", "850"));
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(cal.calibrateAccountAction).toHaveBeenCalledWith({ accountId: BBVA, realBalanceCents: 85000 });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/Saldo calibrado · BBVA: S\/\s850\.00/));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("accepts a negative real balance (debt)", async () => {
    cal.calibrateAccountAction.mockResolvedValue({
      ok: true,
      data: { transactionId: "t", accountName: "BBVA", previousBalanceCents: 82000, newBalanceCents: -15000, differenceCents: -97000 },
    });
    const { result } = renderHook(() => useCalibrationForm({ accountId: BBVA, onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.currentBalanceCents).toBe(82000));

    act(() => result.current.form.setValue("realBalance", "-150"));
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(cal.calibrateAccountAction).toHaveBeenCalledWith({ accountId: BBVA, realBalanceCents: -15000 });
  });

  it("maps a server field error to the field and does not close or toast", async () => {
    cal.calibrateAccountAction.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "El saldo ya coincide, no hay nada que ajustar.",
        fieldErrors: { realBalance: "El saldo ya coincide, no hay nada que ajustar." },
      },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCalibrationForm({ accountId: BBVA, onSuccess }), { wrapper });
    await waitFor(() => expect(result.current.currentBalanceCents).toBe(82000));

    act(() => result.current.form.setValue("realBalance", "850"));
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() =>
      expect(result.current.form.formState.errors.realBalance?.message).toMatch(/ya coincide/),
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("shows a general error for failures without field errors", async () => {
    cal.calibrateAccountAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const { result } = renderHook(() => useCalibrationForm({ accountId: BBVA, onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.currentBalanceCents).toBe(82000));

    act(() => result.current.form.setValue("realBalance", "850"));
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() => expect(result.current.submitError).toBe("Ocurrió un error inesperado."));
  });

  describe("credit cards (debt typed in positive)", () => {
    it("marks a card and previews in terms of debt", async () => {
      const { result } = renderHook(() => useCalibrationForm({ accountId: VISA, onSuccess: vi.fn() }), { wrapper });
      await waitFor(() => expect(result.current.currentBalanceCents).toBe(-35000));

      expect(result.current.isCard).toBe(true);

      act(() => result.current.form.setValue("realBalance", "300"));
      expect(result.current.preview).toEqual({ kind: "income", amountCents: 5000 });

      act(() => result.current.form.setValue("realBalance", "400"));
      expect(result.current.preview).toEqual({ kind: "expense", amountCents: 5000 });

      act(() => result.current.form.setValue("realBalance", "350"));
      expect(result.current.preview).toEqual({ kind: "same" });
      expect(result.current.canSubmit).toBe(false);
    });

    it("sends the debt as a negative balance and toasts about the debt", async () => {
      cal.calibrateAccountAction.mockResolvedValue({
        ok: true,
        data: { transactionId: "t", accountName: "Visa", previousBalanceCents: -35000, newBalanceCents: -30000, differenceCents: 5000 },
      });
      const { result } = renderHook(() => useCalibrationForm({ accountId: VISA, onSuccess: vi.fn() }), { wrapper });
      await waitFor(() => expect(result.current.currentBalanceCents).toBe(-35000));

      act(() => result.current.form.setValue("realBalance", "300"));
      await act(async () => {
        await result.current.onSubmit();
      });

      expect(cal.calibrateAccountAction).toHaveBeenCalledWith({ accountId: VISA, realBalanceCents: -30000 });
      expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/Deuda calibrada · Visa: S\/\s300\.00/));
    });

    it("does not treat a bank account as a card", async () => {
      const { result } = renderHook(() => useCalibrationForm({ accountId: BBVA, onSuccess: vi.fn() }), { wrapper });
      await waitFor(() => expect(result.current.currentBalanceCents).toBe(82000));

      expect(result.current.isCard).toBe(false);
    });
  });
});
