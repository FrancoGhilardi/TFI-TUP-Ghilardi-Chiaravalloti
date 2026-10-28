import { IsOptional, IsString } from "class-validator";

/** The text fields of an image upload; its length is a rule of the image itself. */
export class AddProductImageRequestDto {
  @IsOptional()
  @IsString({ message: "El texto alternativo tiene que ser un texto." })
  altText?: string;
}
