import { applyDecorators } from "@nestjs/common";
import { IsString, MaxLength, MinLength } from "class-validator";

const TEXT_MIN_LENGTH = 2;
const TEXT_MAX_LENGTH = 100;
export const SEARCH_TEXT_MESSAGE = `Escribí entre ${TEXT_MIN_LENGTH} y ${TEXT_MAX_LENGTH} caracteres para buscar.`;

/** The text of a store search, already trimmed: the same length wherever the store searches. */
export const IsSearchText = () =>
  applyDecorators(
    IsString({ message: SEARCH_TEXT_MESSAGE }),
    MinLength(TEXT_MIN_LENGTH, { message: SEARCH_TEXT_MESSAGE }),
    MaxLength(TEXT_MAX_LENGTH, { message: SEARCH_TEXT_MESSAGE }),
  );
