import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "example.com", pathname: "/**" },
      // add your hostnames here
    ],
  },
  turbopack: {
    root: __dirname + "/frontend", // adjust path if needed
  },
};

export default nextConfig;
