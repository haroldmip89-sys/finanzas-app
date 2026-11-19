import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RouteError } from "./route-error";

describe("RouteError", () => {
  it("reassures the user and offers to retry", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<RouteError onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Tus datos están a salvo");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("links back to the home screen", () => {
    render(<RouteError onRetry={() => {}} />);

    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/dashboard");
  });

  it("can hide the home link", () => {
    render(<RouteError onRetry={() => {}} showHome={false} />);

    expect(screen.queryByRole("link", { name: "Volver al inicio" })).not.toBeInTheDocument();
  });
});
