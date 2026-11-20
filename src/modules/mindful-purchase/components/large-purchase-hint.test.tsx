import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ getMindfulSettingsAction: vi.fn(), saveMindfulSettingsAction: vi.fn() }));
const av = vi.hoisted(() => ({
  listAvoidedAction: vi.fn(),
  createAvoidedAction: vi.fn(),
  updateAvoidedAction: vi.fn(),
  setAvoidedStatusAction: vi.fn(),
  deleteAvoidedAction: vi.fn(),
}));
vi.mock("../actions/settings.actions", () => settings);
vi.mock("@/modules/avoided-purchases/actions/avoided.actions", () => av);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LargePurchaseHint } from "./large-purchase-hint";

function ok<T>(data: T) {
  return { ok: true as const, data };
}

function renderHint(props: Partial<{ amount: string; categoryId: string; note: string }> = {}, onDone = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (extra: ReactNode = null) => (
    <QueryClientProvider client={client}>
      <LargePurchaseHint amount="150" categoryId="" note="" onDone={onDone} {...props} />
      {extra}
    </QueryClientProvider>
  );
  return { ...render(tree()), onDone, client };
}

describe("LargePurchaseHint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
    settings.getMindfulSettingsAction.mockResolvedValue(ok({ enabled: true, thresholdCents: 10000, pauseMinutes: 1440 }));
    av.createAvoidedAction.mockResolvedValue(ok({}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a soft hint above the threshold", async () => {
    renderHint({ amount: "150" });

    expect(await screen.findByText("Es una compra grande para ti. ¿Quieres pensarla?")).toBeInTheDocument();
  });

  it("shows it at exactly the threshold and not below it", async () => {
    const exact = renderHint({ amount: "100" });
    expect(await screen.findByRole("note")).toBeInTheDocument();
    exact.unmount();

    renderHint({ amount: "99.99" });
    await waitFor(() => expect(settings.getMindfulSettingsAction).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("does not show while the amount is empty or invalid", async () => {
    renderHint({ amount: "" });
    await waitFor(() => expect(settings.getMindfulSettingsAction).toHaveBeenCalled());

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("does not show when the feature is turned off", async () => {
    settings.getMindfulSettingsAction.mockResolvedValue(ok({ enabled: false, thresholdCents: 10000, pauseMinutes: 1440 }));
    renderHint({ amount: "500" });
    await waitFor(() => expect(settings.getMindfulSettingsAction).toHaveBeenCalled());

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("respects the user's own threshold", async () => {
    settings.getMindfulSettingsAction.mockResolvedValue(ok({ enabled: true, thresholdCents: 50000, pauseMinutes: 1440 }));
    renderHint({ amount: "200" });
    await waitFor(() => expect(settings.getMindfulSettingsAction).toHaveBeenCalled());

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("can be closed", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHint();

    await user.click(await screen.findByRole("button", { name: "Cerrar aviso" }));

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("'Pensarlo' postpones the purchase with the default pause and closes the form", async () => {
    settings.getMindfulSettingsAction.mockResolvedValue(ok({ enabled: true, thresholdCents: 10000, pauseMinutes: 10 }));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onDone } = renderHint({
      amount: "150.50",
      categoryId: "11111111-1111-4111-8111-111111111111",
      note: "  Zapatillas  ",
    });

    await user.click(await screen.findByRole("button", { name: "Pensarlo" }));

    await waitFor(() =>
      expect(av.createAvoidedAction).toHaveBeenCalledWith({
        amountCents: 15050,
        date: "2026-11-15",
        categoryId: "11111111-1111-4111-8111-111111111111",
        note: "Zapatillas",
        status: "postponed",
        remindInMinutes: 10,
      }),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("cuts a long note to what the avoided purchase accepts", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderHint({ note: "x".repeat(200) });

    await user.click(await screen.findByRole("button", { name: "Pensarlo" }));

    await waitFor(() =>
      expect(av.createAvoidedAction).toHaveBeenCalledWith(expect.objectContaining({ note: "x".repeat(120) })),
    );
  });
});
