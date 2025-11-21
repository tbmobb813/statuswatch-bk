import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "example.com", pathname: "/**" },
      // add your hostnames here
    ],
  },
  // Note: Turbopack root is intentionally omitted here to avoid
  // configuring a dist/output directory outside of the project root.
  // The `frontend` folder includes its own Next config and should be
  // used when running the frontend dev server (see README / package.json).
};

export default nextConfig;
