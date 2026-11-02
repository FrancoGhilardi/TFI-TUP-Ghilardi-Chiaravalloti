import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    env: { NEXT_PUBLIC_API_URL: "http://localhost:3001" },
  },
});
