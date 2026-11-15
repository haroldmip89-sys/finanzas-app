import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ getWeeklySummaryAction: vi.fn() }));
vi.mock("../actions/weekly-summary.actions", () => actions);

import { WeeklySummaryCard } from "./weekly-summary-card";
import { WeeklySummaryPage } from "./weekly-summary-page";

const data = {
  from: "2026-11-09",
  to: "2026-11-15",
  spentCents: 7000,
  previousSpentCents: 10000,
  byCategory: [{ categoryId: "1", name: "Comida", cents: 7000 }],
  avoidedCount: 2,
  avoidedCents: 25000,
  availableAtStartCents: 256000,
  availableNowCents: 156000,
};

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("weekly summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.getWeeklySummaryAction.mockResolvedValue({ ok: true, data });
  });

  it("shows spending, categories, avoided purchases and the available money change", async () => {
    renderWith(<WeeklySummaryPage />);

    expect(await screen.findByText(/S\/\s30\.00 menos que a esta altura de la semana pasada/)).toBeInTheDocument();
    expect(screen.getByText("Comida")).toBeInTheDocument();
    expect(screen.getByText("2 compras")).toBeInTheDocument();
    expect(screen.getByText(/No es dinero ahorrado real/)).toBeInTheDocument();
    expect(screen.getByText(/bajó S\/\s1,000\.00 desde el lunes/)).toBeInTheDocument();
  });

  it("shows a calm empty state when there is no spending", async () => {
    actions.getWeeklySummaryAction.mockResolvedValue({
      ok: true,
      data: { ...data, spentCents: 0, previousSpentCents: 0, byCategory: [], avoidedCount: 0 },
    });
    renderWith(<WeeklySummaryPage />);

    expect(await screen.findByText("Sin gastos esta semana.")).toBeInTheDocument();
  });

  it("shows a retryable error", async () => {
    actions.getWeeklySummaryAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "x" },
    });
    renderWith(<WeeklySummaryPage />);

    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("the Inicio card links to the full summary", async () => {
    renderWith(<WeeklySummaryCard />);

    expect(await screen.findByRole("link", { name: "Ver resumen" })).toHaveAttribute("href", "/weekly");
  });
});
