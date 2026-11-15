import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import GlobalError from "./global-error";

describe("GlobalError", () => {
  it("shows a calm message without technical details and lets the user retry", async () => {
    const reset = vi.fn();
    // <html> inside a div is invalid DOM; the test only needs its content.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<GlobalError error={new Error("secret internal detail")} reset={reset} />);

    expect(screen.getByText(/Tus datos están a salvo/)).toBeInTheDocument();
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
