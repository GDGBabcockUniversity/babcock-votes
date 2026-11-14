import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)));

const svgrLoader = {
  loader: "@svgr/webpack",
  options: { svgoConfig: { plugins: [{ name: "preset-default", params: { overrides: { removeViewBox: false } } }] } },
};

const nextConfig: NextConfig = {
  transpilePackages: ["sia-reactor", "@t007/input", "@t007/dialog", "@t007/toast", "@t007/utils"],
  turbopack: {
    root: projectRoot,
    rules: { "*.svg": { loaders: [svgrLoader], as: "*.js" } },
  },
  webpack(config) {
    const fileLoaderRule = config.module.rules.find((rule: any) => rule.test?.test?.(".svg"));
    if (fileLoaderRule) fileLoaderRule.exclude = /\.svg$/;
    config.module.rules.push({ test: /\.svg$/, issuer: /\.[jt]sx?$/, ...svgrLoader });
    return config;
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
