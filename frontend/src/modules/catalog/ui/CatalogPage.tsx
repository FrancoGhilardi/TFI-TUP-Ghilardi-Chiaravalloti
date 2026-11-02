import { redirect } from "next/navigation";

import { Container } from "@/modules/core/ui/Container";
import { Eyebrow } from "@/modules/core/ui/Eyebrow";

import { catalogView } from "../application/catalog-view";
import { getCatalogPage } from "../application/get-catalog-page";
import { getStoreCategoryTree } from "../application/store-categories";
import { catalogContent } from "../content/catalog";
import {
  canonicalCatalogHref,
  parseCatalogQuery,
  type RawSearchParams,
} from "../domain/catalog-query";
import { CatalogResults } from "./CatalogResults";
import { CatalogSearch } from "./CatalogSearch";
import { CategoryNav } from "./CategoryNav";
import { ResultsAnnouncement } from "./ResultsAnnouncement";
import { SortSelect } from "./SortSelect";

interface CatalogPageProps {
  searchParams: RawSearchParams;
}

export const CatalogPage = async ({ searchParams }: CatalogPageProps) => {
  const canonical = canonicalCatalogHref(searchParams);
  if (canonical) {
    redirect(canonical);
  }
  const query = parseCatalogQuery(searchParams);
  const [result, tree] = await Promise.all([getCatalogPage(query), getStoreCategoryTree()]);
  const view = catalogView(result);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <header>
        <Eyebrow>{catalogContent.eyebrow}</Eyebrow>
        <h1 className="mt-2 text-section font-semibold">{catalogContent.title}</h1>
      </header>
      <div className="grid items-start gap-6 nav:grid-cols-[230px_minmax(0,1fr)]">
        <CategoryNav tree={tree} query={query} />
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <CatalogSearch query={query} />
            <SortSelect query={query} />
          </div>
          <ResultsAnnouncement view={view} />
          <CatalogResults view={view} query={query} tree={tree} />
        </div>
      </div>
    </Container>
  );
};
