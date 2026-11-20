import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ getMindfulSettingsAction: vi.fn(), saveMindfulSettingsAction: vi.fn() }));
const av = vi.hoisted(() => ({
  listAvoidedAction: vi.fn(),
  listDueRemindersAction: vi.fn(),
  createAvoidedAction: vi.fn(),
  updateAvoidedAction: vi.fn(),
  setAvoidedStatusAction: vi.fn(),
  deleteAvoidedAction: vi.fn(),
  dismissAvoidedReminderAction: vi.fn(),
}));
const quick = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("../actions/settings.actions", () => settings);
vi.mock("@/modules/avoided-purchases/actions/avoided.actions", () => av);
vi.mock("@/modules/quick-add/hooks/use-quick-add", () => ({ useQuickAdd: () => quick }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ReminderCard } from "./reminder-card";

const CATEGORY = "11111111-1111-4111-8111-111111111111";

const due = (overrides: Record<string, unknown> = {}) => ({
  id: "99999999-9999-4999-8999-999999999999",
  amountCents: 8990,
  date: "2026-11-14",
  categoryId: CATEGORY,
  categoryName: "Ropa",
  categoryIcon: "shirt",
  reason: null,
  note: "Zapatillas",
  status: "postponed",
  remindAt: new Date("2026-11-15T10:00:00Z"),
  ...overrides,
});

function ok<T>(data: T) {
  return { ok: true as const, data };
}

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReminderCard />
    </QueryClientProvider>,
  );
}

describe("ReminderCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settings.getMindfulSettingsAction.mockResolvedValue(ok({ enabled: true, thresholdCents: 10000, pauseMinutes: 1440 }));
    av.listDueRemindersAction.mockResolvedValue(ok([due()]));
  });

  it("asks calmly about a purchase whose pause is over", async () => {
    renderCard();

    expect(await screen.findByText("Lo que estabas pensando comprar")).toBeInTheDocument();
    expect(screen.getByText(/Pensabas comprar/)).toHaveTextContent(/Zapatillas \(S\/\s89\.90\)\. ¿Sigues queriéndola\?/);
  });

  it("falls back to the category when there is no note", async () => {
    av.listDueRemindersAction.mockResolvedValue(ok([due({ note: null })]));
    renderCard();

    expect(await screen.findByText(/Pensabas comprar/)).toHaveTextContent(/Ropa/);
  });

  it("shows nothing when nothing is due", async () => {
    av.listDueRemindersAction.mockResolvedValue(ok([]));
    renderCard();
    await waitFor(() => expect(av.listDueRemindersAction).toHaveBeenCalled());

    expect(screen.queryByText("Lo que estabas pensando comprar")).not.toBeInTheDocument();
  });

  it("shows nothing and does not even ask when the feature is turned off", async () => {
    settings.getMindfulSettingsAction.mockResolvedValue(ok({ enabled: false, thresholdCents: 10000, pauseMinutes: 1440 }));
    renderCard();
    await waitFor(() => expect(settings.getMindfulSettingsAction).toHaveBeenCalled());

    expect(screen.queryByText("Lo que estabas pensando comprar")).not.toBeInTheDocument();
    expect(av.listDueRemindersAction).not.toHaveBeenCalled();
  });

  it("'Sí, la compraré' removes the postponed purchase and opens the expense form prefilled", async () => {
    av.deleteAvoidedAction.mockResolvedValue(ok(null));
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Sí, la compraré" }));

    await waitFor(() => expect(av.deleteAvoidedAction).toHaveBeenCalledWith(due().id));
    await waitFor(() =>
      expect(quick.open).toHaveBeenCalledWith("expense", { prefill: { amountCents: 8990, categoryId: CATEGORY } }),
    );
  });

  it("'Ya no la quiero' turns it into an avoided purchase", async () => {
    av.setAvoidedStatusAction.mockResolvedValue(ok({}));
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Ya no la quiero" }));

    await waitFor(() => expect(av.setAvoidedStatusAction).toHaveBeenCalledWith(due().id, "avoided"));
  });

  it("'Más tarde' only stops the reminder", async () => {
    av.dismissAvoidedReminderAction.mockResolvedValue(ok({}));
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Más tarde" }));

    await waitFor(() => expect(av.dismissAvoidedReminderAction).toHaveBeenCalledWith(due().id));
    expect(av.deleteAvoidedAction).not.toHaveBeenCalled();
    expect(av.setAvoidedStatusAction).not.toHaveBeenCalled();
  });

  it("shows several reminders, one card each", async () => {
    av.listDueRemindersAction.mockResolvedValue(
      ok([due(), due({ id: "88888888-8888-4888-8888-888888888888", note: "Audífonos" })]),
    );
    renderCard();

    expect(await screen.findAllByRole("button", { name: "Sí, la compraré" })).toHaveLength(2);
  });
});
