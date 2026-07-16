import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本機開發用 cloudflared quick tunnel 測試 LIFF（LINE 內建瀏覽器連不到
  // localhost）時，Next.js dev server 預設會擋掉非 localhost 來源對 dev
  // 資源（HMR websocket、chunk 等）的請求。quick tunnel 每次重啟網址都會
  // 換一個新的隨機子網域，用萬用字元涵蓋整個 *.trycloudflare.com，不用
  // 每次重開通道都回來改設定。正式環境不受影響（這個設定只在 dev 模式生效）。
  allowedDevOrigins: ["*.trycloudflare.com"],
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
