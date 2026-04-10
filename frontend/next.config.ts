import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent root auto-detection from escaping the frontend folder.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  // Allow images from any source during development
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
