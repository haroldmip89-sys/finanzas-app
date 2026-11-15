import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  getAvoidedOverviewAction: vi.fn(),
  createAvoidedPurchaseAction: vi.fn(),
  markAvoidedAction: vi.fn(),
  deleteAvoidedPurchaseAction: vi.fn(),
}));
vi.mock("../actions/avoided-purchases.actions", () => actions);
vi.mock("@/modules/categories/actions/categories.actions", () => ({
  listCategoriesAction: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

import { AvoidedSummaryCard } from "./avoided-summary-card";

const summary = {
  avoidedCount: 0,
  avoidedCents: 0,
  previousAvoidedCount: 0,
  previousAvoidedCents: 0,
  postponedCount: 0,
  postponedCents: 0,
  byCategory: [],
};

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AvoidedSummaryCard />
    </QueryClientProvider>,
  );
}

describe("AvoidedSummaryCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invites to register the first one when there is nothing", async () => {
    actions.getAvoidedOverviewAction.mockResolvedValue({ ok: true, data: { items: [], summary } });
    renderCard();
    expect(await screen.findByText(/anótalo aquí/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar compra evitada" })).toBeInTheDocument();
  });

  it("shows the month figures and says the amount is not saved money", async () => {
    actions.getAvoidedOverviewAction.mockResolvedValue({
      ok: true,
      data: {
        items: [],
        summary: { ...summary, avoidedCount: 3, avoidedCents: 45000, postponedCount: 1, postponedCents: 9900 },
      },
    });
    renderCard();
    expect(await screen.findByText("3 compras")).toBeInTheDocument();
    expect(screen.getByText(/S\/\s450\.00 este mes\. No es dinero ahorrado real/)).toBeInTheDocument();
    expect(screen.getByText(/1 en espera/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todas" })).toHaveAttribute("href", "/avoided");
  });

  it("shows a retryable error", async () => {
    actions.getAvoidedOverviewAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "x" },
    });
    renderCard();
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
