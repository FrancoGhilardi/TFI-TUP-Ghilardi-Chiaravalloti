import { Search } from "lucide-react";
import { useState } from "react";

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

import { useRelatedSearch } from "../application/useRelatedSearch";
import { productPickersText } from "../content/product-form";
import type { RelatedChoice } from "../domain/product-form";

interface RelatedPickerProps {
  /** Ids to leave out of the results: the product itself and the ones already chosen. */
  excluded: readonly string[];
  onPick: (product: RelatedChoice) => void;
  disabled: boolean;
  describedBy?: string;
}

/** A search over the current products to pick one; it closes once a product is chosen. */
export const RelatedPicker = ({ excluded, onPick, disabled, describedBy }: RelatedPickerProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { results, isLoading, isError, retry } = useRelatedSearch(text, excluded);
  const { add, search, searching, empty, failed, retry: retryLabel } = productPickersText.related;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setText("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-describedby={describedBy}
          className="w-full justify-between sm:w-auto"
        >
          {add}
          <Search aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-80">
        <Command shouldFilter={false}>
          <CommandInput
            value={text}
            onValueChange={setText}
            placeholder={search}
            aria-label={search}
          />
          <CommandList>
            {isError ? (
              <div role="alert" className="flex flex-col items-start gap-2 px-3 py-4 text-sm">
                {failed}
                <Button type="button" variant="outline" size="sm" onClick={retry}>
                  {retryLabel}
                </Button>
              </div>
            ) : isLoading ? (
              <div className="px-3 py-6 text-center text-sm text-ink-soft">{searching}</div>
            ) : (
              <>
                {results.length === 0 && <CommandEmpty>{empty}</CommandEmpty>}
                <CommandGroup>
                  {results.map(({ id, title, sku }) => (
                    <CommandItem
                      key={id}
                      value={id}
                      onSelect={() => {
                        onPick({ id, title, sku });
                        setOpen(false);
                        setText("");
                      }}
                    >
                      <span className="flex-1 truncate">{title}</span>
                      <span className="font-mono text-xs text-ink-soft">{sku}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
