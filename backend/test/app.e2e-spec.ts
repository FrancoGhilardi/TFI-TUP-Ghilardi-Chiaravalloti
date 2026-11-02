import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types.js";
import { DatabaseHealthCheck } from "./../src/shared/application/database-health-check.js";
import { AppModule } from "./../src/app.module.js";
import { setupApp } from "./../src/app.setup.js";

describe("HealthController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  it("/api/v1/health (GET)", () => {
    return request(app.getHttpServer()).get("/api/v1/health").expect(200).expect({ status: "ok" });
  });

  it("/api/v1/health/ready (GET) is up when the database is reachable", () => {
    return request(app.getHttpServer())
      .get("/api/v1/health/ready")
      .expect(200)
      .expect({ status: "ok", database: "up" });
  });

  afterEach(async () => {
    await app.close();
  });
});

describe("HealthController readiness without database (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseHealthCheck)
      .useValue({ isReachable: () => Promise.resolve(false) })
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  it("keeps liveness up while readiness answers 503", async () => {
    await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    await request(app.getHttpServer()).get("/api/v1/health/ready").expect(503);
  });

  afterEach(async () => {
    await app.close();
  });
});
