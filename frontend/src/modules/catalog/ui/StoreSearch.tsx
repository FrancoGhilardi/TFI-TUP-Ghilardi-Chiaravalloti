"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Container } from "@/modules/core/ui/Container";
import { Button } from "@/modules/core/ui/primitives/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/modules/core/ui/primitives/sheet";

import { searchContent } from "../content/search";
import { SearchBox } from "./SearchBox";

/** The header's search button and the panel it opens; closes when the visitor leaves for a result. */
export const StoreSearch = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={searchContent.trigger} className="text-ink">
          <Search className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        aria-describedby={undefined}
        className="max-h-dvh gap-0 overflow-y-auto bg-cream pt-4 pb-6"
      >
        <SheetTitle className="sr-only">{searchContent.title}</SheetTitle>
        {/* The close button is absolute at the right, so the field leaves room for it. */}
        <Container className="pr-14 sm:pr-4">
          <SearchBox onNavigate={() => setOpen(false)} />
        </Container>
      </SheetContent>
    </Sheet>
  );
};
