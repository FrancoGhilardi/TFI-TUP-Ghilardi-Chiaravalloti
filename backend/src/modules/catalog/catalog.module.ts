import { Module } from "@nestjs/common";
import { BackgroundTasks } from "../../shared/application/background-tasks.js";
import { Clock } from "../../shared/application/clock.js";
import { EventPublisher } from "../../shared/application/event-publisher.js";
import { FileStorage } from "../../shared/application/file-storage.js";
import { IdGenerator } from "../../shared/application/id-generator.js";
import { TransactionManager } from "../../shared/application/transaction-manager.js";
import { UniqueSlugGenerator } from "../../shared/application/unique-slug-generator.js";
import { AdminProductQueries } from "./application/ports/admin-product-queries.js";
import { CatalogQueries } from "./application/ports/catalog-queries.js";
import { CategoryQueries } from "./application/ports/category-queries.js";
import { ImageProcessor } from "./application/ports/image-processor.js";
import { SkuGenerator } from "./application/ports/sku-generator.js";
import { ImageKeyFactory } from "./application/services/image-key-factory.js";
import { ProductImageUploader } from "./application/services/product-image-uploader.js";
import { CatalogSettings } from "./application/settings/catalog-settings.js";
import { ImageSettings } from "./application/settings/image-settings.js";
import { AddProductImageUseCase } from "./application/use-cases/add-product-image.use-case.js";
import { CreateCategoryUseCase } from "./application/use-cases/create-category.use-case.js";
import { CreateProductUseCase } from "./application/use-cases/create-product.use-case.js";
import { DeleteCategoryUseCase } from "./application/use-cases/delete-category.use-case.js";
import { DeleteProductImageUseCase } from "./application/use-cases/delete-product-image.use-case.js";
import { DeleteProductUseCase } from "./application/use-cases/delete-product.use-case.js";
import { ExpireProductMarksUseCase } from "./application/use-cases/expire-product-marks.use-case.js";
import { GetAdminCategoryUseCase } from "./application/use-cases/get-admin-category.use-case.js";
import { GetAdminProductUseCase } from "./application/use-cases/get-admin-product.use-case.js";
import { GetProductDetailUseCase } from "./application/use-cases/get-product-detail.use-case.js";
import { GlobalSearchUseCase } from "./application/use-cases/global-search.use-case.js";
import { ListAdminCategoriesUseCase } from "./application/use-cases/list-admin-categories.use-case.js";
import { ListAdminProductsUseCase } from "./application/use-cases/list-admin-products.use-case.js";
import { ListProductImagesUseCase } from "./application/use-cases/list-product-images.use-case.js";
import { ListCategoryTreeUseCase } from "./application/use-cases/list-category-tree.use-case.js";
import { ListFeaturedProductsUseCase } from "./application/use-cases/list-featured-products.use-case.js";
import { ListNewProductsUseCase } from "./application/use-cases/list-new-products.use-case.js";
import { ProcessProductImageUseCase } from "./application/use-cases/process-product-image.use-case.js";
import { ReorderProductImagesUseCase } from "./application/use-cases/reorder-product-images.use-case.js";
import { ReplaceProductImageFileUseCase } from "./application/use-cases/replace-product-image-file.use-case.js";
import { RestoreCategoryUseCase } from "./application/use-cases/restore-category.use-case.js";
import { RestoreProductUseCase } from "./application/use-cases/restore-product.use-case.js";
import { RetryProductImageProcessingUseCase } from "./application/use-cases/retry-product-image-processing.use-case.js";
import { SearchCatalogUseCase } from "./application/use-cases/search-catalog.use-case.js";
import { UpdateCategoryUseCase } from "./application/use-cases/update-category.use-case.js";
import { UpdateProductImageUseCase } from "./application/use-cases/update-product-image.use-case.js";
import { UpdateProductUseCase } from "./application/use-cases/update-product.use-case.js";
import { CategoryRepository } from "./domain/repositories/category.repository.js";
import { ProductImageRepository } from "./domain/repositories/product-image.repository.js";
import { ProductRepository } from "./domain/repositories/product.repository.js";
import { CategoryDeletionPolicy } from "./domain/services/category-deletion.policy.js";
import { ProductImagePolicy } from "./domain/services/product-image.policy.js";
import { SharpImageProcessor } from "./infrastructure/images/sharp-image-processor.js";
import { DrizzleAdminProductQueries } from "./infrastructure/persistence/drizzle-admin-product.queries.js";
import { DrizzleCatalogQueries } from "./infrastructure/persistence/drizzle-catalog.queries.js";
import { DrizzleCategoryQueries } from "./infrastructure/persistence/drizzle-category.queries.js";
import { DrizzleCategoryRepository } from "./infrastructure/persistence/drizzle-category.repository.js";
import { DrizzleProductImageRepository } from "./infrastructure/persistence/drizzle-product-image.repository.js";
import { DrizzleProductRepository } from "./infrastructure/persistence/drizzle-product.repository.js";
import { DrizzleSkuGenerator } from "./infrastructure/persistence/drizzle-sku.generator.js";
import { AdminCategoriesController } from "./presentation/http/admin-categories.controller.js";
import { AdminProductsController } from "./presentation/http/admin-products.controller.js";
import { CatalogController } from "./presentation/http/catalog.controller.js";
import { CategoriesController } from "./presentation/http/categories.controller.js";
import { ProductImagesController } from "./presentation/http/product-images.controller.js";
import { SearchController } from "./presentation/http/search.controller.js";
import { ProductImageUploadedListener } from "./presentation/listeners/product-image-uploaded.listener.js";
import { ProductMarksExpiryScheduler } from "./presentation/schedulers/product-marks-expiry.scheduler.js";

