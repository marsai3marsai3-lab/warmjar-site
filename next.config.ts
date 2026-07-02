import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: "",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  /* Sanity Studio 需要這些套件透過 Next.js 打包 */
  transpilePackages: ["sanity", "@sanity/ui", "@sanity/vision"],
  async headers() {
    return [
      {
        // 影片觀看頁：加上安全標頭防止嵌入其他網站
        source: "/courses/:slug/:lesson/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-src 'self' https://www.youtube-nocookie.com; default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:;",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
