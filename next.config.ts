import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything runs in the browser: the build is a set of static files.
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
