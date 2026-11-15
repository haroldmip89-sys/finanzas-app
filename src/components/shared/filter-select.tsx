"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

type FilterSelectProps = {
  id: string;
  label: string;
  /** Selected value, or "" for "all". */
  value: string;
  options: { value: string; label: string }[];
  /** First option meaning "no filter" (default "Todos"). */
  allLabel?: string;
  onChange: (value: string) => void;
};

/** Labelled select for filters: the first option clears the filter (value ""). */
export function FilterSelect({
  id,
  label,
  value,
  options,
  allLabel = "Todos",
  onChange,
}: FilterSelectProps) {
  const items = [{ value: ALL, label: allLabel }, ...options];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={items}
        value={value || ALL}
        onValueChange={(next) => onChange(next === ALL || next === null ? "" : next)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
