import path from "node:path";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";

/**
 * Runs the project's lint configuration on example code placed, virtually, in each layer.
 * Imports point to real files so the resolver classifies them exactly as in the code base.
 * Type-aware rules are turned off because the example files are not part of the project.
 */
const ROOT = path.resolve(import.meta.dirname, "../..");

const TARGETS = {
  domain: ["src/modules/identity/domain/user-role.ts", "domain"],
  application: ["src/modules/identity/application/ports/access-token-service.ts", "application"],
  infrastructure: [
    "src/modules/identity/infrastructure/persistence/user.mapper.ts",
    "infrastructure",
  ],
  presentation: [
    "src/modules/identity/presentation/decorators/public.decorator.ts",
    "presentation",
  ],
  sharedDomain: ["src/shared/domain/entity.ts", "shared-domain"],
  sharedApplication: ["src/shared/application/use-case.ts", "shared-application"],
  sharedInfrastructure: [
    "src/shared/infrastructure/database/drizzle.executor.ts",
    "shared-infrastructure",
  ],
  sharedPresentation: ["src/shared/presentation/http/rate-limit.ts", "shared-presentation"],
  config: ["src/config/env.ts", "config"],
  appModule: ["src/app.module.ts", "composition"],
  identityModule: ["src/modules/identity/identity.module.ts", "composition"],
} as const;

const FROM = {
  domain: ["src/modules/identity/domain/example.ts", "domain"],
  application: ["src/modules/identity/application/example.ts", "application"],
  infrastructure: ["src/modules/identity/infrastructure/example.ts", "infrastructure"],
  presentation: ["src/modules/identity/presentation/example.ts", "presentation"],
  sharedDomain: ["src/shared/domain/example.ts", "shared-domain"],
  sharedApplication: ["src/shared/application/example.ts", "shared-application"],
  sharedInfrastructure: ["src/shared/infrastructure/example.ts", "shared-infrastructure"],
  sharedPresentation: ["src/shared/presentation/example.ts", "shared-presentation"],
  config: ["src/config/example.ts", "config"],
  health: ["src/health/example.ts", "app-presentation"],
  cli: ["src/cli/example.ts", "composition"],
  moduleFile: ["src/modules/identity/example.module.ts", "composition"],
  otherDomain: ["src/modules/catalog/domain/example.ts", "domain"],
  otherApplication: ["src/modules/catalog/application/example.ts", "application"],
  otherPresentation: ["src/modules/catalog/presentation/example.ts", "presentation"],
  domainSpec: ["src/modules/identity/domain/example.spec.ts", "domain"],
  presentationSpec: ["src/modules/identity/presentation/example.spec.ts", "presentation"],
} as const;

type From = keyof typeof FROM;
type Target = keyof typeof TARGETS;

const directionError = (from: From, target: Target) =>
  `${FROM[from][1]} cannot import ${TARGETS[target][1]}: dependencies must point inward and modules only share their presentation layer`;
const externalError = (from: From) =>
  `${FROM[from][1]} cannot import external packages or Node modules: keep frameworks and drivers in the outer layers`;
const compositionError = (from: From) =>
  `${FROM[from][1]} cannot import a composition root: only main, the app setup and the *.module.ts files wire the layers`;
const unresolvedError = (from: From) =>
  `${FROM[from][1]} imports a local file that cannot be resolved or does not belong to any layer`;

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({
    cwd: ROOT,
    overrideConfig: { files: ["src/**/*.ts"], ...tseslint.configs.disableTypeChecked },
  });
});

const specifierTo = (from: From, target: Target) => {
  const relative = path
    .relative(path.dirname(FROM[from][0]), TARGETS[target][0])
    .replace(/\.ts$/, ".js");
  return relative.startsWith(".") ? relative : `./${relative}`;
};

/** Boundary violations reported when the file `from` imports `source`. */
async function violations(from: From, source: string): Promise<string[]> {
  const [result] = await eslint.lintText(
    `import * as dependency from "${source}";\nexport { dependency };\n`,
    { filePath: path.join(ROOT, FROM[from][0]) },
  );
  return result.messages
    .filter((message) => message.ruleId?.startsWith("boundaries/"))
    .map((message) => message.message);
}

const imports = (from: From, target: Target) => violations(from, specifierTo(from, target));

/** Asserts the import is rejected by the layer direction rule, and only by it. */
async function rejectsDirection(from: From, target: Target) {
  expect(await imports(from, target)).toEqual([directionError(from, target)]);
}

async function allows(from: From, target: Target) {
  expect(await imports(from, target)).toEqual([]);
}

