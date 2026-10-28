import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from "class-validator";
import { PRODUCT_IMAGES_MAX } from "../../domain/catalog-limits.js";
import { lowerCaseIds } from "./product-request-rules.js";

const ORDER_MESSAGE = "Mandá todas las imágenes del producto, cada una una sola vez.";

/** The ids of the product's images in their new order. */
export class ReorderProductImagesRequestDto {
  // As stored, so an id written in capitals is the same image.
  @Transform(lowerCaseIds)
  @IsArray({ message: ORDER_MESSAGE })
  @ArrayMinSize(1, { message: ORDER_MESSAGE })
  @ArrayMaxSize(PRODUCT_IMAGES_MAX, { message: ORDER_MESSAGE })
  @IsUUID("all", { each: true, message: ORDER_MESSAGE })
  imageIds!: string[];
}
