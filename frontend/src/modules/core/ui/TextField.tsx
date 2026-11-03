import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";
import { Input } from "@/modules/core/ui/primitives/input";
import { Label } from "@/modules/core/ui/primitives/label";

interface TextFieldProps extends ComponentProps<"input"> {
  id: string;
  label: string;
  /** Message shown below the field, which also marks it as invalid. */
  error?: string;
  /** Control placed inside the field at its end, such as a show/hide button. */
  trailing?: ReactNode;
}

/** A labelled text field, with its error tied to the input so assistive technology reads it. */
export const TextField = ({ id, label, error, trailing, className, ...props }: TextFieldProps) => {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(trailing && "pr-12", className)}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} className="text-sm font-semibold text-coral-strong">
          {error}
        </p>
      )}
    </div>
  );
};
