"use client";

import { ChevronDown } from "lucide-react";
import Form from "next/form";
import type { ChangeEvent } from "react";

import { useHydrated } from "@/modules/core/hooks/useHydrated";
import { Button } from "@/modules/core/ui/primitives/button";

import { catalogContent } from "../content/catalog";
import { CATALOG_PARAMS, CATALOG_SORTS, type CatalogQuery } from "../domain/catalog-query";
import { CATALOG_PATH } from "../domain/product-routes";
import { HiddenQueryFields } from "./HiddenQueryFields";

const SELECT_ID = "orden-catalogo";

interface SortSelectProps {
  query: CatalogQuery;
}

/** Applies the sort as soon as it changes; without JavaScript, an "Aplicar" button submits it. */
export const SortSelect = ({ query }: SortSelectProps) => {
  const hydrated = useHydrated();
  const { label, apply } = catalogContent.sort;

  const submitOnChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.currentTarget.form?.requestSubmit();
  };

  return (
    // Remounted when the sort changes, so the select always shows the sort of the current URL.
    <Form key={query.sort} action={CATALOG_PATH} className="flex items-center gap-2">
      <HiddenQueryFields query={query} except={["sort"]} />
      <label htmlFor={SELECT_ID} className="text-sm font-semibold whitespace-nowrap text-ink-soft">
        {label}
      </label>
      {/* The native arrow hugs the rounded edge, so it is replaced by an icon with room around it. */}
      <span className="relative">
        <select
          id={SELECT_ID}
          name={CATALOG_PARAMS.sort}
          defaultValue={query.sort}
          onChange={submitOnChange}
          className="h-10 cursor-pointer appearance-none rounded-full border-[1.5px] border-line bg-surface pr-10 pl-4 text-sm font-semibold text-ink"
        >
          {CATALOG_SORTS.map(({ value, label: optionLabel }) => (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-soft"
        />
      </span>
      {!hydrated && (
        <Button type="submit" size="sm" variant="outline">
          {apply}
        </Button>
      )}
    </Form>
  );
};
