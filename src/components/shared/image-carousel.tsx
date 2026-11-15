"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { useImageCarousel } from "@/hooks/use-image-carousel";
import { cn } from "@/lib/utils";

export type CarouselSlide = { src: string; alt?: string };

type ImageCarouselProps = {
  slides: CarouselSlide[];
  intervalMs?: number;
  sizes?: string;
  className?: string;
};

export function ImageCarousel({
  slides,
  intervalMs,
  sizes,
  className,
}: ImageCarouselProps) {
  const count = slides.length;
  const { activeIndex, playing, animated, togglePlaying, containerProps } =
    useImageCarousel({ count, intervalMs });

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      {...containerProps}
    >
      {/* Decorative images: hidden from assistive technology. */}
      <div aria-hidden="true" data-testid="carousel-slides" className="absolute inset-0">
        {slides.map((slide, i) => {
          const offset = (i - activeIndex + count) % count;
          const translate = offset === 0 ? "0%" : offset === 1 ? "100%" : "-100%";
          return (
            <div
              key={slide.src}
              data-active={offset === 0}
              className={cn(
                "absolute inset-0",
                animated &&
                  offset !== 1 &&
                  "motion-safe:transition-transform motion-safe:duration-[600ms] motion-safe:ease-in-out",
              )}
              style={{ transform: `translateX(${translate})` }}
            >
              <Image
                src={slide.src}
                alt={slide.alt ?? ""}
                fill
                sizes={sizes}
                loading={i === 0 ? "eager" : "lazy"}
                className="object-cover object-center"
              />
            </div>
          );
        })}
      </div>
      {animated && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute bottom-4 left-4 size-11"
          aria-label={playing ? "Pausar carrusel" : "Reproducir carrusel"}
          onClick={togglePlaying}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-4">
            {playing ? (
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </Button>
      )}
    </div>
  );
}
