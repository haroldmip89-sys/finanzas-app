import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ getMindfulSettingsAction: vi.fn(), saveMindfulSettingsAction: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../actions/settings.actions", () => settings);
vi.mock("sonner", () => ({ toast: toastMock }));

import { MindfulSettingsPage } from "./mindful-settings-page";

function ok<T>(data: T) {
  return { ok: true as const, data };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MindfulSettingsPage />
    </QueryClientProvider>,
  );
}

describe("MindfulSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settings.getMindfulSettingsAction.mockResolvedValue(ok({ enabled: true, thresholdCents: 10000, pauseMinutes: 1440 }));
  });

  it("shows the saved settings", async () => {
    renderPage();

    expect(await screen.findByLabelText("Umbral de compra grande (S/)")).toHaveValue("100.00");
    expect(screen.getByRole("switch", { name: "Activar compra consciente" })).toBeChecked();
    expect(screen.getByRole("tab", { name: "24 horas" })).toHaveAttribute("aria-selected", "true");
  });

  it("saves the changes in cents", async () => {
    settings.saveMindfulSettingsAction.mockResolvedValue(ok({ enabled: false, thresholdCents: 25050, pauseMinutes: 10 }));
    const user = userEvent.setup();
    renderPage();

    const threshold = await screen.findByLabelText("Umbral de compra grande (S/)");
    await user.clear(threshold);
    await user.type(threshold, "250.50");
    await user.click(screen.getByRole("switch", { name: "Activar compra consciente" }));
    await user.click(screen.getByRole("tab", { name: "10 minutos" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(settings.saveMindfulSettingsAction).toHaveBeenCalledWith({
        enabled: false,
        thresholdCents: 25050,
        pauseMinutes: 10,
      }),
    );
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Ajustes guardados"));
  });

  it("does not save an empty or zero threshold", async () => {
    const user = userEvent.setup();
    renderPage();

    const threshold = await screen.findByLabelText("Umbral de compra grande (S/)");
    await user.clear(threshold);
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(/Ingresa un monto mayor a 0/)).toBeInTheDocument();
    expect(settings.saveMindfulSettingsAction).not.toHaveBeenCalled();
  });

  it("says the hint never blocks saving", async () => {
    renderPage();

    expect(await screen.findByText(/Nunca bloquea el guardado/)).toBeInTheDocument();
  });

  it("shows a server error and keeps the form", async () => {
    settings.saveMindfulSettingsAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ocurrió un error inesperado.")).toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("shows a retryable error when loading fails", async () => {
    settings.getMindfulSettingsAction.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL", message: "Ocurrió un error inesperado." },
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/No pudimos cargar tus ajustes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByLabelText("Umbral de compra grande (S/)")).toBeInTheDocument();
  });
});
