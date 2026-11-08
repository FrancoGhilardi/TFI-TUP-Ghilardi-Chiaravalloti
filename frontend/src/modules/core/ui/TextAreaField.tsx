import type { ComponentProps } from "react";

import { Textarea } from "@/modules/core/ui/primitives/textarea";
import { Label } from "@/modules/core/ui/primitives/label";

interface TextAreaFieldProps extends ComponentProps<"textarea"> {
  id: string;
  label: string;
  /** Said next to the label, such as "(opcional)". */
  note?: string;
  /** Message shown below the field, which also marks it as invalid. */
  error?: string;
}

/** A labelled multi-line field, with its error tied to it so assistive technology reads it. */
export const TextAreaField = ({ id, label, note, error, ...props }: TextAreaFieldProps) => {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {note && <span className="font-normal text-ink-soft"> {note}</span>}
      </Label>
      <Textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm font-semibold text-coral-strong">
          {error}
        </p>
      )}
    </div>
  );
};
