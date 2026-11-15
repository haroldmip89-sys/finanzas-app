import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  getMindfulSettingsAction: vi.fn(),
  saveMindfulSettingsAction: vi.fn(),
}));
vi.mock("../actions/mindful-settings.actions", () => actions);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { MindfulSettingsPage } from "./mindful-settings-page";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MindfulSettingsPage />
    </QueryClientProvider>,
  );
}

describe("MindfulSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.getMindfulSettingsAction.mockResolvedValue({
      ok: true,
      data: { enabled: true, thresholdCents: 10000 },
    });
    actions.saveMindfulSettingsAction.mockImplementation(async (input) => ({ ok: true, data: input }));
  });

  it("shows the saved threshold and saves a new one in cents", async () => {
    renderPage();
    const input = await screen.findByLabelText(/Desde qué monto/);
    expect(input).toHaveValue("100.00");

    await userEvent.clear(input);
    await userEvent.type(input, "250");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(actions.saveMindfulSettingsAction).toHaveBeenCalledWith({
        enabled: true,
        thresholdCents: 25000,
      }),
    );
  });

  it("can turn the pause off", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("switch"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(actions.saveMindfulSettingsAction).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      ),
    );
  });

  it("rejects a zero threshold", async () => {
    renderPage();
    const input = await screen.findByLabelText(/Desde qué monto/);
    await userEvent.clear(input);
    await userEvent.type(input, "0");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(/mayor a 0/)).toBeInTheDocument();
    expect(actions.saveMindfulSettingsAction).not.toHaveBeenCalled();
  });

  it("shows a retryable error", async () => {
    actions.getMindfulSettingsAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "x" },
    });
    renderPage();
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
