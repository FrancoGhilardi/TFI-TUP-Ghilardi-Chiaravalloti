import { Module } from "@nestjs/common";
import { CategoryQueries } from "./application/ports/category-queries.js";
import { ListCategoryTreeUseCase } from "./application/use-cases/list-category-tree.use-case.js";
import { DrizzleCategoryQueries } from "./infrastructure/persistence/drizzle-category.queries.js";
import { CategoriesController } from "./presentation/http/categories.controller.js";

@Module({
  controllers: [CategoriesController],
  providers: [
    { provide: CategoryQueries, useClass: DrizzleCategoryQueries },
    {
      provide: ListCategoryTreeUseCase,
      useFactory: (queries: CategoryQueries) => new ListCategoryTreeUseCase(queries),
      inject: [CategoryQueries],
    },
  ],
})
export class CatalogModule {}
