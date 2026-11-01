import "reflect-metadata";
import { ApiErrors } from "./openapi-decorators.js";
import { ErrorResponseDto } from "./error-response.dto.js";

// Where @nestjs/swagger keeps the responses of a handler.
const API_RESPONSE = "swagger/apiResponse";

class Probe {
  @ApiErrors({ 404: ["PRODUCT_NOT_FOUND"], 422: ["PRODUCT_DELETED", "LAST_PRODUCT_IMAGE"] })
  handle(): void {}
}

describe("ApiErrors", () => {
  it("documents each status with the error body and the codes it can carry", () => {
    const handler = Object.getOwnPropertyDescriptor(Probe.prototype, "handle")?.value as object;

    expect(Reflect.getMetadata(API_RESPONSE, handler)).toEqual({
      "404": expect.objectContaining({
        type: ErrorResponseDto,
        description: "Codes: `PRODUCT_NOT_FOUND`.",
      }) as unknown,
      "422": expect.objectContaining({
        type: ErrorResponseDto,
        description: "Codes: `PRODUCT_DELETED`, `LAST_PRODUCT_IMAGE`.",
      }) as unknown,
    });
  });
});
