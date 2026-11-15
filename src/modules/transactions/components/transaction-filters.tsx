"use client";

import { FilterSelect } from "@/components/shared/filter-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { FilterState } from "../hooks/use-transaction-filters";
import type { TransactionType } from "../types/transaction.types";

type Option = { id: string; name: string };

type TransactionFiltersProps = {
  filters: FilterState;
  onChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  isFiltered: boolean;
  accountOptions: Option[];
  categoryOptions: Option[];
};

const TYPE_OPTIONS = [
  { value: "expense", label: "Gastos" },
  { value: "income", label: "Ingresos" },
];

export function TransactionFilters({
  filters,
  onChange,
  onReset,
  isFiltered,
  accountOptions,
  categoryOptions,
}: TransactionFiltersProps) {
  const accounts = accountOptions.map((a) => ({ value: a.id, label: a.name }));
  const categories = categoryOptions.map((c) => ({ value: c.id, label: c.name }));

  return (
    <details className="group rounded-xl border border-border bg-card p-4 md:open:block" open>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-medium md:hidden">
        Filtros
        {isFiltered && <span className="text-xs text-muted-foreground">Activos</span>}
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 md:mt-0 xl:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor="filter-from">Desde</Label>
          <Input
            id="filter-from"
            type="date"
            className="h-11 md:h-8"
            value={filters.from}
            onChange={(e) => onChange("from", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-to">Hasta</Label>
          <Input
            id="filter-to"
            type="date"
            className="h-11 md:h-8"
            value={filters.to}
            onChange={(e) => onChange("to", e.target.value)}
          />
        </div>
        <FilterSelect
          id="filter-type"
          label="Tipo"
          value={filters.type}
          options={TYPE_OPTIONS}
          onChange={(v) => onChange("type", v as TransactionType | "")}
        />
        <FilterSelect
          id="filter-account"
          label="Cuenta"
          value={filters.accountId}
          options={accounts}
          allLabel="Todas"
          onChange={(v) => onChange("accountId", v)}
        />
        <FilterSelect
          id="filter-category"
          label="Categoría"
          value={filters.categoryId}
          options={categories}
          allLabel="Todas"
          onChange={(v) => onChange("categoryId", v)}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full md:min-h-8"
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
