import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiErrors,
  VALIDATION_FAILED,
} from "../../../../shared/presentation/http/openapi-decorators.js";
import { AdminProductImageResponseDto } from "./admin-product.response.dto.js";
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { stackWithCauses } from "../../../../shared/application/error-stack.js";
import { AnyPanelRole } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AdminProductImageResult } from "../../application/dto/admin-product-detail.result.js";
import { AddProductImageUseCase } from "../../application/use-cases/add-product-image.use-case.js";
import { DeleteProductImageUseCase } from "../../application/use-cases/delete-product-image.use-case.js";
import { ListProductImagesUseCase } from "../../application/use-cases/list-product-images.use-case.js";
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
@ApiTags("Product images")
@ApiErrors({ 403: ["PASSWORD_CHANGE_REQUIRED"] })
@Controller("admin/products/:productId/images")
@AnyPanelRole()
export class ProductImagesController {
  private readonly logger = new Logger(ProductImagesController.name);

  constructor(
    private readonly addProductImage: AddProductImageUseCase,
    private readonly reorderProductImages: ReorderProductImagesUseCase,
    private readonly updateProductImage: UpdateProductImageUseCase,
    private readonly replaceProductImageFile: ReplaceProductImageFileUseCase,
    private readonly retryProductImageProcessing: RetryProductImageProcessingUseCase,
    private readonly deleteProductImage: DeleteProductImageUseCase,
    private readonly listProductImages: ListProductImagesUseCase,
  ) {}

  /** Read again while images are processed; its preview links expire, so it is never kept. */
  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "The images of a product, by position, with their state" })
  @ApiOkResponse({ type: [AdminProductImageResponseDto] })
  @ApiErrors({ 404: ["PRODUCT_NOT_FOUND"] })
  findAll(@Param("productId", PRODUCT_ID) productId: string): Promise<AdminProductImageResult[]> {
    return this.listProductImages.execute(productId);
  }

  /** `multipart/form-data`: one file in `image` and an optional `altText`. */
  @Post()
  @UseInterceptors(ProductImageFormInterceptor)
  @ApiOperation({ summary: "Add an image; it is processed in the background" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["image"],
      properties: {
        image: {
          type: "string",
          format: "binary",
          description: "A JPEG, PNG or WebP file of up to 10 MB.",
        },
        altText: { type: "string", maxLength: 255 },
      },
    },
  })
  @ApiCreatedResponse({ type: AdminProductImageResponseDto })
  @ApiErrors({
    400: [VALIDATION_FAILED, "INVALID_IMAGE"],
    404: ["PRODUCT_NOT_FOUND"],
    422: ["PRODUCT_DELETED", "PRODUCT_IMAGE_LIMIT_REACHED"],
    502: ["IMAGE_UPLOAD_FAILED"],
  })
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
  @ApiOperation({ summary: "Set the order of every image of the product" })
  @ApiOkResponse({ type: [AdminProductImageResponseDto] })
  @ApiErrors({
    400: [VALIDATION_FAILED, "INVALID_IMAGE_ORDER"],
    404: ["PRODUCT_NOT_FOUND"],
    422: ["PRODUCT_DELETED"],
  })
  reorder(
    @Param("productId", PRODUCT_ID) productId: string,
    @Body() body: ReorderProductImagesRequestDto,
  ): Promise<AdminProductImageResult[]> {
    return this.reorderProductImages.execute({ productId, imageIds: body.imageIds });
  }

  @Patch(":imageId")
  @ApiOperation({ summary: "Change the alternative text; an empty one removes it" })
  @ApiOkResponse({ type: AdminProductImageResponseDto })
  @ApiErrors({
    400: [VALIDATION_FAILED, "INVALID_IMAGE"],
    404: ["PRODUCT_NOT_FOUND", "PRODUCT_IMAGE_NOT_FOUND"],
    422: ["PRODUCT_DELETED"],
  })
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
  @ApiOperation({
    summary: "Replace the file; the public version stays until the new one is ready",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["image"],
      properties: {
        image: {
          type: "string",
          format: "binary",
          description: "A JPEG, PNG or WebP file of up to 10 MB.",
        },
      },
    },
  })
  @ApiOkResponse({ type: AdminProductImageResponseDto })
  @ApiErrors({
    400: [VALIDATION_FAILED, "INVALID_IMAGE"],
    404: ["PRODUCT_NOT_FOUND", "PRODUCT_IMAGE_NOT_FOUND"],
    422: ["PRODUCT_DELETED"],
    502: ["IMAGE_UPLOAD_FAILED"],
  })
  replaceFile(
    @Param("productId", PRODUCT_ID) productId: string,
    @Param("imageId", IMAGE_ID) imageId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AdminProductImageResult> {
    return this.replaceProductImageFile.execute({ productId, imageId, bytes: file.buffer });
  }

  @Post(":imageId/retry")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Process again an image whose processing failed" })
  @ApiOkResponse({ type: AdminProductImageResponseDto })
  @ApiErrors({
    404: ["PRODUCT_NOT_FOUND", "PRODUCT_IMAGE_NOT_FOUND"],
    422: ["PRODUCT_DELETED", "IMAGE_NOT_FAILED"],
  })
  retry(
    @Param("productId", PRODUCT_ID) productId: string,
    @Param("imageId", IMAGE_ID) imageId: string,
  ): Promise<AdminProductImageResult> {
    return this.retryProductImageProcessing.execute({ productId, imageId });
  }

  /** The image is gone either way; files the storage kept are logged to be removed by hand. */
  @Delete(":imageId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an image and its files; never the last one" })
  @ApiNoContentResponse()
  @ApiErrors({
    404: ["PRODUCT_NOT_FOUND", "PRODUCT_IMAGE_NOT_FOUND"],
    422: ["PRODUCT_DELETED", "LAST_PRODUCT_IMAGE"],
  })
  async remove(
    @Param("productId", PRODUCT_ID) productId: string,
    @Param("imageId", IMAGE_ID) imageId: string,
  ): Promise<void> {
    const deleted = await this.deleteProductImage.execute({ productId, imageId });
    for (const file of deleted.leftovers) {
      // A single text, so the logger never takes the details for its context.
      this.logger.error(
        `File ${file.key} of the deleted image ${deleted.imageId} was left in storage\n${stackWithCauses(file.cause)}`,
      );
    }
  }
}
