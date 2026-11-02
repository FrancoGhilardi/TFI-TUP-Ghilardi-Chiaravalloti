import type { NextConfig } from "next";

// Validates the environment on load, so `next dev` and `next build` stop before serving or
// bundling a misconfigured app.
import "./src/modules/core/config/env";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;
