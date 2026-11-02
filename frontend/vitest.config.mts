import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "5492622380159",
      NEXT_PUBLIC_WHATSAPP_DISPLAY: "2622 38-0159",
    },
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "node", include: ["src/**/*.spec.ts"] },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "components",
          environment: "jsdom",
          include: ["src/**/*.spec.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
