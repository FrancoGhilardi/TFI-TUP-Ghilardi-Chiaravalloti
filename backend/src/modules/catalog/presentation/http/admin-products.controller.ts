import { Body, Controller, Post, UploadedFiles, UseInterceptors } from "@nestjs/common";
import type { AuthUser } from "../../../identity/presentation/auth-user.js";
import { CurrentUser } from "../../../identity/presentation/decorators/current-user.decorator.js";
import { AnyPanelRole } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AdminProductDetailResult } from "../../application/dto/admin-product-detail.result.js";
import { CreateProductUseCase } from "../../application/use-cases/create-product.use-case.js";
import { CreateProductRequestDto } from "./create-product.request.dto.js";
import { ProductFormInterceptor } from "./product-form.interceptor.js";

const optionalDate = (value: string | undefined) =>
  value === undefined ? undefined : new Date(value);

/** Product management in the admin panel, for admins and sellers. */
@Controller("admin/products")
@AnyPanelRole()
export class AdminProductsController {
  constructor(private readonly createProduct: CreateProductUseCase) {}

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
      sale: body.isOnSale
        ? { price: body.salePrice ?? "", endsAt: optionalDate(body.saleEndsAt) }
        : undefined,
      stock: body.stock,
      isFeatured: body.isFeatured,
      newMark: body.isNew ? { until: optionalDate(body.newUntil) } : undefined,
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
}
