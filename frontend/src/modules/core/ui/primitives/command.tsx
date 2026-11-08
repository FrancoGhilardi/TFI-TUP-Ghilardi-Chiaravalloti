"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/modules/core/lib/utils";

const Command = ({ className, ...props }: ComponentProps<typeof CommandPrimitive>) => {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl bg-surface text-ink",
        className,
      )}
      {...props}
    />
  );
};

const CommandInput = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) => {
  return (
    <div className="flex items-center gap-2 border-b border-line-soft px-3">
      <Search className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-11 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft/70 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
};

const CommandList = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) => {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn("max-h-64 overflow-x-hidden overflow-y-auto p-1", className)}
      {...props}
    />
  );
};

const CommandEmpty = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) => {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("px-3 py-6 text-center text-sm text-ink-soft", className)}
      {...props}
    />
  );
};

const CommandGroup = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) => {
  return (
    <CommandPrimitive.Group data-slot="command-group" className={cn("p-0", className)} {...props} />
  );
};

const CommandItem = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) => {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 data-[selected=true]:bg-wheat",
        className,
      )}
      {...props}
    />
  );
};

export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList };
