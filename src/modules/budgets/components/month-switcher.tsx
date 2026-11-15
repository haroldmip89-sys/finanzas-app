"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonth } from "@/lib/dates";

type MonthSwitcherProps = {
  month: string;
  isCurrentMonth: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onThisMonth: () => void;
};

export function MonthSwitcher({
  month,
  isCurrentMonth,
  onPrevious,
  onNext,
  onThisMonth,
}: MonthSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 md:size-8"
        aria-label="Mes anterior"
        onClick={onPrevious}
      >
        <ChevronLeft />
      </Button>
      <p
        aria-live="polite"
        className="min-w-0 flex-1 truncate text-center text-base font-semibold capitalize sm:flex-none sm:px-4"
      >
        {formatMonth(month)}
      </p>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 md:size-8"
        aria-label="Mes siguiente"
        onClick={onNext}
      >
        <ChevronRight />
      </Button>
      {!isCurrentMonth && (
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 md:min-h-8"
          onClick={onThisMonth}
        >
          Este mes
        </Button>
      )}
    </div>
  );
}
