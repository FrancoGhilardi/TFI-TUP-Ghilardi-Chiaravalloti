import type { NextConfig } from "next";

// Validates the environment on load, so `next dev` and `next build` stop before serving or
// bundling a misconfigured app.
import { publicConfig } from "./src/modules/core/config/env";
import { isLoopbackOrigin, storageImagePattern } from "./src/modules/core/config/images";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [storageImagePattern(publicConfig.storageOrigin)],
    dangerouslyAllowLocalIP: isLoopbackOrigin(publicConfig.storageOrigin),
  },
};

export default nextConfig;
