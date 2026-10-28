import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { AnyPanelRole } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AdminProductImageResult } from "../../application/dto/admin-product-detail.result.js";
import { AddProductImageUseCase } from "../../application/use-cases/add-product-image.use-case.js";
import { ReorderProductImagesUseCase } from "../../application/use-cases/reorder-product-images.use-case.js";
import { ReplaceProductImageFileUseCase } from "../../application/use-cases/replace-product-image-file.use-case.js";
import { RetryProductImageProcessingUseCase } from "../../application/use-cases/retry-product-image-processing.use-case.js";
import { UpdateProductImageUseCase } from "../../application/use-cases/update-product-image.use-case.js";
import { AddProductImageRequestDto } from "./add-product-image.request.dto.js";
import { IMAGE_ID } from "./image-id.pipe.js";
import { PRODUCT_ID } from "./product-id.pipe.js";
import {
  ImageFileFormInterceptor,
  ProductImageFormInterceptor,
} from "./product-image-form.interceptor.js";
import { ReorderProductImagesRequestDto } from "./reorder-product-images.request.dto.js";
import { UpdateProductImageRequestDto } from "./update-product-image.request.dto.js";

/** The images of a product in the admin panel, for admins and sellers. */
@Controller("admin/products/:productId/images")
@AnyPanelRole()
export class ProductImagesController {
  constructor(
    private readonly addProductImage: AddProductImageUseCase,
    private readonly reorderProductImages: ReorderProductImagesUseCase,
    private readonly updateProductImage: UpdateProductImageUseCase,
    private readonly replaceProductImageFile: ReplaceProductImageFileUseCase,
    private readonly retryProductImageProcessing: RetryProductImageProcessingUseCase,
  ) {}

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

  // Declared before ":imageId", which would take it.
  @Patch("order")
  reorder(
    @Param("productId", PRODUCT_ID) productId: string,
    @Body() body: ReorderProductImagesRequestDto,
  ): Promise<AdminProductImageResult[]> {
    return this.reorderProductImages.execute({ productId, imageIds: body.imageIds });
  }

  @Patch(":imageId")
  update(
    @Param("productId", PRODUCT_ID) productId: string,
    @Param("imageId", IMAGE_ID) imageId: string,
    @Body() body: UpdateProductImageRequestDto,
  ): Promise<AdminProductImageResult> {
    return this.updateProductImage.execute({ productId, imageId, altText: body.altText });
  }

  /** `multipart/form-data`: the new file alone, in `image`. */
  @Put(":imageId/file")
  @UseInterceptors(ImageFileFormInterceptor)
  replaceFile(
    @Param("productId", PRODUCT_ID) productId: string,
    @Param("imageId", IMAGE_ID) imageId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AdminProductImageResult> {
    return this.replaceProductImageFile.execute({ productId, imageId, bytes: file.buffer });
  }

  @Post(":imageId/retry")
  @HttpCode(HttpStatus.OK)
  retry(
    @Param("productId", PRODUCT_ID) productId: string,
    @Param("imageId", IMAGE_ID) imageId: string,
  ): Promise<AdminProductImageResult> {
    return this.retryProductImageProcessing.execute({ productId, imageId });
  }
}
