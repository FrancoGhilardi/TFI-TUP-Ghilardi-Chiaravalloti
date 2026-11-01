// Writes src/openapi-metadata.ts: what the Swagger compiler plugin reads from the DTOs and
// controllers (types, validation and comments), so the document is the same whether the code
// was built by Nest or run by Vitest. Run it after changing a DTO or a route.
import { PluginMetadataGenerator } from "@nestjs/cli/lib/compiler/plugins/plugin-metadata-generator.js";
import { ReadonlyVisitor } from "@nestjs/swagger/plugin";
import path from "node:path";

const outputDir = process.argv[2] ?? path.resolve("src");

new PluginMetadataGenerator().generate({
  visitors: [
    new ReadonlyVisitor({
      introspectComments: true,
      classValidatorShim: true,
      pathToSource: path.resolve("src"),
    }),
  ],
  outputDir,
  filename: "openapi-metadata.ts",
  tsconfigPath: "tsconfig.build.json",
  printDiagnostics: false,
});
