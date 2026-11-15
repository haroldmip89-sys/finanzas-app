"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SelectOption = { id: string; name: string };

type EntitySelectProps = {
  id: string;
  /** Selected id, or "" when nothing is chosen. */
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
};

/** Select over `{ id, name }` options, for forms where a choice is required. */
export function EntitySelect({ id, value, options, placeholder, onChange }: EntitySelectProps) {
  const items = options.map((o) => ({ value: o.id, label: o.name }));
  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(next) => onChange(next ?? "")}
    >
      <SelectTrigger id={id} className="h-11 w-full md:h-8">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
