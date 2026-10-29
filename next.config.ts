import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything runs in the browser: the build is a set of static files.
  output: "export",
  // Served at https://timaub.fr/factur-x/; the trailing slash keeps relative URLs (the sample PDF) inside that folder.
  basePath: "/factur-x",
  trailingSlash: true,
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
