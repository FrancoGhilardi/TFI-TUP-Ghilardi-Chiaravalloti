import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { type INestApplication, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";
import { DiscoveryService, MetadataScanner } from "@nestjs/core";
import type { OpenAPIObject } from "@nestjs/swagger";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createOpenApiDocument, serializeOpenApiDocument } from "./../src/openapi.js";
import { createTestApp } from "./create-test-app.js";

type Operation = OpenAPIObject["paths"][string]["get"] & object;

/** Every route the app serves, as OpenAPI writes it: `/api/v1/products/{slug}`. */
function routesOf(app: INestApplication): string[] {
  const routes: string[] = [];
  const scanner = new MetadataScanner();
  for (const wrapper of app.get(DiscoveryService).getControllers()) {
    const { metatype } = wrapper;
    if (!metatype) {
      continue;
    }
    const prototype = metatype.prototype as object;
    const base = Reflect.getMetadata(PATH_METADATA, metatype) as string;
    for (const method of scanner.getAllMethodNames(prototype)) {
      const handler = (prototype as Record<string, object>)[method];
      const route = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      if (route === undefined) {
        continue;
      }
      const verb = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
      const full = ["api", "v1", base, route]
        .filter((part) => part !== "" && part !== "/")
        .join("/")
        .replace(/:(\w+)/g, "{$1}");
      routes.push(`${verb.toLowerCase()} /${full}`);
    }
  }
  return routes.sort();
}

describe("OpenAPI document (e2e)", () => {
  const apps: INestApplication<App>[] = [];

  async function start(env: Parameters<typeof createTestApp>[0] = {}) {
    const app = await createTestApp(env);
    apps.push(app);
    return { app, http: request(app.getHttpServer()) };
  }

  afterEach(async () => {
    for (const app of apps.splice(0)) {
      await app.close();
    }
  });

  it("serves the documentation and its JSON outside production", async () => {
    const { http } = await start();

    const json = await http.get("/api/docs-json").expect(200);
    await http.get("/api/docs").expect(200);

    expect(json.body).toMatchObject({ openapi: expect.stringMatching(/^3\./) as unknown });
  });

  it("hides it in production, unless it is enabled", async () => {
    const hidden = await start({ env: { NODE_ENV: "production", OPENAPI_ENABLED: false } });
    const enabled = await start({ env: { NODE_ENV: "production", OPENAPI_ENABLED: true } });

    await hidden.http.get("/api/docs-json").expect(404);
    await hidden.http.get("/api/docs").expect(404);
    await enabled.http.get("/api/docs-json").expect(200);
  });

  it("documents every route, with what it answers and how it fails", async () => {
    const { app } = await start();
    const document = await createOpenApiDocument(app);

    const documented = Object.entries(document.paths).flatMap(([route, item]) =>
      Object.keys(item).map((verb) => `${verb} ${route}`),
    );
    expect(documented.sort()).toEqual(routesOf(app));

    for (const [route, item] of Object.entries(document.paths)) {
      for (const [verb, operation] of Object.entries(item) as [string, Operation][]) {
        const statuses = Object.keys(operation.responses);
        const where = `${verb} ${route}`;
        expect(operation.summary, where).toBeTruthy();
        expect(operation.tags?.length, where).toBe(1);
        expect(
          statuses.some((status) => status.startsWith("2")),
          where,
        ).toBe(true);
        expect(statuses, where).toContain("500");
        if (operation.security?.some((scheme) => "access-token" in scheme)) {
          expect(statuses, where).toContain("401");
        }
        if (operation.parameters?.length || operation.requestBody) {
          expect(
            statuses.some((status) => status.startsWith("4")),
            where,
          ).toBe(true);
        }
      }
    }
  });

  it("keeps docs/openapi.json up to date", async () => {
    const { app } = await start();

    const current = serializeOpenApiDocument(await createOpenApiDocument(app));

    // If this fails, run `pnpm openapi:export`.
    expect(readFileSync("docs/openapi.json", "utf8")).toBe(current);
  });

  it("keeps the generated metadata up to date", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "openapi-metadata-"));
    try {
      execFileSync("pnpm", ["exec", "tsx", "scripts/openapi-metadata.ts", dir], {
        stdio: ["ignore", "ignore", "inherit"],
      });

      // If this fails, run `pnpm openapi:metadata`.
      expect(readFileSync(path.join(dir, "openapi-metadata.ts"), "utf8")).toBe(
        readFileSync("src/openapi-metadata.ts", "utf8"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
