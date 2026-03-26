/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // jspdf はブラウザ専用のためサーバーバンドルから除外
  serverExternalPackages: ["jspdf", "jspdf-autotable", "canvg", "html2canvas"],
  async headers() {
    return [
      // TTFフォントを正しいContent-Typeで配信
      {
        source: "/fonts/:path*.ttf",
        headers: [
          { key: "Content-Type", value: "font/ttf" },
          // キャッシュ：1年間（フォントは変更されないため）
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
