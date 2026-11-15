import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tr = vi.hoisted(() => ({
  listTransfersAction: vi.fn(),
  createTransferAction: vi.fn(),
  updateTransferAction: vi.fn(),
  deleteTransferAction: vi.fn(),
}));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../actions/transfers.actions", () => tr);
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);

import type { TransferListItem } from "../types/transfer.types";
import { useTransferForm } from "./use-transfer-form";

const BBVA = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";
const YAPE = "11111111-1111-4111-8111-111111111111";

const accounts = [
  { id: BBVA, name: "BBVA", type: "bank", archivedAt: null, balanceCents: 0 },
  { id: YAPE, name: "Yape", type: "wallet", archivedAt: null, balanceCents: 0 },
];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const existing: TransferListItem = {
  id: "99999999-9999-4999-8999-999999999999",
  fromAccountId: BBVA,
  fromAccountName: "BBVA",
  toAccountId: YAPE,
  toAccountName: "Yape",
  amountCents: 20000,
  date: "2026-11-10",
  note: "Ahorro",
};

describe("useTransferForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T03:00:00Z")); // still Nov 15 in Lima
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: accounts });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts empty with today's date in Lima", async () => {
    const { result } = renderHook(() => useTransferForm({ onSuccess: vi.fn() }), { wrapper });

    expect(result.current.form.getValues()).toEqual({
      fromAccountId: "",
      toAccountId: "",
      amount: "",
      date: "2026-11-15",
      note: "",
    });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));
  });

  it("excludes the chosen origin from the destination options", async () => {
    const { result } = renderHook(() => useTransferForm({ onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));
    expect(result.current.toOptions.map((a) => a.name)).toEqual(["BBVA", "Yape"]);

    act(() => result.current.changeFrom(BBVA));

    await waitFor(() =>
      expect(result.current.toOptions.map((a) => a.name)).toEqual(["Yape"]),
    );
  });

  it("clears the destination when the new origin equals it", async () => {
    const { result } = renderHook(() => useTransferForm({ onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));
    act(() => {
      result.current.changeFrom(BBVA);
      result.current.form.setValue("toAccountId", YAPE);
    });

    act(() => result.current.changeFrom(YAPE));

    expect(result.current.form.getValues("toAccountId")).toBe("");
    expect(result.current.form.getValues("fromAccountId")).toBe(YAPE);
  });

  it("asks for more accounts when fewer than two are active", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [accounts[0]] });
    const { result } = renderHook(() => useTransferForm({ onSuccess: vi.fn() }), { wrapper });

    await waitFor(() => expect(result.current.needsMoreAccounts).toBe(true));
  });

  it("does not call the action when the form is invalid", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTransferForm({ onSuccess }), { wrapper });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(tr.createTransferAction).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.amount?.message).toBeDefined();
  });

  it("creates the transfer sending the amount in cents", async () => {
    tr.createTransferAction.mockResolvedValue({ ok: true, data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTransferForm({ onSuccess }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    act(() => {
      result.current.changeFrom(BBVA);
      result.current.form.setValue("toAccountId", YAPE);
      result.current.form.setValue("amount", "150.50");
      result.current.form.setValue("note", "  Para Yape ");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(tr.createTransferAction).toHaveBeenCalledWith({
      fromAccountId: BBVA,
      toAccountId: YAPE,
      amountCents: 15050,
      date: "2026-11-15",
      note: "Para Yape",
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringMatching(/Transferencia guardada · S\/\s150\.50/),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("rejects equal accounts without calling the action", async () => {
    const { result } = renderHook(() => useTransferForm({ onSuccess: vi.fn() }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    act(() => {
      result.current.changeFrom(BBVA);
      result.current.form.setValue("toAccountId", BBVA);
      result.current.form.setValue("amount", "10");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(tr.createTransferAction).not.toHaveBeenCalled();
    expect(result.current.form.formState.errors.toAccountId?.message).toBeDefined();
  });

  it("starts from the transfer values when editing and updates it", async () => {
    tr.updateTransferAction.mockResolvedValue({ ok: true, data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTransferForm({ transfer: existing, onSuccess }), {
      wrapper,
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.form.getValues()).toEqual({
      fromAccountId: BBVA,
      toAccountId: YAPE,
      amount: "200.00",
      date: "2026-11-10",
      note: "Ahorro",
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(tr.updateTransferAction).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({ amountCents: 20000 }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("keeps archived accounts available when editing", async () => {
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: [] });
    const { result } = renderHook(
      () => useTransferForm({ transfer: existing, onSuccess: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.fromOptions.map((a) => a.id)).toContain(BBVA);
    expect(result.current.toOptions.map((a) => a.id)).toContain(YAPE);
    expect(result.current.needsMoreAccounts).toBe(false);
  });

  it("maps server field errors to the field and keeps the dialog open", async () => {
    tr.createTransferAction.mockResolvedValue({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Revisa los datos ingresados.",
        fieldErrors: { toAccountId: "La cuenta de destino está archivada." },
      },
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTransferForm({ onSuccess }), { wrapper });
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    act(() => {
      result.current.changeFrom(BBVA);
      result.current.form.setValue("toAccountId", YAPE);
      result.current.form.setValue("amount", "5");
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    await waitFor(() =>
      expect(result.current.form.formState.errors.toAccountId?.message).toBe(
        "La cuenta de destino está archivada.",
      ),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  describe("paying a credit card", () => {
    const VISA = "66666666-6666-4666-8666-666666666666";
    const withCard = (visaBalance = -35000) => [
      ...accounts,
      { id: VISA, name: "Visa", type: "card", archivedAt: null, balanceCents: visaBalance },
    ];

    it("fixes the card as the destination and offers only liquid accounts as origin", async () => {
      acc.listAccountsAction.mockResolvedValue({ ok: true, data: withCard() });
      const { result } = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess: vi.fn() }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

      expect(result.current.isPayingCard).toBe(true);
      expect(result.current.destinationName).toBe("Visa");
      expect(result.current.form.getValues("toAccountId")).toBe(VISA);
      expect(result.current.toOptions.map((a) => a.name)).toEqual(["Visa"]);
      expect(result.current.fromOptions.map((a) => a.name)).toEqual(["BBVA", "Yape"]);
    });

    it("suggests the whole debt as the amount", async () => {
      acc.listAccountsAction.mockResolvedValue({ ok: true, data: withCard(-35050) });
      const { result } = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess: vi.fn() }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.form.getValues("amount")).toBe("350.50"));
    });

    it("suggests nothing when the card has no debt or credit in its favor", async () => {
      acc.listAccountsAction.mockResolvedValue({ ok: true, data: withCard(0) });
      const { result } = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess: vi.fn() }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

      expect(result.current.form.getValues("amount")).toBe("");

      acc.listAccountsAction.mockResolvedValue({ ok: true, data: withCard(5000) });
      const second = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess: vi.fn() }),
        { wrapper },
      );
      await waitFor(() => expect(second.result.current.isLoadingOptions).toBe(false));

      expect(second.result.current.form.getValues("amount")).toBe("");
    });

    it("keeps the amount editable and does not override it later", async () => {
      acc.listAccountsAction.mockResolvedValue({ ok: true, data: withCard(-35000) });
      const { result } = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess: vi.fn() }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.form.getValues("amount")).toBe("350.00"));

      act(() => result.current.form.setValue("amount", "100"));

      expect(result.current.form.getValues("amount")).toBe("100");
    });

    it("asks for a liquid account when there is none", async () => {
      acc.listAccountsAction.mockResolvedValue({
        ok: true,
        data: [{ id: VISA, name: "Visa", type: "card", archivedAt: null, balanceCents: -100 }],
      });
      const { result } = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess: vi.fn() }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.needsMoreAccounts).toBe(true));
      expect(result.current.isPayingCard).toBe(true);
    });

    it("reports an unavailable card (missing or archived)", async () => {
      acc.listAccountsAction.mockResolvedValue({ ok: true, data: accounts });
      const { result } = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess: vi.fn() }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.cardUnavailable).toBe(true));
    });

    it("needs only one liquid account, not two", async () => {
      acc.listAccountsAction.mockResolvedValue({
        ok: true,
        data: [accounts[0], { id: VISA, name: "Visa", type: "card", archivedAt: null, balanceCents: -100 }],
      });
      const { result } = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess: vi.fn() }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

      expect(result.current.needsMoreAccounts).toBe(false);
    });

    it("sends the payment to the card and toasts it as a card payment", async () => {
      tr.createTransferAction.mockResolvedValue({ ok: true, data: {} });
      acc.listAccountsAction.mockResolvedValue({ ok: true, data: withCard(-35000) });
      const onSuccess = vi.fn();
      const { result } = renderHook(
        () => useTransferForm({ payCardId: VISA, onSuccess }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.form.getValues("amount")).toBe("350.00"));

      act(() => result.current.changeFrom(BBVA));
      await act(async () => {
        await result.current.onSubmit();
      });

      expect(tr.createTransferAction).toHaveBeenCalledWith({
        fromAccountId: BBVA,
        toAccountId: VISA,
        amountCents: 35000,
        date: "2026-11-15",
        note: null,
      });
      expect(toastMock.success).toHaveBeenCalledWith(
        expect.stringMatching(/Pago de tarjeta guardado · S\/\s350\.00/),
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    it("does not change the normal transfer behavior", async () => {
      const { result } = renderHook(() => useTransferForm({ onSuccess: vi.fn() }), { wrapper });
      await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

      expect(result.current.isPayingCard).toBe(false);
      expect(result.current.fromOptions.map((a) => a.name)).toEqual(["BBVA", "Yape"]);
    });
  });
});
