import { IsString } from "class-validator";

/** The image's alt text; a blank one removes it, and its length is a rule of the image. */
export class UpdateProductImageRequestDto {
  @IsString({ message: "Mandá el texto alternativo; vacío lo quita." })
  altText!: string;
}
