import type { ComponentProps } from "react";

import { cn } from "@/modules/core/lib/utils";

const Textarea = ({ className, ...props }: ComponentProps<"textarea">) => {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-28 w-full min-w-0 rounded-xl border-[1.5px] border-line bg-surface px-3.5 py-2.5 text-base text-ink transition-colors outline-none placeholder:text-ink-soft/70 focus-visible:border-teal focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-coral-strong aria-invalid:ring-coral-strong/20",
        className,
      )}
      {...props}
    />
  );
};

export { Textarea };
