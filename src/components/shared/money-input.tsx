"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { sanitizeMoneyInput } from "@/lib/money";

type MoneyInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onValueChange: (value: string) => void;
  allowNegative?: boolean;
};

/** Text field for PEN amounts: accepts only digits and up to 2 decimals. */
export function MoneyInput({
  value,
  onValueChange,
  allowNegative,
  placeholder = "0.00",
  ...props
}: MoneyInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(event) =>
        onValueChange(sanitizeMoneyInput(event.target.value, { allowNegative }))
      }
    />
  );
}
