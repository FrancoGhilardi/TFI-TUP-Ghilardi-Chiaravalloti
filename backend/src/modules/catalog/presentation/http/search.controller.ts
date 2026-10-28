import { Controller, Get, Header, Query } from "@nestjs/common";
import { Public } from "../../../identity/presentation/decorators/public.decorator.js";
import type { GlobalSearchResult } from "../../application/dto/global-search.result.js";
import { GlobalSearchUseCase } from "../../application/use-cases/global-search.use-case.js";
import { GlobalSearchRequestDto } from "./global-search.request.dto.js";
import { STORE_CACHE_CONTROL } from "./store-cache.js";

/** The store search box: products and categories at once. */
@Controller("search")
@Public()
export class SearchController {
  constructor(private readonly globalSearch: GlobalSearchUseCase) {}

  @Get()
  @Header("Cache-Control", STORE_CACHE_CONTROL)
  search(@Query() query: GlobalSearchRequestDto): Promise<GlobalSearchResult> {
    return this.globalSearch.execute({ q: query.q, limit: query.limit });
  }
}
