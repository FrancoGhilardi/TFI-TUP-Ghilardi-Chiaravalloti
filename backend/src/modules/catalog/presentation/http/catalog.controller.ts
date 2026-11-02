import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiErrors,
  VALIDATION_FAILED,
} from "../../../../shared/presentation/http/openapi-decorators.js";
import {
  ProductCardPageResponseDto,
  ProductCardResponseDto,
  ProductDetailResponseDto,
} from "./product.response.dto.js";
import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import type { Page } from "../../../../shared/application/pagination.js";
import { Public } from "../../../identity/presentation/decorators/public.decorator.js";
import type { ProductCardResult } from "../../application/dto/product-card.result.js";
import type { ProductDetailResult } from "../../application/dto/product-detail.result.js";
import { GetProductDetailUseCase } from "../../application/use-cases/get-product-detail.use-case.js";
import { ListFeaturedProductsUseCase } from "../../application/use-cases/list-featured-products.use-case.js";
import { ListNewProductsUseCase } from "../../application/use-cases/list-new-products.use-case.js";
import { SearchCatalogUseCase } from "../../application/use-cases/search-catalog.use-case.js";
import { STORE_PRODUCT_ROUTES } from "../../domain/reserved-slugs.js";
import { SearchCatalogRequestDto } from "./search-catalog.request.dto.js";
import { STORE_CACHE_CONTROL } from "./store-cache.js";

/** The products the store shows. */
@ApiTags("Products")
@Controller("products")
@Public()
export class CatalogController {
  constructor(
    private readonly searchCatalog: SearchCatalogUseCase,
    private readonly getProductDetail: GetProductDetailUseCase,
    private readonly listFeaturedProducts: ListFeaturedProductsUseCase,
    private readonly listNewProducts: ListNewProductsUseCase,
  ) {}

  @Get()
  @Header("Cache-Control", STORE_CACHE_CONTROL)
  @ApiOperation({ summary: "The store catalog: search, filters, order and pages" })
  @ApiOkResponse({ type: ProductCardPageResponseDto })
  @ApiErrors({ 400: [VALIDATION_FAILED, "INVALID_PRICE_RANGE"] })
  findAll(@Query() query: SearchCatalogRequestDto): Promise<Page<ProductCardResult>> {
    return this.searchCatalog.execute({
      categorySlug: query.categorySlug,
      q: query.q,
      isFeatured: query.isFeatured,
      isNew: query.isNew,
      isOnSale: query.isOnSale,
      inStock: query.inStock,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
  }

  // Declared before ":slug", which would take them; no product can have these slugs
  // (`RESERVED_PRODUCT_SLUGS`).
  @Get(STORE_PRODUCT_ROUTES.featured)
  @Header("Cache-Control", STORE_CACHE_CONTROL)
  @ApiOperation({ summary: "Up to 5 featured products, for the home page" })
  @ApiOkResponse({ type: [ProductCardResponseDto] })
  findFeatured(): Promise<ProductCardResult[]> {
    return this.listFeaturedProducts.execute();
  }

  @Get(STORE_PRODUCT_ROUTES.new)
  @Header("Cache-Control", STORE_CACHE_CONTROL)
  @ApiOperation({ summary: "Up to 5 products with a running new mark, for the home page" })
  @ApiOkResponse({ type: [ProductCardResponseDto] })
  findNew(): Promise<ProductCardResult[]> {
    return this.listNewProducts.execute();
  }

  @Get(":slug")
  @Header("Cache-Control", STORE_CACHE_CONTROL)
  @ApiOperation({ summary: "The page of a visible product, by its slug" })
  @ApiOkResponse({ type: ProductDetailResponseDto })
  @ApiErrors({ 404: ["PRODUCT_NOT_FOUND"] })
  findOne(@Param("slug") slug: string): Promise<ProductDetailResult> {
    return this.getProductDetail.execute(slug);
  }
}
