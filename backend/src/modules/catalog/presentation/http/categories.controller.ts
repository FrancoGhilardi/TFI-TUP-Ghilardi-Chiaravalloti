import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "../../../identity/presentation/decorators/public.decorator.js";
import type { CategoryTreeResult } from "../../application/dto/category-tree.result.js";
import { ListCategoryTreeUseCase } from "../../application/use-cases/list-category-tree.use-case.js";

/** Public categories of the store. */
@Controller("categories")
@Public()
export class CategoriesController {
  constructor(private readonly listCategoryTree: ListCategoryTreeUseCase) {}

  // Changes rarely; the store revalidates it every 60 seconds too.
  @Get()
  @Header("Cache-Control", "public, max-age=60")
  findAll(): Promise<CategoryTreeResult[]> {
    return this.listCategoryTree.execute();
  }
}
