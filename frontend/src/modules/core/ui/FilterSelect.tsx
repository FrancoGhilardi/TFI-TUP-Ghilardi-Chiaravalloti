import { ChevronDown } from "lucide-react";

import { Label } from "@/modules/core/ui/primitives/label";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

/** A native select with its own arrow, so it keeps the rounded look and the platform's controls. */
export const FilterSelect = ({ id, label, value, options, onChange }: FilterSelectProps) => {
  return (
    <div className="relative">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 max-w-64 cursor-pointer appearance-none rounded-xl border-[1.5px] border-line bg-surface pr-10 pl-3.5 text-sm font-semibold text-ink outline-none focus-visible:border-teal focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-soft"
      />
    </div>
  );
};
