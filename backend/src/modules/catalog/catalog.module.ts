import { Module } from "@nestjs/common";
import { BackgroundTasks } from "../../shared/application/background-tasks.js";
import { Clock } from "../../shared/application/clock.js";
import { EventPublisher } from "../../shared/application/event-publisher.js";
import { FileStorage } from "../../shared/application/file-storage.js";
import { IdGenerator } from "../../shared/application/id-generator.js";
import { TransactionManager } from "../../shared/application/transaction-manager.js";
import { UniqueSlugGenerator } from "../../shared/application/unique-slug-generator.js";
import { AdminProductQueries } from "./application/ports/admin-product-queries.js";
import { CategoryQueries } from "./application/ports/category-queries.js";
import { SkuGenerator } from "./application/ports/sku-generator.js";
import { ImageKeyFactory } from "./application/services/image-key-factory.js";
import { ProductImageUploader } from "./application/services/product-image-uploader.js";
import { ImageSettings } from "./application/settings/image-settings.js";
import { CreateCategoryUseCase } from "./application/use-cases/create-category.use-case.js";
import { CreateProductUseCase } from "./application/use-cases/create-product.use-case.js";
import { DeleteCategoryUseCase } from "./application/use-cases/delete-category.use-case.js";
import { GetAdminCategoryUseCase } from "./application/use-cases/get-admin-category.use-case.js";
import { ListAdminCategoriesUseCase } from "./application/use-cases/list-admin-categories.use-case.js";
import { ListCategoryTreeUseCase } from "./application/use-cases/list-category-tree.use-case.js";
import { RestoreCategoryUseCase } from "./application/use-cases/restore-category.use-case.js";
import { UpdateCategoryUseCase } from "./application/use-cases/update-category.use-case.js";
import { CategoryRepository } from "./domain/repositories/category.repository.js";
import { ProductImageRepository } from "./domain/repositories/product-image.repository.js";
import { ProductRepository } from "./domain/repositories/product.repository.js";
import { CategoryDeletionPolicy } from "./domain/services/category-deletion.policy.js";
import { ProductImagePolicy } from "./domain/services/product-image.policy.js";
import { DrizzleAdminProductQueries } from "./infrastructure/persistence/drizzle-admin-product.queries.js";
import { DrizzleCategoryQueries } from "./infrastructure/persistence/drizzle-category.queries.js";
import { DrizzleCategoryRepository } from "./infrastructure/persistence/drizzle-category.repository.js";
import { DrizzleProductImageRepository } from "./infrastructure/persistence/drizzle-product-image.repository.js";
import { DrizzleProductRepository } from "./infrastructure/persistence/drizzle-product.repository.js";
import { DrizzleSkuGenerator } from "./infrastructure/persistence/drizzle-sku.generator.js";
import { AdminCategoriesController } from "./presentation/http/admin-categories.controller.js";
import { AdminProductsController } from "./presentation/http/admin-products.controller.js";
import { CategoriesController } from "./presentation/http/categories.controller.js";

@Module({
  controllers: [CategoriesController, AdminCategoriesController, AdminProductsController],
  providers: [
    { provide: CategoryQueries, useClass: DrizzleCategoryQueries },
    { provide: CategoryRepository, useClass: DrizzleCategoryRepository },
    { provide: CategoryDeletionPolicy, useValue: new CategoryDeletionPolicy() },
    { provide: UniqueSlugGenerator, useValue: new UniqueSlugGenerator() },
    { provide: ProductRepository, useClass: DrizzleProductRepository },
    { provide: ProductImageRepository, useClass: DrizzleProductImageRepository },
    { provide: SkuGenerator, useClass: DrizzleSkuGenerator },
    { provide: AdminProductQueries, useClass: DrizzleAdminProductQueries },
    { provide: ProductImagePolicy, useValue: new ProductImagePolicy() },
    { provide: ImageSettings, useValue: new ImageSettings() },
    { provide: ImageKeyFactory, useValue: new ImageKeyFactory() },
    {
      provide: ProductImageUploader,
      useFactory: (storage: FileStorage) => new ProductImageUploader(storage),
      inject: [FileStorage],
    },
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
    {
      provide: CreateProductUseCase,
      useFactory: (
        products: ProductRepository,
        categories: CategoryRepository,
        images: ProductImageRepository,
        imagePolicy: ProductImagePolicy,
        imageSettings: ImageSettings,
        keys: ImageKeyFactory,
        uploader: ProductImageUploader,
        skus: SkuGenerator,
        slugs: UniqueSlugGenerator,
        ids: IdGenerator,
        transaction: TransactionManager,
        events: EventPublisher,
        background: BackgroundTasks,
        queries: AdminProductQueries,
        clock: Clock,
      ) =>
        new CreateProductUseCase({
          products,
          categories,
          images,
          imagePolicy,
          imageSettings,
          keys,
          uploader,
          skus,
          slugs,
          ids,
          transaction,
          events,
          background,
          queries,
          clock,
        }),
      inject: [
        ProductRepository,
        CategoryRepository,
        ProductImageRepository,
        ProductImagePolicy,
        ImageSettings,
        ImageKeyFactory,
        ProductImageUploader,
        SkuGenerator,
        UniqueSlugGenerator,
        IdGenerator,
        TransactionManager,
        EventPublisher,
        BackgroundTasks,
        AdminProductQueries,
        Clock,
      ],
    },
  ],
})
export class CatalogModule {}
