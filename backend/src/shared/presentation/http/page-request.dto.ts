import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import type { PageRequest } from "../../application/pagination.js";

const PAGE_MESSAGE = "La página tiene que ser un número entero desde 1.";
const LIMIT_MESSAGE = "La cantidad por página tiene que ser un número entero entre 1 y 100.";

/** The page of a panel listing in the query string: the first one of 20 when left out. */
export class PageRequestDto implements PageRequest {
  @Type(() => Number)
  @IsInt({ message: PAGE_MESSAGE })
  @Min(1, { message: PAGE_MESSAGE })
  page = 1;

  @Type(() => Number)
  @IsInt({ message: LIMIT_MESSAGE })
  @Min(1, { message: LIMIT_MESSAGE })
  @Max(100, { message: LIMIT_MESSAGE })
  limit = 20;
}
