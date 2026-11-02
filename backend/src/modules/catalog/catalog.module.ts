import { Module } from "@nestjs/common";
import { Clock } from "../../shared/application/clock.js";
import { IdGenerator } from "../../shared/application/id-generator.js";
import { TransactionManager } from "../../shared/application/transaction-manager.js";
import { UniqueSlugGenerator } from "../../shared/application/unique-slug-generator.js";
import { CategoryQueries } from "./application/ports/category-queries.js";
import { CreateCategoryUseCase } from "./application/use-cases/create-category.use-case.js";
import { DeleteCategoryUseCase } from "./application/use-cases/delete-category.use-case.js";
import { GetAdminCategoryUseCase } from "./application/use-cases/get-admin-category.use-case.js";
import { ListAdminCategoriesUseCase } from "./application/use-cases/list-admin-categories.use-case.js";
import { ListCategoryTreeUseCase } from "./application/use-cases/list-category-tree.use-case.js";
import { RestoreCategoryUseCase } from "./application/use-cases/restore-category.use-case.js";
import { UpdateCategoryUseCase } from "./application/use-cases/update-category.use-case.js";
import { CategoryRepository } from "./domain/repositories/category.repository.js";
import { CategoryDeletionPolicy } from "./domain/services/category-deletion.policy.js";
import { DrizzleCategoryQueries } from "./infrastructure/persistence/drizzle-category.queries.js";
import { DrizzleCategoryRepository } from "./infrastructure/persistence/drizzle-category.repository.js";
import { AdminCategoriesController } from "./presentation/http/admin-categories.controller.js";
import { CategoriesController } from "./presentation/http/categories.controller.js";

@Module({
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [
    { provide: CategoryQueries, useClass: DrizzleCategoryQueries },
    { provide: CategoryRepository, useClass: DrizzleCategoryRepository },
    { provide: CategoryDeletionPolicy, useValue: new CategoryDeletionPolicy() },
    { provide: UniqueSlugGenerator, useValue: new UniqueSlugGenerator() },
    {
      provide: ListCategoryTreeUseCase,
      useFactory: (queries: CategoryQueries) => new ListCategoryTreeUseCase(queries),
      inject: [CategoryQueries],
    },
    {
      provide: ListAdminCategoriesUseCase,
      useFactory: (queries: CategoryQueries) => new ListAdminCategoriesUseCase(queries),
      inject: [CategoryQueries],
    },
    {
      provide: GetAdminCategoryUseCase,
      useFactory: (queries: CategoryQueries) => new GetAdminCategoryUseCase(queries),
      inject: [CategoryQueries],
    },
    {
      provide: CreateCategoryUseCase,
      useFactory: (
        categories: CategoryRepository,
        slugs: UniqueSlugGenerator,
        ids: IdGenerator,
        queries: CategoryQueries,
        transaction: TransactionManager,
        clock: Clock,
      ) => new CreateCategoryUseCase(categories, slugs, ids, queries, transaction, clock),
      inject: [
        CategoryRepository,
        UniqueSlugGenerator,
        IdGenerator,
        CategoryQueries,
        TransactionManager,
        Clock,
      ],
    },
    {
      provide: UpdateCategoryUseCase,
      useFactory: (
        categories: CategoryRepository,
        queries: CategoryQueries,
        transaction: TransactionManager,
      ) => new UpdateCategoryUseCase(categories, queries, transaction),
      inject: [CategoryRepository, CategoryQueries, TransactionManager],
    },
    {
      provide: DeleteCategoryUseCase,
      useFactory: (
        categories: CategoryRepository,
        policy: CategoryDeletionPolicy,
        transaction: TransactionManager,
        clock: Clock,
      ) => new DeleteCategoryUseCase(categories, policy, transaction, clock),
      inject: [CategoryRepository, CategoryDeletionPolicy, TransactionManager, Clock],
    },
    {
      provide: RestoreCategoryUseCase,
      useFactory: (
        categories: CategoryRepository,
        queries: CategoryQueries,
        transaction: TransactionManager,
      ) => new RestoreCategoryUseCase(categories, queries, transaction),
      inject: [CategoryRepository, CategoryQueries, TransactionManager],
    },
  ],
})
export class CatalogModule {}
