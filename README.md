# パッと見積

> 現場で即！職人・一人親方向けスマホ見積書作成アプリ

大工・塗装・電気工事・清掃業など現場仕事の方が、スマホで素早く見積書を作成し、
PDFをLINEで送れる無料PWAアプリです。

## 機能

- ✏️ 品目・数量・単価の高速入力（テンキー最適化）
- 🔢 消費税（0%・8%・10%）・値引きの自動計算
- 📄 PDFダウンロード（jsPDF使用）
- 💬 PDF作成後にLINE送付手順を案内
- 💾 全データlocalStorage保存（サーバー不要）
- 📋 過去見積もりの複製・流用
- 🏷 会社ロゴ・振込先を見積書に掲載
- 📱 PWA対応（ホーム画面追加でアプリとして利用可）

## 技術スタック

- Next.js 14 (App Router)
- React 18 / TypeScript
- TailwindCSS
- jsPDF + jspdf-autotable

## ローカル開発

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Vercelへのデプロイ

1. GitHubリポジトリを作成してコードをpush
2. [vercel.com](https://vercel.com) → New Project → GitHubリポジトリを選択
3. Framework: **Next.js**（自動検出）
4. 環境変数：不要
5. Deploy！

## PWAアイコンの設置

`public/icons/` に以下の画像を配置してください：
- `icon-192.png`（192×192px）
- `icon-512.png`（512×512px）

## 収益化設定

### Google AdSense
`app/layout.tsx` の `#ad-banner` 内と各ページの広告スペースdivに挿入してください。

### Buy Me a Coffee
`app/about/page.tsx` の `YOUR_ID` を自分のIDに変更してください。

## ライセンス

MIT
