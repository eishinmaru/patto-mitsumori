#!/usr/bin/env node
// =============================================
// NotoSansJP フォントダウンロードスクリプト
// 実行: node scripts/download-fonts.js
// =============================================

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const FONTS_DIR = path.join(__dirname, "..", "public", "fonts");

// ダウンロード候補URL（順番に試みる）
const FONT_URLS = {
  "NotoSansJP-Regular.ttf": [
    "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Regular.ttf",
    "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Regular.ttf",
    "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP-Regular.ttf",
  ],
  "NotoSansJP-Bold.ttf": [
    "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Bold.ttf",
    "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Bold.ttf",
    "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP-Bold.ttf",
  ],
};

/**
 * HTTPSでファイルをダウンロードする（リダイレクト対応）
 */
function downloadFile(url, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error("リダイレクト上限に達しました"));
      return;
    }

    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, { timeout: 30000 }, (res) => {
      // リダイレクト処理
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location;
        console.log(`  → リダイレクト: ${redirectUrl}`);
        res.resume();
        downloadFile(redirectUrl, destPath, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 1000) {
          reject(new Error(`ファイルサイズが小さすぎます (${buffer.length} bytes)`));
          return;
        }
        fs.writeFileSync(destPath, buffer);
        resolve(buffer.length);
      });
      res.on("error", reject);
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("タイムアウト"));
    });
  });
}

/**
 * 複数URLを順番に試してダウンロードする
 */
async function downloadWithFallback(filename, urls, destPath) {
  const errors = [];

  for (const url of urls) {
    try {
      console.log(`  試行: ${url}`);
      const size = await downloadFile(url, destPath);
      console.log(`  ✓ 成功: ${Math.round(size / 1024)} KB`);
      return true;
    } catch (e) {
      console.warn(`  ✗ 失敗: ${e.message}`);
      errors.push(`${url}: ${e.message}`);
    }
  }

  console.error(`  全URL失敗:\n${errors.map(e => "    " + e).join("\n")}`);
  return false;
}

async function main() {
  console.log("=== NotoSansJP フォントダウンロード ===\n");

  // fonts ディレクトリ作成
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
    console.log(`ディレクトリ作成: ${FONTS_DIR}\n`);
  }

  let allSuccess = true;

  for (const [filename, urls] of Object.entries(FONT_URLS)) {
    const destPath = path.join(FONTS_DIR, filename);

    // 既存ファイルチェック（1MB以上あれば有効とみなす）
    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      if (stat.size > 1000 * 1024) {
        console.log(`[SKIP] ${filename} は既に存在します (${Math.round(stat.size / 1024)} KB)`);
        continue;
      } else {
        console.log(`[WARN] ${filename} が存在しますがサイズが小さいため再取得します`);
      }
    }

    console.log(`\n[ダウンロード] ${filename}`);
    const success = await downloadWithFallback(filename, urls, destPath);
    if (!success) {
      allSuccess = false;
    }
  }

  console.log("\n=== 完了 ===");

  if (allSuccess) {
    console.log("✓ 全フォントのダウンロードに成功しました");
    // ファイル一覧表示
    const files = fs.readdirSync(FONTS_DIR);
    files.forEach(f => {
      const stat = fs.statSync(path.join(FONTS_DIR, f));
      console.log(`  ${f}: ${Math.round(stat.size / 1024)} KB`);
    });
  } else {
    console.error("✗ 一部のフォントダウンロードに失敗しました");
    console.error("  手動で以下に配置してください:");
    console.error(`  ${FONTS_DIR}/NotoSansJP-Regular.ttf`);
    console.error(`  ${FONTS_DIR}/NotoSansJP-Bold.ttf`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error("予期しないエラー:", e);
  process.exit(1);
});
