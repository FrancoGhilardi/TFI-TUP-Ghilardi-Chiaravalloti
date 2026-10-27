import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "../../../identity/presentation/decorators/public.decorator.js";
import type { CategoryTreeResult } from "../../application/dto/category-tree.result.js";
import { ListCategoryTreeUseCase } from "../../application/use-cases/list-category-tree.use-case.js";
import { STORE_CACHE_CONTROL } from "./store-cache.js";

/** Public categories of the store. */
@Controller("categories")
@Public()
export class CategoriesController {
  constructor(private readonly listCategoryTree: ListCategoryTreeUseCase) {}

  // Changes rarely, like the rest of the store.
  @Get()
  @Header("Cache-Control", STORE_CACHE_CONTROL)
  findAll(): Promise<CategoryTreeResult[]> {
    return this.listCategoryTree.execute();
  }
}
