import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const av = vi.hoisted(() => ({
  listAvoidedAction: vi.fn(),
  createAvoidedAction: vi.fn(),
  updateAvoidedAction: vi.fn(),
  setAvoidedStatusAction: vi.fn(),
  deleteAvoidedAction: vi.fn(),
}));
const cat = vi.hoisted(() => ({ listCategoriesAction: vi.fn() }));
vi.mock("../actions/avoided.actions", () => av);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AvoidedSummaryCard } from "./avoided-summary-card";

const overview = (overrides: Record<string, unknown> = {}) => ({
  ok: true as const,
  data: {
    month: "2026-11",
    items: [],
    totals: { avoidedCount: 3, avoidedCents: 18990, postponedCount: 0, postponedCents: 0 },
    byCategory: [],
    previous: { count: 2, cents: 9000 },
    ...overrides,
  },
});

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AvoidedSummaryCard />
    </QueryClientProvider>,
  );
}

describe("AvoidedSummaryCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows how many were avoided, how much, and the comparison", async () => {
    av.listAvoidedAction.mockResolvedValue(overview());
    renderCard();

    expect(await screen.findByText("3 compras evitadas este mes")).toBeInTheDocument();
    expect(screen.getByText(/S\/\s189\.90 que decidiste no gastar/)).toBeInTheDocument();
    expect(screen.getByText(/A esta altura de octubre: 2 · S\/\s90\.00/)).toBeInTheDocument();
  });

  it("always says it is not saved money", async () => {
    av.listAvoidedAction.mockResolvedValue(overview());
    renderCard();

    expect(await screen.findByText("Es lo que habrías gastado, no dinero ahorrado.")).toBeInTheDocument();
  });

  it("uses the singular and mentions the postponed ones", async () => {
    av.listAvoidedAction.mockResolvedValue(
      overview({
        totals: { avoidedCount: 1, avoidedCents: 5000, postponedCount: 2, postponedCents: 9000 },
        previous: { count: 0, cents: 0 },
      }),
    );
    renderCard();

    expect(await screen.findByText("1 compra evitada este mes")).toBeInTheDocument();
    expect(screen.getByText(/A esta altura de octubre: ninguna\./)).toBeInTheDocument();
    expect(screen.getByText(/2 pospuestas/)).toBeInTheDocument();
  });

  it("invites to register the first one when there are none", async () => {
    av.listAvoidedAction.mockResolvedValue(
      overview({ totals: { avoidedCount: 0, avoidedCents: 0, postponedCount: 0, postponedCents: 0 } }),
    );
    renderCard();

    expect(await screen.findByText(/Aún no registras compras evitadas este mes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todas" })).toHaveAttribute("href", "/avoided");
  });

  it("opens the form to register one", async () => {
    av.listAvoidedAction.mockResolvedValue(overview());
    const user = userEvent.setup();
    renderCard();

    await user.click(await screen.findByRole("button", { name: "Registrar compra evitada" }));

    expect(await screen.findByRole("heading", { name: "Compra evitada" })).toBeInTheDocument();
  });

  it("shows a retryable error", async () => {
    av.listAvoidedAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup();
    renderCard();

    expect(await screen.findByText(/No pudimos cargar tus compras evitadas/)).toBeInTheDocument();
    av.listAvoidedAction.mockResolvedValue(overview());
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("3 compras evitadas este mes")).toBeInTheDocument();
  });
});
