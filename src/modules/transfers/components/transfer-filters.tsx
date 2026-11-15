"use client";

import { FilterSelect } from "@/components/shared/filter-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { FilterState } from "../hooks/use-transfer-filters";

type TransferFiltersProps = {
  filters: FilterState;
  onChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  isFiltered: boolean;
  accountOptions: { id: string; name: string }[];
};

export function TransferFilters({
  filters,
  onChange,
  onReset,
  isFiltered,
  accountOptions,
}: TransferFiltersProps) {
  return (
    <details className="group rounded-xl border border-border bg-card p-4 md:open:block" open>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-medium md:hidden">
        Filtros
        {isFiltered && <span className="text-xs text-muted-foreground">Activos</span>}
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 md:mt-0 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="transfer-filter-from">Desde</Label>
          <Input
            id="transfer-filter-from"
            type="date"
            value={filters.from}
            onChange={(e) => onChange("from", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="transfer-filter-to">Hasta</Label>
          <Input
            id="transfer-filter-to"
            type="date"
            value={filters.to}
            onChange={(e) => onChange("to", e.target.value)}
          />
        </div>
        <FilterSelect
          id="transfer-filter-account"
          label="Cuenta (origen o destino)"
          value={filters.accountId}
          allLabel="Todas"
          options={accountOptions.map((a) => ({ value: a.id, label: a.name }))}
          onChange={(v) => onChange("accountId", v)}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onReset}
            disabled={!isFiltered}
          >
            Limpiar
          </Button>
        </div>
      </div>
    </details>
  );
}
