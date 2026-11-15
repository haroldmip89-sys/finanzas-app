import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ImageCarousel } from "./image-carousel";

const slides = [{ src: "/a.webp" }, { src: "/b.webp" }, { src: "/c.webp" }];

describe("ImageCarousel", () => {
  it("renders one image per slide inside an aria-hidden container", () => {
    const { container } = render(<ImageCarousel slides={slides} />);

    const hidden = screen.getByTestId("carousel-slides");
    expect(hidden).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("img")).toHaveLength(3);
    container.querySelectorAll("img").forEach((img) => {
      expect(img).toHaveAttribute("alt", "");
    });
  });

  it("shows an accessible pause button when it animates", () => {
    render(<ImageCarousel slides={slides} />);

    expect(
      screen.getByRole("button", { name: "Pausar carrusel" }),
    ).toBeInTheDocument();
  });

  it("has no button with a single slide", () => {
    render(<ImageCarousel slides={slides.slice(0, 1)} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
