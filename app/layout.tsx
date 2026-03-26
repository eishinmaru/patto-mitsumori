import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

// 日本語フォント
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto",
  display: "swap",
});

// 英数字フォント
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "パッと見積",
  description: "現場でパッと、すぐ出せる見積書",
  keywords: ["見積書", "見積もり", "職人", "一人親方", "現場", "無料", "スマホ", "PDF"],
  openGraph: {
    title: "パッと見積",
    description: "現場でパッと、すぐ出せる見積書",
    images: [{ url: "/ogp.png", width: 1200, height: 630 }],
    locale: "ja_JP",
    type: "website",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "パッと見積" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1B3A6B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${inter.variable} font-sans bg-[#F5F4F0] text-[#1E2733] min-h-screen`}
      >
        {/* ヘッダー */}
        <header className="bg-[#1B3A6B] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔨</span>
            <span className="font-bold text-lg tracking-wide">パッと見積</span>
          </div>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">職人向け</span>
        </header>

        {/* メイン */}
        <main className="max-w-xl mx-auto px-3 pt-4 pb-32">
          {children}
        </main>

        {/* 広告スペース（フッター上固定） */}
        <div
          id="ad-banner"
          className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 h-12 flex items-center justify-center z-20"
        >
          {/* Google AdSense をここに挿入 */}
          <span className="text-xs text-gray-400">広告スペース</span>
        </div>

        {/* ボトムナビ */}
        <BottomNav />
      </body>
    </html>
  );
}
