/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 型エラーがあってもビルドを続行する
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLintエラーがあってもビルドを続行する
    ignoreDuringBuilds: true,
  },
  // jspdf・jspdf-autotable はブラウザ専用ライブラリのため
  // サーバーサイドのバンドルから除外する
  serverExternalPackages: ["jspdf", "jspdf-autotable", "canvg", "html2canvas"],
  async headers() {
    return [
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