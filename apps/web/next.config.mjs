import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import nextEnv from "@next/env";

const here = dirname(fileURLToPath(import.meta.url));
const { loadEnvConfig } = nextEnv;

/**
 * The environment lives at the root of the repository, because the scripts and
 * the contracts read the same file. The app loads it from there rather than
 * keeping a second copy that could disagree.
 */
loadEnvConfig(join(here, "..", ".."));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@mandate/policy"],
  eslint: {
    dirs: ["app", "components", "lib"],
  },
};

export default nextConfig;


