import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  images: {
    maximumRedirects: 0,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/vi/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
