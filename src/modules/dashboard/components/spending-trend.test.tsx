import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dash = vi.hoisted(() => ({ dailySpendingAction: vi.fn() }));
vi.mock("../actions/dashboard.actions", () => dash);

import { SpendingTrend } from "./spending-trend";

function renderTrend() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SpendingTrend />
    </QueryClientProvider>,
  );
}

const data = (currentDaily: number[], previousDaily: number[]) => ({
  ok: true as const,
  data: { currentDaily, previousDaily },
});

describe("SpendingTrend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("describes the chart in text with both totals", async () => {
    dash.dailySpendingAction.mockResolvedValue(data([1000, 0, 2000], [500, 500, 500]));
    renderTrend();

    const chart = await screen.findByRole("img");
    expect(chart).toHaveAccessibleName(/hasta el día 3: este mes S\/\s30\.00, octubre S\/\s15\.00/);
  });

  it("summarizes both periods with the difference, the variation and the averages", async () => {
    dash.dailySpendingAction.mockResolvedValue(data([1000, 0, 2000], [500, 500, 500]));
    renderTrend();

    const summary = (await screen.findByText("Diferencia")).closest("dl") as HTMLElement;
    expect(within(summary).getByText(/S\/\s15\.00 más · \+100 %/)).toBeInTheDocument();
    expect(within(summary).getByText("Promedio diario")).toBeInTheDocument();
    expect(within(summary).getAllByText(/S\/\s10\.00/).length).toBeGreaterThan(0);
  });

  it("says spending less in words and without a variation when last month had none", async () => {
    dash.dailySpendingAction.mockResolvedValue(data([100, 100], [1000, 1000]));
    const { unmount } = renderTrend();
    expect(await screen.findByText(/menos · −90 %/)).toBeInTheDocument();
    unmount();

    dash.dailySpendingAction.mockResolvedValue(data([100, 100], [0, 0]));
    renderTrend();
    expect(await screen.findByText(/más · —/)).toBeInTheDocument();
  });

  it("lets you check any day with the slider", async () => {
    dash.dailySpendingAction.mockResolvedValue(data([1000, 0, 2000], [500, 500, 500]));
    renderTrend();

    const slider = await screen.findByRole("slider", { name: "Consultar día" });
    expect(slider).toHaveAttribute("max", "3");
    expect(screen.getByText("Día 3")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "1" } });

    expect(screen.getByText("Día 1")).toBeInTheDocument();
    const readout = screen.getByText("Día 1").closest("p") as HTMLElement;
    expect(readout).toHaveTextContent(/acumulado este mes S\/\s10\.00/);
    expect(readout).toHaveTextContent(/octubre S\/\s5\.00/);
  });

  it("gives the exact numbers by day in a table", async () => {
    dash.dailySpendingAction.mockResolvedValue(data([1000, 0, 2000], [500, 500]));
    const user = userEvent.setup();
    renderTrend();

    await user.click(await screen.findByText("Ver datos por día"));

    const table = screen.getByRole("table", { name: "Gasto acumulado por día" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(4);
    // Day 3: spent 20.00 that day, 30.00 so far; last month only has 2 days to compare.
    expect(rows[3]).toHaveTextContent(/3\s*S\/\s20\.00\s*S\/\s30\.00\s*—/);
  });

  it("has no slider on the first day of the month", async () => {
    dash.dailySpendingAction.mockResolvedValue(data([1500], [700]));
    renderTrend();

    expect(await screen.findByRole("img")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.getByText("Día 1")).toBeInTheDocument();
  });

  it("shows a calm empty state without spending in either month", async () => {
    dash.dailySpendingAction.mockResolvedValue(data([0, 0], [0, 0]));
    renderTrend();

    expect(await screen.findByText(/Aún no registras gastos este mes ni a esta altura de octubre/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a retryable error", async () => {
    dash.dailySpendingAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup();
    renderTrend();

    expect(await screen.findByText(/No pudimos cargar la evolución/)).toBeInTheDocument();
    dash.dailySpendingAction.mockResolvedValue(data([100], [0]));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Evolución del gasto" })).toBeInTheDocument();
  });
});
