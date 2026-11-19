"use client";
import { ChevronDown } from "lucide-react";
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
    <details className="group rounded-2xl border border-border bg-card p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          Filtros
          {isFiltered && <span className="text-xs font-normal text-muted-foreground">Activos</span>}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor="filter-from">Desde</Label>
          <Input id="filter-from" type="date" value={filters.from} onChange={(e) => onChange("from", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-to">Hasta</Label>
          <Input id="filter-to" type="date" value={filters.to} onChange={(e) => onChange("to", e.target.value)} />
        </div>
        <FilterSelect id="filter-type" label="Tipo" value={filters.type} options={TYPE_OPTIONS} onChange={(v) => onChange("type", v as TransactionType | "")} />
        <FilterSelect id="filter-account" label="Cuenta" value={filters.accountId} options={accounts} allLabel="Todas" onChange={(v) => onChange("accountId", v)} />
        <FilterSelect id="filter-category" label="Categoría" value={filters.categoryId} options={categories} allLabel="Todas" onChange={(v) => onChange("categoryId", v)} />
        <div className="flex items-end">
          <Button type="button" variant="outline" className="w-full" onClick={onReset} disabled={!isFiltered}>Limpiar</Button>
        </div>
      </div>
    </details>
  );
}