@Module({
  controllers: [
    CategoriesController,
    AdminCategoriesController,
    CatalogController,
    AdminProductsController,
    ProductImagesController,
    SearchController,
  ],
  providers: [
    { provide: CategoryQueries, useClass: DrizzleCategoryQueries },
    { provide: CategoryRepository, useClass: DrizzleCategoryRepository },
    { provide: CategoryDeletionPolicy, useValue: new CategoryDeletionPolicy() },
    { provide: UniqueSlugGenerator, useValue: new UniqueSlugGenerator() },
    { provide: ProductRepository, useClass: DrizzleProductRepository },
    { provide: ProductImageRepository, useClass: DrizzleProductImageRepository },
    { provide: SkuGenerator, useClass: DrizzleSkuGenerator },
    { provide: AdminProductQueries, useClass: DrizzleAdminProductQueries },
    { provide: CatalogQueries, useClass: DrizzleCatalogQueries },
    { provide: CatalogSettings, useValue: new CatalogSettings() },
    {
      provide: SearchCatalogUseCase,
      useFactory: (queries: CatalogQueries, settings: CatalogSettings, clock: Clock) =>
        new SearchCatalogUseCase(queries, settings, clock),
      inject: [CatalogQueries, CatalogSettings, Clock],
    },
    {
      provide: ListFeaturedProductsUseCase,
      useFactory: (queries: CatalogQueries, settings: CatalogSettings, clock: Clock) =>
        new ListFeaturedProductsUseCase(queries, settings, clock),
      inject: [CatalogQueries, CatalogSettings, Clock],
    },
    {
      provide: ListNewProductsUseCase,
      useFactory: (queries: CatalogQueries, settings: CatalogSettings, clock: Clock) =>
        new ListNewProductsUseCase(queries, settings, clock),
      inject: [CatalogQueries, CatalogSettings, Clock],
    },
    {
      provide: GetProductDetailUseCase,
      useFactory: (queries: CatalogQueries, settings: CatalogSettings, clock: Clock) =>
        new GetProductDetailUseCase(queries, settings, clock),
      inject: [CatalogQueries, CatalogSettings, Clock],
    },
    {
      provide: GlobalSearchUseCase,
      useFactory: (
        catalog: CatalogQueries,
        categories: CategoryQueries,
        settings: CatalogSettings,
        clock: Clock,
      ) => new GlobalSearchUseCase(catalog, categories, settings, clock),
      inject: [CatalogQueries, CategoryQueries, CatalogSettings, Clock],
    },
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
    {
      provide: UpdateProductUseCase,
      useFactory: (
        products: ProductRepository,
        categories: CategoryRepository,
        transaction: TransactionManager,
        queries: AdminProductQueries,
        clock: Clock,
      ) => new UpdateProductUseCase(products, categories, transaction, queries, clock),
      inject: [
        ProductRepository,
        CategoryRepository,
        TransactionManager,
        AdminProductQueries,
        Clock,
      ],
    },
    {
      provide: DeleteProductUseCase,
      useFactory: (products: ProductRepository, transaction: TransactionManager, clock: Clock) =>
        new DeleteProductUseCase(products, transaction, clock),
      inject: [ProductRepository, TransactionManager, Clock],
    },
    {
      provide: ImageProcessor,
      useFactory: (settings: ImageSettings) => new SharpImageProcessor(settings),
      inject: [ImageSettings],
    },
    {
      provide: ProcessProductImageUseCase,
      useFactory: (
        images: ProductImageRepository,
        processor: ImageProcessor,
        keys: ImageKeyFactory,
        uploader: ProductImageUploader,
        ids: IdGenerator,
        transaction: TransactionManager,
      ) => new ProcessProductImageUseCase({ images, processor, keys, uploader, ids, transaction }),
      inject: [
        ProductImageRepository,
        ImageProcessor,
        ImageKeyFactory,
        ProductImageUploader,
        IdGenerator,
        TransactionManager,
      ],
    },
    ProductImageUploadedListener,
    {
      provide: AddProductImageUseCase,
      useFactory: (
        products: ProductRepository,
        images: ProductImageRepository,
        policy: ProductImagePolicy,
        uploader: ProductImageUploader,
        keys: ImageKeyFactory,
        ids: IdGenerator,
        settings: ImageSettings,
        transaction: TransactionManager,
        events: EventPublisher,
        background: BackgroundTasks,
        queries: AdminProductQueries,
        clock: Clock,
      ) =>
        new AddProductImageUseCase({
          products,
          images,
          policy,
          uploader,
          keys,
          ids,
          settings,
          transaction,
          events,
          background,
          queries,
          clock,
        }),
      inject: [
        ProductRepository,
        ProductImageRepository,
        ProductImagePolicy,
        ProductImageUploader,
        ImageKeyFactory,
        IdGenerator,
        ImageSettings,
        TransactionManager,
        EventPublisher,
        BackgroundTasks,
        AdminProductQueries,
        Clock,
      ],
    },
    {
      provide: ReorderProductImagesUseCase,
      useFactory: (
        products: ProductRepository,
        images: ProductImageRepository,
        policy: ProductImagePolicy,
        transaction: TransactionManager,
        queries: AdminProductQueries,
      ) => new ReorderProductImagesUseCase(products, images, policy, transaction, queries),
      inject: [
        ProductRepository,
        ProductImageRepository,
        ProductImagePolicy,
        TransactionManager,
        AdminProductQueries,
      ],
    },
    {
      provide: UpdateProductImageUseCase,
      useFactory: (
        products: ProductRepository,
        images: ProductImageRepository,
        transaction: TransactionManager,
        queries: AdminProductQueries,
      ) => new UpdateProductImageUseCase(products, images, transaction, queries),
      inject: [ProductRepository, ProductImageRepository, TransactionManager, AdminProductQueries],
    },
    {
      provide: ReplaceProductImageFileUseCase,
      useFactory: (
        products: ProductRepository,
        images: ProductImageRepository,
        uploader: ProductImageUploader,
        keys: ImageKeyFactory,
        ids: IdGenerator,
        settings: ImageSettings,
        transaction: TransactionManager,
        events: EventPublisher,
        background: BackgroundTasks,
        queries: AdminProductQueries,
      ) =>
        new ReplaceProductImageFileUseCase({
          products,
          images,
          uploader,
          keys,
          ids,
          settings,
          transaction,
          events,
          background,
          queries,
        }),
      inject: [
        ProductRepository,
        ProductImageRepository,
        ProductImageUploader,
        ImageKeyFactory,
        IdGenerator,
        ImageSettings,
        TransactionManager,
        EventPublisher,
        BackgroundTasks,
        AdminProductQueries,
      ],
    },
    {
      provide: RetryProductImageProcessingUseCase,
      useFactory: (
        products: ProductRepository,
        images: ProductImageRepository,
        transaction: TransactionManager,
        events: EventPublisher,
        background: BackgroundTasks,
        queries: AdminProductQueries,
      ) =>
        new RetryProductImageProcessingUseCase(
          products,
          images,
          transaction,
          events,
          background,
          queries,
        ),
      inject: [
        ProductRepository,
        ProductImageRepository,
        TransactionManager,
        EventPublisher,
        BackgroundTasks,
        AdminProductQueries,
      ],
    },
    {
      provide: ListProductImagesUseCase,
      useFactory: (queries: AdminProductQueries) => new ListProductImagesUseCase(queries),
      inject: [AdminProductQueries],
    },
    {
      provide: ListAdminProductsUseCase,
      useFactory: (queries: AdminProductQueries, clock: Clock) =>
        new ListAdminProductsUseCase(queries, clock),
      inject: [AdminProductQueries, Clock],
    },
    {
      provide: GetAdminProductUseCase,
      useFactory: (queries: AdminProductQueries) => new GetAdminProductUseCase(queries),
      inject: [AdminProductQueries],
    },
    {
      provide: DeleteProductImageUseCase,
      useFactory: (
        products: ProductRepository,
        images: ProductImageRepository,
        policy: ProductImagePolicy,
        uploader: ProductImageUploader,
        transaction: TransactionManager,
      ) => new DeleteProductImageUseCase(products, images, policy, uploader, transaction),
      inject: [
        ProductRepository,
        ProductImageRepository,
        ProductImagePolicy,
        ProductImageUploader,
        TransactionManager,
      ],
    },
    {
      provide: ExpireProductMarksUseCase,
      useFactory: (products: ProductRepository, clock: Clock) =>
        new ExpireProductMarksUseCase(products, clock),
      inject: [ProductRepository, Clock],
    },
    ProductMarksExpiryScheduler,
    {
      provide: RestoreProductUseCase,
      useFactory: (
        products: ProductRepository,
        categories: CategoryRepository,
        transaction: TransactionManager,
        queries: AdminProductQueries,
      ) => new RestoreProductUseCase(products, categories, transaction, queries),
      inject: [ProductRepository, CategoryRepository, TransactionManager, AdminProductQueries],
    },
  ],
})
export class CatalogModule {}
