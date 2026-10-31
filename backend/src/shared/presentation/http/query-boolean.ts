import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { queryBoolean } from "./query-transforms.js";

export const QUERY_BOOLEAN_MESSAGE = "Elegí true o false.";

/** An optional "true" or "false" in the query string, read and refused alike in every listing. */
export const IsQueryBoolean = () =>
  applyDecorators(
    IsOptional(),
    Transform(queryBoolean),
    IsBoolean({ message: QUERY_BOOLEAN_MESSAGE }),
  );
