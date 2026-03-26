// =============================================
// /about ── サービス説明・使い方
// =============================================

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "使い方 | パッと見積",
  description: "パッと見積の使い方・機能説明ページ",
};

export default function AboutPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-black text-gray-800">❓ 使い方・機能説明</h1>

      {/* キャッチ */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-400 text-white rounded-2xl p-5 shadow-lg">
        <p className="text-xl font-black mb-1">🔨 現場で即！見積書</p>
        <p className="text-orange-100 text-sm leading-relaxed">
          大工・塗装・電気・清掃など、現場仕事の職人・一人親方向けに作られた
          スマホ専用の見積書作成アプリです。
        </p>
      </div>

      {/* 使い方ステップ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-sm font-black text-gray-700 mb-4">📱 基本の使い方</h2>
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "会社情報を登録",
              desc: "⚙️設定タブから会社名・電話番号・ロゴなどを登録。見積書に自動で反映されます。",
              color: "bg-orange-500",
            },
            {
              step: "2",
              title: "見積もりを入力",
              desc: "✏️見積もりタブで品目・数量・単価を入力。スマホのテンキーで快適に入力できます。",
              color: "bg-blue-500",
            },
            {
              step: "3",
              title: "PDF出力",
              desc: "「PDF出力」ボタンをタップするとPDFが自動でダウンロードされます。",
              color: "bg-green-500",
            },
            {
              step: "4",
              title: "LINEで送る",
              desc: "LINEのトーク画面で📎ボタン →「ファイル」→ ダウンロードしたPDFを選んで送信！",
              color: "bg-[#06C755]",
            },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="flex gap-3">
              <span
                className={`${color} text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 mt-0.5`}
              >
                {step}
              </span>
              <div>
                <p className="font-bold text-gray-800 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 機能一覧 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-sm font-black text-gray-700 mb-3">✅ 機能一覧</h2>
        <div className="space-y-2.5">
          {[
            ["📝", "品目・数量・単価の高速入力（テンキー対応）"],
            ["🔢", "消費税（0%・8%・10%）・値引きの自動計算"],
            ["📄", "PDFダウンロード（jsPDFで生成）"],
            ["💬", "LINEでのPDF送付手順を案内"],
            ["💾", "データはスマホ内に保存（インターネット不要）"],
            ["📋", "過去の見積もりを履歴から複製・再利用"],
            ["🏷", "会社ロゴを見積書に掲載"],
            ["🏦", "振込先情報を見積書に掲載"],
            ["📱", "ホーム画面に追加してアプリのように使える（PWA）"],
            ["🆓", "完全無料"],
          ].map(([icon, text]) => (
            <div key={text as string} className="flex items-start gap-2 text-sm">
              <span className="text-lg leading-none mt-0.5">{icon}</span>
              <span className="text-gray-700">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* よくある質問 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h2 className="text-sm font-black text-gray-700 mb-3">💡 よくある質問</h2>
        <div className="space-y-4">
          {[
            {
              q: "データはどこに保存されますか？",
              a: "お使いのスマホ・端末内（localStorageという仕組み）に保存されます。サーバーへの送信は一切ありません。",
            },
            {
              q: "機種変更したらデータは消えますか？",
              a: "はい、端末を変えるとデータは引き継がれません。大切なPDFは保存しておいてください。",
            },
            {
              q: "LINEに直接送れますか？",
              a: "LINEへの自動送信はできません。PDFをダウンロードした後、LINEのトーク画面からファイルとして添付して送ってください。",
            },
            {
              q: "インターネットがなくても使えますか？",
              a: "一度ページを開いた後はオフラインでも利用できます（PWA対応）。",
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="text-sm font-bold text-gray-800">Q. {q}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">A. {a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pb-2">
        <Link
          href="/"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-black
            px-8 py-4 rounded-2xl text-base shadow-lg transition-colors"
        >
          ✏️ 見積もりを作る
        </Link>
      </div>

      {/* 寄付ボタン */}
      <div className="text-center">
        <a
          href="https://www.buymeacoffee.com/YOUR_ID"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500
            text-gray-900 font-bold text-sm px-5 py-2.5 rounded-full shadow transition-colors"
        >
          ☕ 開発を応援する（Buy Me a Coffee）
        </a>
        <p className="text-xs text-gray-400 mt-2">無料でご利用いただけます</p>
      </div>
    </div>
  );
}
