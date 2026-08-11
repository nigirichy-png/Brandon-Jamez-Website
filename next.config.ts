import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    const privatePageHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    ];
    return [
      { source: "/subscriber/:path*", headers: privatePageHeaders },
      { source: "/admin/subscriber-content/:path*", headers: privatePageHeaders },
    ];
  },
  allowedDevOrigins: ["127.0.0.1", "192.168.178.29"],
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
