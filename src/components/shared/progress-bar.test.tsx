import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it("exposes its value and name as a progressbar", () => {
    render(<ProgressBar value={40} label="Comida: 40 % del presupuesto" />);

    const bar = screen.getByRole("progressbar", { name: "Comida: 40 % del presupuesto" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("never goes above 100 or below 0", () => {
    const { rerender } = render(<ProgressBar value={250} label="x" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");

    rerender(<ProgressBar value={-20} label="x" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("fills the inner bar with the given width", () => {
    render(<ProgressBar value={55} label="x" />);

    const inner = screen.getByRole("progressbar").firstElementChild as HTMLElement;
    expect(inner.style.width).toBe("55%");
  });

  it("uses the destructive token only when over", () => {
    const { rerender } = render(<ProgressBar value={100} label="x" tone="over" />);
    expect((screen.getByRole("progressbar").firstElementChild as HTMLElement).className).toContain("bg-destructive");

    rerender(<ProgressBar value={100} label="x" />);
    expect((screen.getByRole("progressbar").firstElementChild as HTMLElement).className).toContain("bg-primary");
  });
});
