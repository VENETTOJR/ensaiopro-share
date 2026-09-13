import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cttpczpqzuniemuqmmxl.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    // Upload de 10 fotos x ~10MB = até 150MB
    proxyClientMaxBodySize: "150mb",
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
};

export default nextConfig;
