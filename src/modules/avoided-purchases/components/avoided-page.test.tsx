import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../actions/avoided.actions", () => av);
vi.mock("@/modules/categories/actions/categories.actions", () => cat);
vi.mock("sonner", () => ({ toast: toastMock }));

import { AvoidedPage } from "./avoided-page";

const CLOTHES = "11111111-1111-4111-8111-111111111111";

const categories = [
  { id: CLOTHES, name: "Ropa", kind: "expense", icon: "shirt", archivedAt: null, systemKey: null },
  { id: "22222222-2222-4222-8222-222222222222", name: "Sueldo", kind: "income", icon: "wallet", archivedAt: null, systemKey: null },
];

const item = (overrides: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  amountCents: 8990,
  date: "2026-11-10",
  categoryId: CLOTHES,
  categoryName: "Ropa",
  categoryIcon: "shirt",
  reason: "can_wait",
  note: "Zapatillas",
  status: "avoided",
  ...overrides,
});

function overview(items: ReturnType<typeof item>[], month = "2026-11") {
  const avoided = items.filter((i) => i.status === "avoided");
  const postponed = items.filter((i) => i.status === "postponed");
  const sum = (list: { amountCents: number }[]) => list.reduce((s, i) => s + i.amountCents, 0);
  return {
    ok: true as const,
    data: {
      month,
      items,
      totals: {
        avoidedCount: avoided.length,
        avoidedCents: sum(avoided),
        postponedCount: postponed.length,
        postponedCents: sum(postponed),
      },
      byCategory: avoided.length
        ? [{ categoryId: CLOTHES, name: "Ropa", count: avoided.length, cents: sum(avoided) }]
        : [],
      previous: { count: 1, cents: 4000 },
    },
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AvoidedPage />
    </QueryClientProvider>,
  );
}

describe("AvoidedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
    cat.listCategoriesAction.mockResolvedValue({ ok: true, data: categories });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the totals, where most is avoided and the history", async () => {
    av.listAvoidedAction.mockResolvedValue(
      overview([item(), item({ amountCents: 2000, note: null, categoryId: null, categoryName: null, categoryIcon: null, reason: null })]),
    );
    renderPage();

    expect(await screen.findByText("2 compras evitadas")).toBeInTheDocument();
    expect(screen.getAllByText("S/ 109.90").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Dónde más evitas" })).toBeInTheDocument();
    expect(screen.getByText("Zapatillas")).toBeInTheDocument();
    expect(screen.getByText(/no dinero ahorrado/)).toBeInTheDocument();
  });

  it("keeps postponed purchases apart and marks them", async () => {
    av.listAvoidedAction.mockResolvedValue(
      overview([item(), item({ amountCents: 40000, note: "Laptop", status: "postponed" })]),
    );
    renderPage();

    expect(await screen.findByText("1 compra evitada")).toBeInTheDocument();
    expect(screen.getByText("1 compra pospuesta")).toBeInTheDocument();
    expect(screen.getByText(/Pospuesta/)).toBeInTheDocument();
  });

  it("moves a postponed purchase to avoided from its menu", async () => {
    av.listAvoidedAction.mockResolvedValue(overview([item({ note: "Laptop", status: "postponed" })]));
    av.setAvoidedStatusAction.mockResolvedValue({ ok: true, data: {} });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Acciones de Laptop/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Marcar como evitada" }));

    await waitFor(() => expect(av.setAvoidedStatusAction).toHaveBeenCalledWith(expect.any(String), "avoided"));
  });

  it("only offers 'Marcar como evitada' for postponed purchases", async () => {
    av.listAvoidedAction.mockResolvedValue(overview([item()]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Acciones de Zapatillas/ }));

    expect(await screen.findByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Marcar como evitada" })).not.toBeInTheDocument();
  });

  it("deletes a purchase after confirming and says balances do not change", async () => {
    const one = item();
    av.listAvoidedAction.mockResolvedValue(overview([one]));
    av.deleteAvoidedAction.mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Acciones de Zapatillas/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    expect(await screen.findByText(/Tus saldos y gastos no cambian/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(av.deleteAvoidedAction).toHaveBeenCalledWith(one.id));
  });

  it("navigates to the previous month and back", async () => {
    av.listAvoidedAction.mockImplementation(async (month: string) => overview([item()], month));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("noviembre 2026");

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(await screen.findByText("octubre 2026")).toBeInTheDocument();
    await waitFor(() => expect(av.listAvoidedAction).toHaveBeenLastCalledWith("2026-10"));

    await user.click(screen.getByRole("button", { name: "Este mes" }));
    expect(await screen.findByText("noviembre 2026")).toBeInTheDocument();
  });

  it("shows an empty state that invites to register one", async () => {
    av.listAvoidedAction.mockResolvedValue(overview([]));
    renderPage();

    expect(await screen.findByText(/Aún no registras compras evitadas en noviembre 2026/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Registrar compra evitada" }).length).toBeGreaterThan(0);
  });

  it("shows a retryable error", async () => {
    av.listAvoidedAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Ocurrió un error inesperado.")).toBeInTheDocument();
    av.listAvoidedAction.mockResolvedValue(overview([item()]));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("1 compra evitada")).toBeInTheDocument();
  });
});
