import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import type { Env } from "./config/env.js";
import metadata from "./openapi-metadata.js";
import { RefreshTokenCookie } from "./modules/identity/presentation/http/refresh-token-cookie.js";
import {
  ErrorResponseDto,
  ValidationErrorDetailDto,
} from "./shared/presentation/http/error-response.dto.js";
import {
  ACCESS_TOKEN_AUTH,
  REFRESH_TOKEN_AUTH,
} from "./shared/presentation/http/openapi-decorators.js";

/** Where the interactive documentation and its JSON are served, outside the versioned API. */
export const OPENAPI_PATH = "api/docs";
export const OPENAPI_JSON_PATH = "api/docs-json";

const ERROR_RESPONSE = { $ref: "#/components/schemas/ErrorResponseDto" };
// The health checks are never rate limited.
const HEALTH_PATH = /^\/api\/v\d+\/health(\/|$)/;

/**
 * Every route answers 500 on an unexpected failure, and 429 once the rate limit is reached,
 * except the health checks.
 */
function addCommonErrors(document: OpenAPIObject): void {
  for (const [path, item] of Object.entries(document.paths)) {
    for (const operation of [item.get, item.post, item.put, item.patch, item.delete]) {
      if (operation === undefined) {
        continue;
      }
      if (!HEALTH_PATH.test(path)) {
        operation.responses["429"] ??= {
          description: "Codes: `TOO_MANY_REQUESTS`. Comes with a `Retry-After` header.",
          content: { "application/json": { schema: ERROR_RESPONSE } },
        };
      }
      operation.responses["500"] ??= {
        description: "Codes: `INTERNAL_ERROR`.",
        content: { "application/json": { schema: ERROR_RESPONSE } },
      };
    }
  }
}

/**
 * The OpenAPI document of the API, the contract with the frontend. It needs the app set up
 * (prefix and versioning) but not started; the metadata the Swagger plugin reads from the DTOs
 * comes from `openapi-metadata.ts`, generated with `pnpm openapi:metadata`.
 */
export async function createOpenApiDocument(app: INestApplication): Promise<OpenAPIObject> {
  await SwaggerModule.loadPluginMetadata(metadata);
  const config = new DocumentBuilder()
    .setTitle("Librería Mi Sueño API")
    .setDescription(
      "REST API of the store and its admin panel. Errors share one body (`ErrorResponseDto`) with a stable `code`; messages are in Spanish, for the user.",
    )
    .setVersion("1.0.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, ACCESS_TOKEN_AUTH)
    .addCookieAuth(RefreshTokenCookie.NAME, { type: "apiKey", in: "cookie" }, REFRESH_TOKEN_AUTH)
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto, ValidationErrorDetailDto],
    operationIdFactory: (controller, method) =>
      `${controller.replace(/Controller$/, "")}_${method}`,
  });
  addCommonErrors(document);
  return document;
}

// Keys in a fixed order: how the code was compiled can change the order decorators run in.
const sortedKeys = (_key: string, value: unknown): unknown =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0,
        ),
      )
    : value;

/** The document as `docs/openapi.json` keeps it, so a regenerated one can be compared. */
export function serializeOpenApiDocument(document: OpenAPIObject): string {
  return `${JSON.stringify(document, sortedKeys, 2)}\n`;
}

/**
 * Serves the documentation outside production, or in it only when `OPENAPI_ENABLED` is set;
 * otherwise those paths do not exist.
 */
export async function setupOpenApi(app: INestApplication): Promise<void> {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const enabled =
    config.get("NODE_ENV", { infer: true }) !== "production" ||
    config.get("OPENAPI_ENABLED", { infer: true });
  if (!enabled) {
    return;
  }
  SwaggerModule.setup(OPENAPI_PATH, app, await createOpenApiDocument(app), {
    jsonDocumentUrl: OPENAPI_JSON_PATH,
  });
}
