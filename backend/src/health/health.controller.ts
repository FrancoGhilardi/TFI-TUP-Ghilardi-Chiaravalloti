import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiErrors } from "../shared/presentation/http/openapi-decorators.js";
import { Public } from "../modules/identity/presentation/decorators/public.decorator.js";
import { DatabaseHealthCheck } from "../shared/application/database-health-check.js";

// Health checks from the platform and monitoring must never be rate limited.
@SkipThrottle()
@Public()
@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly databaseHealthCheck: DatabaseHealthCheck) {}

  @Get()
  @ApiOperation({ summary: "The app is running" })
  @ApiOkResponse({
    schema: { type: "object", properties: { status: { type: "string", example: "ok" } } },
  })
  check() {
    return { status: "ok" };
  }

  @Get("ready")
  @ApiOperation({ summary: "The app can serve requests: the database answers" })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        database: { type: "string", example: "up" },
      },
    },
  })
  @ApiErrors({ 503: ["SERVICE_UNAVAILABLE"] })
  async ready() {
    if (!(await this.databaseHealthCheck.isReachable())) {
      throw new ServiceUnavailableException({ status: "unavailable", database: "down" });
    }
    return { status: "ok", database: "up" };
  }
}
