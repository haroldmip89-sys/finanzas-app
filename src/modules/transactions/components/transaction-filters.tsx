"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const ALL = "all";

const TYPE_OPTIONS = [
  { value: ALL, label: "Todos" },
  { value: "expense", label: "Gastos" },
  { value: "income", label: "Ingresos" },
];

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

function FilterSelect({ id, label, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={options}
        value={value || ALL}
        onValueChange={(next) => onChange(next === ALL || next === null ? "" : next)}
      >
        <SelectTrigger id={id} className="h-11 w-full md:h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TransactionFilters({
  filters,
  onChange,
  onReset,
  isFiltered,
  accountOptions,
  categoryOptions,
}: TransactionFiltersProps) {
  const accounts = [
    { value: ALL, label: "Todas" },
    ...accountOptions.map((a) => ({ value: a.id, label: a.name })),
  ];
  const categories = [
    { value: ALL, label: "Todas" },
    ...categoryOptions.map((c) => ({ value: c.id, label: c.name })),
  ];

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
          onChange={(v) => onChange("accountId", v)}
        />
        <FilterSelect
          id="filter-category"
          label="Categoría"
          value={filters.categoryId}
          options={categories}
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
