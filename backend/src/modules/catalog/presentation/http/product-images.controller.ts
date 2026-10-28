import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { AnyPanelRole } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AdminProductImageResult } from "../../application/dto/admin-product-detail.result.js";
import { AddProductImageUseCase } from "../../application/use-cases/add-product-image.use-case.js";
import { AddProductImageRequestDto } from "./add-product-image.request.dto.js";
import { PRODUCT_ID } from "./product-id.pipe.js";
import { ProductImageFormInterceptor } from "./product-image-form.interceptor.js";

/** The images of a product in the admin panel, for admins and sellers. */
@Controller("admin/products/:productId/images")
@AnyPanelRole()
export class ProductImagesController {
  constructor(private readonly addProductImage: AddProductImageUseCase) {}

  /** `multipart/form-data`: one file in `image` and an optional `altText`. */
  @Post()
  @UseInterceptors(ProductImageFormInterceptor)
  add(
    @Param("productId", PRODUCT_ID) productId: string,
    @Body() body: AddProductImageRequestDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AdminProductImageResult> {
    return this.addProductImage.execute({
      productId,
      image: { bytes: file.buffer, altText: body.altText },
    });
  }
}