describe("Layer boundaries", () => {
  describe("domain", () => {
    it.each<Target>([
      "infrastructure",
      "application",
      "presentation",
      "sharedApplication",
      "sharedInfrastructure",
      "sharedPresentation",
      "config",
    ])("cannot import %s", (target) => rejectsDirection("domain", target));

    it.each<Target>(["domain", "sharedDomain"])("can import %s", (target) =>
      allows("domain", target),
    );
  });

  describe("application", () => {
    it.each<Target>(["infrastructure", "presentation", "config", "sharedInfrastructure"])(
      "cannot import %s",
      (target) => rejectsDirection("application", target),
    );

    it.each<Target>(["domain", "application", "sharedDomain", "sharedApplication"])(
      "can import %s",
      (target) => allows("application", target),
    );
  });

  describe("infrastructure and presentation", () => {
    it("infrastructure cannot import presentation", () =>
      rejectsDirection("infrastructure", "presentation"));

    it("presentation cannot import infrastructure", () =>
      rejectsDirection("presentation", "infrastructure"));

    it.each<Target>(["domain", "application", "sharedInfrastructure", "config"])(
      "infrastructure can import %s",
      (target) => allows("infrastructure", target),
    );

    it.each<Target>(["domain", "application", "sharedPresentation", "config"])(
      "presentation can import %s",
      (target) => allows("presentation", target),
    );
  });

  describe("shared kernel", () => {
    it.each<[From, Target]>([
      ["sharedDomain", "domain"],
      ["sharedApplication", "application"],
      ["sharedInfrastructure", "infrastructure"],
      ["sharedPresentation", "presentation"],
    ])("%s cannot import the %s of a module", (from, target) => rejectsDirection(from, target));

    it.each<[From, Target]>([
      ["sharedDomain", "sharedApplication"],
      ["sharedApplication", "sharedInfrastructure"],
      ["sharedInfrastructure", "sharedPresentation"],
      ["sharedApplication", "config"],
    ])("%s cannot import %s", (from, target) => rejectsDirection(from, target));

    it.each<[From, Target]>([
      ["sharedApplication", "sharedDomain"],
      ["sharedInfrastructure", "config"],
      ["sharedPresentation", "sharedApplication"],
    ])("%s can import %s", (from, target) => allows(from, target));
  });

  describe("between modules", () => {
    it.each<[From, Target]>([
      ["otherDomain", "domain"],
      ["otherApplication", "application"],
      ["otherApplication", "domain"],
      ["otherPresentation", "domain"],
      ["otherPresentation", "infrastructure"],
    ])("%s cannot import the %s of another module", (from, target) =>
      rejectsDirection(from, target),
    );

    it("presentation can use the presentation of another module", () =>
      allows("otherPresentation", "presentation"));
  });

  describe("config", () => {
    it.each<Target>(["sharedDomain", "domain"])("cannot import %s", (target) =>
      rejectsDirection("config", target),
    );
  });

  describe("health", () => {
    it.each<Target>([
      "presentation",
      "sharedDomain",
      "sharedApplication",
      "sharedPresentation",
      "config",
    ])("can import %s", (target) => allows("health", target));

    it.each<Target>(["infrastructure", "domain", "sharedInfrastructure"])(
      "cannot import %s",
      (target) => rejectsDirection("health", target),
    );
  });

  describe("composition roots", () => {
    it.each<[From, Target]>([
      ["cli", "infrastructure"],
      ["cli", "config"],
      ["moduleFile", "infrastructure"],
      ["moduleFile", "presentation"],
      ["moduleFile", "appModule"],
      ["moduleFile", "identityModule"],
    ])("%s can import %s", (from, target) => allows(from, target));

    it.each<[From, Target]>([
      ["presentation", "identityModule"],
      ["presentation", "appModule"],
      ["infrastructure", "identityModule"],
      ["domain", "appModule"],
    ])("%s cannot import %s", async (from, target) => {
      expect(await imports(from, target)).toEqual([compositionError(from)]);
    });
  });

  describe("external packages and Node modules", () => {
    it.each<[From, string]>([
      ["domain", "@nestjs/common"],
      ["domain", "drizzle-orm"],
      ["domain", "node:crypto"],
      ["application", "@nestjs/common"],
      ["application", "zod"],
      ["sharedDomain", "pg"],
      ["sharedApplication", "argon2"],
    ])("%s cannot import %s", async (from, source) => {
      expect(await violations(from, source)).toEqual([externalError(from)]);
    });

    it.each<[From, string]>([
      ["infrastructure", "drizzle-orm"],
      ["presentation", "@nestjs/common"],
      ["sharedInfrastructure", "pg"],
      ["config", "zod"],
      ["health", "@nestjs/common"],
      ["cli", "pg"],
      ["moduleFile", "@nestjs/core"],
    ])("%s can import %s", async (from, source) => {
      expect(await violations(from, source)).toEqual([]);
    });
  });

  describe("specs", () => {
    it.each(["node:util", "vitest"])("a domain spec can use %s", async (source) => {
      expect(await violations("domainSpec", source)).toEqual([]);
    });

    it.each(["@nestjs/testing", "drizzle-orm", "pg"])(
      "a domain spec cannot use %s: the domain is tested without frameworks or a database",
      async (source) => {
        expect(await violations("domainSpec", source)).toEqual([externalError("domainSpec")]);
      },
    );

    it("a domain spec still cannot import infrastructure", () =>
      rejectsDirection("domainSpec", "infrastructure"));

    it("a presentation spec can use the packages of its layer", async () => {
      expect(await violations("presentationSpec", "@nestjs/common")).toEqual([]);
    });
  });

  describe("unresolved imports", () => {
    it.each([
      ["a file that does not exist", "../missing/example.js"],
      ["a module that does not exist yet", "../../catalog/domain/example.js"],
    ])("rejects an import of %s", async (_label, source) => {
      expect(await violations("domain", source)).toEqual([unresolvedError("domain")]);
    });
  });

  describe("unknown folders", () => {
    it("rejects a file outside every known layer", async () => {
      const [result] = await eslint.lintText("export const value = 1;\n", {
        filePath: path.join(ROOT, "src/utils/example.ts"),
      });

      expect(result.messages.map((message) => message.ruleId)).toEqual([
        "boundaries/no-unknown-files",
      ]);
    });
  });
});
