import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type PaginationNavProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function PaginationNav({
  page,
  totalPages,
  onPageChange,
  disabled,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft data-icon="inline-start" />
        Anterior
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Página {page} de {totalPages}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
        <ChevronRight data-icon="inline-end" />
      </Button>
    </nav>
  );
}
