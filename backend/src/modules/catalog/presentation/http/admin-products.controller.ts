import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import type { AuthUser } from "../../../identity/presentation/auth-user.js";
import { CurrentUser } from "../../../identity/presentation/decorators/current-user.decorator.js";
import { AnyPanelRole } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AdminProductDetailResult } from "../../application/dto/admin-product-detail.result.js";
import { CreateProductUseCase } from "../../application/use-cases/create-product.use-case.js";
import { DeleteProductUseCase } from "../../application/use-cases/delete-product.use-case.js";
import { RestoreProductUseCase } from "../../application/use-cases/restore-product.use-case.js";
import { UpdateProductUseCase } from "../../application/use-cases/update-product.use-case.js";
import { CreateProductRequestDto } from "./create-product.request.dto.js";
import { ProductFormInterceptor } from "./product-form.interceptor.js";
import { PRODUCT_ID } from "./product-id.pipe.js";
import { UpdateProductRequestDto } from "./update-product.request.dto.js";

const optionalDate = (value: string | undefined) =>
  value === undefined ? undefined : new Date(value);

/** A block such as the sale: left alone without its flag, built when on, removed when off. */
const blockOf = <T>(flag: boolean | undefined, build: () => T): T | null | undefined =>
  flag === undefined ? undefined : flag ? build() : null;

const saleOf = (body: { salePrice?: string; saleEndsAt?: string }) => ({
  price: body.salePrice ?? "",
  endsAt: optionalDate(body.saleEndsAt),
});

const newMarkOf = (body: { newUntil?: string }) => ({ until: optionalDate(body.newUntil) });

/** Product management in the admin panel, for admins and sellers. */
@Controller("admin/products")
@AnyPanelRole()
export class AdminProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly deleteProduct: DeleteProductUseCase,
    private readonly restoreProduct: RestoreProductUseCase,
  ) {}

  /** `multipart/form-data`: the product as JSON in `data` and from 1 to 5 files in `images`. */
  @Post()
  @UseInterceptors(ProductFormInterceptor)
  create(
    @Body() body: CreateProductRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() actor: AuthUser,
  ): Promise<AdminProductDetailResult> {
    return this.createProduct.execute({
      actorId: actor.id,
      title: body.title,
      description: body.description,
      price: body.price,
      sale: body.isOnSale ? saleOf(body) : undefined,
      stock: body.stock,
      isFeatured: body.isFeatured,
      newMark: body.isNew ? newMarkOf(body) : undefined,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      categoryIds: body.categoryIds,
      primaryCategoryId: body.primaryCategoryId,
      relatedProductIds: body.relatedProductIds,
      images: files.map((file, index) => ({
        bytes: file.buffer,
        altText: body.imageAltTexts?.[index],
      })),
    });
  }

  @Patch(":id")
  update(
    @Param("id", PRODUCT_ID) id: string,
    @Body() body: UpdateProductRequestDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AdminProductDetailResult> {
    return this.updateProduct.execute({
      productId: id,
      actorId: actor.id,
      title: body.title,
      description: body.description,
      price: body.price,
      sale: blockOf(body.isOnSale, () => saleOf(body)),
      stock: body.stock,
      isFeatured: body.isFeatured,
      newMark: blockOf(body.isNew, () => newMarkOf(body)),
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      categories:
        body.categoryIds && body.primaryCategoryId
          ? { ids: body.categoryIds, primaryId: body.primaryCategoryId }
          : undefined,
      relatedProductIds: body.relatedProductIds,
    });
  }

  /** A logical deletion: the product stays, with its images, and can be restored. */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", PRODUCT_ID) id: string, @CurrentUser() actor: AuthUser): Promise<void> {
    return this.deleteProduct.execute({ productId: id, actorId: actor.id });
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  restore(
    @Param("id", PRODUCT_ID) id: string,
    @CurrentUser() actor: AuthUser,
  ): Promise<AdminProductDetailResult> {
    return this.restoreProduct.execute({ productId: id, actorId: actor.id });
  }
}
