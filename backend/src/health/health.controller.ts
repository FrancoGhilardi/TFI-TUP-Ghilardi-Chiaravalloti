import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { DatabaseHealthCheck } from "../shared/application/database-health-check.js";

@Controller("health")
export class HealthController {
  constructor(private readonly databaseHealthCheck: DatabaseHealthCheck) {}

  @Get()
  check() {
    return { status: "ok" };
  }

  @Get("ready")
  async ready() {
    if (!(await this.databaseHealthCheck.isReachable())) {
      throw new ServiceUnavailableException({ status: "unavailable", database: "down" });
    }
    return { status: "ok", database: "up" };
  }
}
