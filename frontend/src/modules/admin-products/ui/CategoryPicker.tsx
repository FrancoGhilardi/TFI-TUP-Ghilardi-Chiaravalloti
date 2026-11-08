import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import type { CategoryOption } from "@/modules/admin-categories";
import { cn } from "@/modules/core/lib/utils";
import { Button } from "@/modules/core/ui/primitives/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/modules/core/ui/primitives/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/modules/core/ui/primitives/popover";

import { productPickersText } from "../content/product-form";

interface CategoryPickerProps {
  options: CategoryOption[];
  chosen: readonly string[];
  onToggle: (id: string) => void;
  invalid: boolean;
  describedBy?: string;
}

/** A list to search the categories and mark any number of them; the ones that are hidden stay out. */
export const CategoryPicker = ({
  options,
  chosen,
  onToggle,
  invalid,
  describedBy,
}: CategoryPickerProps) => {
  const [open, setOpen] = useState(false);
  const { add, search, empty, inactive, picked } = productPickersText.categories;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn("w-full justify-between sm:w-auto", invalid && "border-coral-strong")}
        >
          {add}
          <ChevronDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72">
        <Command>
          <CommandInput placeholder={search} aria-label={search} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isChosen = chosen.includes(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    keywords={[option.label]}
                    // An inactive category already given to the product can still be taken off.
                    disabled={!option.isActive && !isChosen}
                    onSelect={() => onToggle(option.id)}
                  >
                    <Check
                      className={cn("size-4 shrink-0 text-teal", !isChosen && "invisible")}
                      aria-hidden="true"
                    />
                    <span className="whitespace-pre">{option.label}</span>
                    {isChosen && <span className="sr-only">{picked}</span>}
                    {!option.isActive && !isChosen && <span className="sr-only">{inactive}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
