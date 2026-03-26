import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:   "#1B3A6B", // 濃紺 — ヘッダー・メインボタン
          secondary: "#253C62", // 濃紺（やや明るめ）— サブボタン・ボーダー
          accent:    "#E97B2E", // オレンジ — アクセント・CTA
          bg:        "#F5F4F0", // オフホワイト — ページ背景
          text:      "#1E2733", // ダークネイビー — 本文テキスト
        },
      },
      fontFamily: {
        sans: ["var(--font-noto)", "var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
