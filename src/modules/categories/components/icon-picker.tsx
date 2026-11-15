import { cn } from "@/lib/utils";

import {
  CATEGORY_ICON_KEYS,
  type CategoryIconKey,
} from "../constants/category-icon-keys";
import { CATEGORY_ICONS } from "./category-icon";

type IconPickerProps = {
  value: CategoryIconKey;
  onChange: (key: CategoryIconKey) => void;
  labelledBy?: string;
};

export function IconPicker({ value, onChange, labelledBy }: IconPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-5 gap-2 sm:grid-cols-7"
    >
      {CATEGORY_ICON_KEYS.map((key) => {
        const Icon = CATEGORY_ICONS[key];
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={key}
            onClick={() => onChange(key)}
            className={cn(
              "flex size-11 items-center justify-center rounded-lg border outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
          </button>
        );
      })}
    </div>
  );
}
