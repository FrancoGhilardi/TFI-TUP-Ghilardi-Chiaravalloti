import { Label } from "@/modules/core/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/modules/core/ui/primitives/radio-group";

interface StateRadioFieldProps {
  id: string;
  label: string;
  activeLabel: string;
  inactiveLabel: string;
  active: boolean;
  onChange: (active: boolean) => void;
  /** Help shown below the field. */
  hint?: string;
  disabled?: boolean;
}

/** Whether something is active or inactive, as two radio options under a shared label. */
export const StateRadioField = ({
  id,
  label,
  activeLabel,
  inactiveLabel,
  active,
  onChange,
  hint,
  disabled,
}: StateRadioFieldProps) => {
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-sm font-semibold text-ink">
        {label}
      </span>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? hintId : undefined}
        value={active ? "active" : "inactive"}
        onValueChange={(value) => onChange(value === "active")}
        disabled={disabled}
        className="grid-cols-2"
      >
        {[
          { value: "active", label: activeLabel },
          { value: "inactive", label: inactiveLabel },
        ].map((option) => (
          <div
            key={option.value}
            className="flex items-center gap-2 rounded-xl border-[1.5px] border-line px-3 py-2"
          >
            <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
            <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
      {hint && (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
};
