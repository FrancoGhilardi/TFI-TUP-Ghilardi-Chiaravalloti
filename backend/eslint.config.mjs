// @ts-check
import eslint from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Composition roots that live as single files next to the folders they wire, so they are
 * classified as files rather than as folder elements.
 */
const FILES = [
  {
    category: "composition",
    pattern: ["src/main.ts", "src/app.module.ts", "src/app.setup.ts", "src/modules/*/*.module.ts"],
  },
  // Specs keep the layer rules of their folder; only the external library rule is relaxed.
  { category: "spec", pattern: "src/**/*.spec.ts" },
];

/** Architectural elements of src/; patterns are matched against the full path from here. */
const ELEMENTS = [
  { type: "composition", pattern: "src/cli", partialMatch: false },
  { type: "config", pattern: "src/config", partialMatch: false },
  { type: "app-presentation", pattern: "src/health", partialMatch: false },
  { type: "shared-domain", pattern: "src/shared/domain", partialMatch: false },
  { type: "shared-application", pattern: "src/shared/application", partialMatch: false },
  { type: "shared-infrastructure", pattern: "src/shared/infrastructure", partialMatch: false },
  { type: "shared-presentation", pattern: "src/shared/presentation", partialMatch: false },
  ...["domain", "application", "infrastructure", "presentation"].map((layer) => ({
    type: layer,
    pattern: `src/modules/*/${layer}`,
    partialMatch: false,
    capture: ["module"],
  })),
];

const element = (type) => ({ element: { type } });
const sameModule = (type) => ({
  element: { type, captured: { module: "{{ from.element.captured.module }}" } },
});
const COMPOSITION = [{ file: { categories: "composition" } }, element("composition")];
const EXTERNAL = { module: { origin: ["external", "core"] } };
const INNER_LAYERS = ["domain", "application", "shared-domain", "shared-application"];
const OUTER_LAYERS = [
  "infrastructure",
  "presentation",
  "shared-infrastructure",
  "shared-presentation",
  "config",
  "app-presentation",
];

/**
 * Dependencies point inward: anything not listed here is forbidden. Shared code never sees
 * the modules, a module only reaches another module through its presentation layer, and
 * config is only visible to the outer layers.
 */
const DEPENDENCY_POLICIES = [
  {
    from: element("domain"),
    allow: { to: [sameModule("domain"), element("shared-domain")] },
  },
  {
    from: element("application"),
    allow: {
      to: [
        sameModule("domain"),
        sameModule("application"),
        element("shared-domain"),
        element("shared-application"),
      ],
    },
  },
  {
    from: element("infrastructure"),
    allow: {
      to: [
        sameModule("domain"),
        sameModule("application"),
        sameModule("infrastructure"),
        element("shared-domain"),
        element("shared-application"),
        element("shared-infrastructure"),
        element("config"),
      ],
    },
  },
  {
    from: element("presentation"),
    allow: {
      to: [
        sameModule("domain"),
        sameModule("application"),
        // Includes other modules' presentation, such as the identity guards and decorators.
        element("presentation"),
        element("shared-domain"),
        element("shared-application"),
        element("shared-presentation"),
        element("config"),
      ],
    },
  },
  { from: element("shared-domain"), allow: { to: [element("shared-domain")] } },
  {
    from: element("shared-application"),
    allow: { to: [element("shared-domain"), element("shared-application")] },
  },
  {
    from: element("shared-infrastructure"),
    allow: {
      to: [
        element("shared-domain"),
        element("shared-application"),
        element("shared-infrastructure"),
        element("config"),
      ],
    },
  },
  {
    from: element("shared-presentation"),
    allow: {
      to: [
        element("shared-domain"),
        element("shared-application"),
        element("shared-presentation"),
        element("config"),
      ],
    },
  },
  { from: element("config"), allow: { to: [element("config")] } },
  {
    // Application-wide presentation (health checks): same reach as the shared presentation,
    // plus the presentation of the modules for their decorators.
    from: element("app-presentation"),
    allow: {
      to: [
        element("shared-domain"),
        element("shared-application"),
        element("shared-presentation"),
        element("config"),
        element("presentation"),
      ],
    },
  },
  // Packages and Node modules belong to the outer layers.
  { from: OUTER_LAYERS.map(element), allow: { to: EXTERNAL } },
  {
    from: INNER_LAYERS.map(element),
    disallow: { to: EXTERNAL },
    message:
      "{{ from.element.type }} cannot import external packages or Node modules: keep frameworks and drivers in the outer layers",
  },
  // A local import that cannot be classified (unresolved path or alias) would skip every rule.
  {
    disallow: { to: { element: { isUnknown: true }, module: { origin: "local" } } },
    message:
      "{{ from.element.type }} imports a local file that cannot be resolved or does not belong to any layer",
  },
  {
    disallow: { to: COMPOSITION },
    message:
      "{{ from.element.type }} cannot import a composition root: only main, the app setup and the *.module.ts files wire the layers",
  },
  // Later policies win over earlier ones: composition roots wire every layer together.
  {
    from: COMPOSITION,
    allow: { to: [{ element: { type: "*" } }, ...COMPOSITION, EXTERNAL] },
  },
  // Inner-layer specs may use Node modules and the test runner, but no framework or driver:
  // domain and use cases are tested without Nest or a database.
  {
    from: { file: { categories: "spec" } },
    allow: { to: [{ module: { origin: "core" } }, { module: { source: "vitest" } }] },
  },
];

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "eslint.config.mjs"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
    },
  },
  {
    files: ["src/**/*.controller.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@nestjs/common"],
              importNamePattern: "Exception$",
              message:
                "Controllers must not build HTTP errors; throw a DomainError and let ErrorResponseFilter map it.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/health/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["src/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/root-path": import.meta.dirname,
      "boundaries/elements": ELEMENTS,
      "boundaries/files": FILES,
      // Relative imports are written with .js and point to .ts files (ESM with nodenext).
      // Absolute, so the result does not depend on the folder ESLint is started from.
      "import/resolver": { typescript: { project: `${import.meta.dirname}/tsconfig.json` } },
      "boundaries/legacy-templates": false,
    },
    rules: {
      // Every file must belong to an element, so a new folder cannot skip the layer rules.
      "boundaries/no-unknown-files": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          // Also check packages and Node modules, and local imports that resolve to no layer.
          checkAllOrigins: true,
          checkUnknownLocals: true,
          message:
            "{{ from.element.type }} cannot import {{ to.element.type }}: dependencies must point inward and modules only share their presentation layer",
          policies: DEPENDENCY_POLICIES,
        },
      ],
    },
  },
);
