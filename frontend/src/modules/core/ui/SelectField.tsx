import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/modules/core/lib/utils";
import { Label } from "@/modules/core/ui/primitives/label";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<ComponentProps<"select">, "children"> {
  id: string;
  label: string;
  options: SelectOption[];
  /** Message shown below the field, which also marks it as invalid. */
  error?: string;
  /** Help shown below the field while it has no error. */
  hint?: string;
}

/** A labelled native select with its own arrow, and its error and hint tied to it. */
export const SelectField = ({
  id,
  label,
  options,
  error,
  hint,
  className,
  ...props
}: SelectFieldProps) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "h-11 w-full cursor-pointer appearance-none rounded-xl border-[1.5px] border-line bg-surface pr-10 pl-3.5 text-base text-ink outline-none focus-visible:border-teal focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-coral-strong",
            className,
          )}
          {...props}
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
      {error && (
        <p id={errorId} className="text-sm font-semibold text-coral-strong">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
};
