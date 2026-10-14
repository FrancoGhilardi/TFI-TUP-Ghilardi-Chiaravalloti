import { ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DatabaseHealthCheck } from "../shared/application/database-health-check.js";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  async function createController(reachable: boolean): Promise<HealthController> {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DatabaseHealthCheck, useValue: { isReachable: () => reachable } }],
    }).compile();
    return module.get(HealthController);
  }

  it("reports liveness without touching the database", async () => {
    const controller = await createController(false);

    expect(controller.check()).toEqual({ status: "ok" });
  });

  it("reports ready when the database is reachable", async () => {
    const controller = await createController(true);

    await expect(controller.ready()).resolves.toEqual({ status: "ok", database: "up" });
  });

  it("throws ServiceUnavailableException when the database is unreachable", async () => {
    const controller = await createController(false);

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
