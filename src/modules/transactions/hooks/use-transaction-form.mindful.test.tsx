import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  listTransactionsAction: vi.fn(),
  createTransactionAction: vi.fn(),
  updateTransactionAction: vi.fn(),
  deleteTransactionAction: vi.fn(),
  listFrequentCategoriesAction: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const acc = vi.hoisted(() => ({ listAccountsAction: vi.fn() }));
const cat = vi.hoisted(() => ({ listCategoriesAction: vi.fn() }));
const mindful = vi.hoisted(() => ({
  getMindfulSettingsAction: vi.fn(),
  saveMindfulSettingsAction: vi.fn(),
}));
const avoided = vi.hoisted(() => ({
  getAvoidedOverviewAction: vi.fn(),
  createAvoidedPurchaseAction: vi.fn(),
  markAvoidedAction: vi.fn(),
  deleteAvoidedPurchaseAction: vi.fn(),
}));

vi.mock("../actions/transactions.actions", () => tx);
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/modules/accounts/actions/accounts.actions", () => acc);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);
vi.mock("@/modules/mindful-purchase/actions/mindful-settings.actions", () => mindful);
vi.mock("@/modules/avoided-purchases/actions/avoided-purchases.actions", () => avoided);

import { useTransactionForm } from "./use-transaction-form";

const ACCOUNT_ID = "3f1c2b4a-1b2c-4d5e-8f90-1234567890ab";
const FOOD_ID = "11111111-1111-4111-8111-111111111111";

const accounts = [
  { id: ACCOUNT_ID, name: "BBVA", type: "bank", archivedAt: null, balanceCents: 100000, includeInAvailable: true },
];
const categories = [{ id: FOOD_ID, name: "Comida", kind: "expense", icon: "utensils", archivedAt: null }];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function setup(amount: string, settings = { enabled: true, thresholdCents: 10000 }) {
  mindful.getMindfulSettingsAction.mockResolvedValue({ ok: true, data: settings });
  const onSuccess = vi.fn();
  const hook = renderHook(() => useTransactionForm({ onSuccess }), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoadingOptions).toBe(false));
  // Let the settings query settle before submitting.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  act(() => {
    hook.result.current.form.setValue("accountId", ACCOUNT_ID);
    hook.result.current.form.setValue("categoryId", FOOD_ID);
    hook.result.current.form.setValue("amount", amount);
  });
  return { ...hook, onSuccess };
}

const submit = (result: { current: ReturnType<typeof useTransactionForm> }) =>
  act(async () => {
    await result.current.onSubmit();
  });

describe("useTransactionForm · compra consciente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    acc.listAccountsAction.mockResolvedValue({ ok: true, data: accounts });
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: categories });
    tx.listFrequentCategoriesAction.mockResolvedValue({ ok: true, data: [] });
    tx.createTransactionAction.mockResolvedValue({ ok: true, data: { id: "t1" } });
    avoided.createAvoidedPurchaseAction.mockResolvedValue({ ok: true, data: { id: "p1" } });
  });

  afterEach(() => vi.useRealTimers());

  it("saves directly when the amount is below the threshold", async () => {
    const { result, onSuccess } = await setup("99.99");
    await submit(result);

    expect(result.current.mindful).toBeNull();
    expect(tx.createTransactionAction).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalled();
  });

  it("opens the step at the threshold without saving", async () => {
    const { result, onSuccess } = await setup("100.00");
    await submit(result);

    expect(result.current.mindful).not.toBeNull();
    expect(result.current.mindful?.amountCents).toBe(10000);
    expect(tx.createTransactionAction).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("registers the expense from the step, always possible", async () => {
    const { result, onSuccess } = await setup("250.00");
    await submit(result);

    await act(async () => {
      result.current.mindful?.onRegister();
    });

    await waitFor(() => expect(tx.createTransactionAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(result.current.mindful).toBeNull();
  });

  it("goes back to the form with the data intact", async () => {
    const { result } = await setup("250.00");
    await submit(result);

    act(() => result.current.mindful?.onBack());

    expect(result.current.mindful).toBeNull();
    expect(result.current.form.getValues("amount")).toBe("250.00");
    expect(tx.createTransactionAction).not.toHaveBeenCalled();
  });

  it("postpones instead of saving when the user wants to think about it", async () => {
    const { result, onSuccess } = await setup("250.00");
    await submit(result);

    await act(async () => {
      result.current.mindful?.onPause("24h", "can_wait");
    });

    await waitFor(() => expect(avoided.createAvoidedPurchaseAction).toHaveBeenCalledTimes(1));
    expect(avoided.createAvoidedPurchaseAction.mock.calls[0][0]).toMatchObject({
      amountCents: 25000,
      categoryId: FOOD_ID,
      status: "postponed",
      reason: "can_wait",
    });
    expect(tx.createTransactionAction).not.toHaveBeenCalled();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("does not ask when the feature is turned off", async () => {
    const { result } = await setup("500.00", { enabled: false, thresholdCents: 10000 });
    await submit(result);

    expect(result.current.mindful).toBeNull();
    expect(tx.createTransactionAction).toHaveBeenCalledTimes(1);
  });
});
