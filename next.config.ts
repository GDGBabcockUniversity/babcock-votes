import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        // Candidate photos and election logos live in Convex file storage.
        protocol: "https",
        hostname: "*.convex.cloud",
        pathname: "/api/storage/**",
      },
    ],
  },
};

export default nextConfig;
