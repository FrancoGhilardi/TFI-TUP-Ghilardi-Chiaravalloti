import { writeFile } from "node:fs/promises";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module.js";
import { setupApp } from "../app.setup.js";
import { createOpenApiDocument, serializeOpenApiDocument } from "../openapi.js";

// The contract the frontend works with, versioned with the code. The app is built but never
// started, so nothing connects to the database nor runs in the background.
const OUTPUT = "docs/openapi.json";

const app = await NestFactory.create(AppModule, { logger: ["error"] });
setupApp(app);
await writeFile(OUTPUT, serializeOpenApiDocument(await createOpenApiDocument(app)));
await app.close();
console.log(`OpenAPI document written to ${OUTPUT}`);
