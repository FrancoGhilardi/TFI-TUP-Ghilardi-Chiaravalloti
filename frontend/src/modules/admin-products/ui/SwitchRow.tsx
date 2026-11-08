import type { ReactNode } from "react";

import { Label } from "@/modules/core/ui/primitives/label";
import { Switch } from "@/modules/core/ui/primitives/switch";

interface SwitchRowProps {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Fields that only matter while the switch is on. */
  children?: ReactNode;
}

/** A yes/no setting with its explanation; what depends on it shows only while it is on. */
export const SwitchRow = ({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
  children,
}: SwitchRowProps) => {
  return (
    <div className="border-t border-line-soft pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor={id} className="font-semibold">
            {label}
          </Label>
          <p id={`${id}-hint`} className="mt-0.5 text-sm text-ink-soft">
            {hint}
          </p>
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-describedby={`${id}-hint`}
        />
      </div>
      {checked && children && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-cream p-3">{children}</div>
      )}
    </div>
  );
};
