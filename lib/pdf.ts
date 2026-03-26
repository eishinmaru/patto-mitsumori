// =============================================
// jsPDF による見積書PDF生成
// 日本語対応：public/fonts/ に同梱したTTFをfetchして使用
// フォントは scripts/download-fonts.js で事前にダウンロード
// =============================================

import { Estimate, CompanySettings } from "./types";
import { calcEstimate, fmt } from "./calc";

interface JsPDFWithAutoTable {
  lastAutoTable: { finalY: number };
}

// ── セッション内フォントキャッシュ ────────────────────────────
let cachedFontRegular: string | null = null;
let cachedFontBold: string | null = null;

/**
 * TTFファイルをfetchしてBase64文字列に変換する
 * public/fonts/ 配下のローカルファイルを使用するため確実に動作する
 */
async function fetchTTFAsBase64(url: string): Promise<string> {
  console.log(`[PDF] フォント読み込み: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`フォント取得失敗: ${url} (HTTP ${res.status} ${res.statusText})`);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 1024) {
    throw new Error(
      `フォントファイルが不正です: ${url} (${buffer.byteLength} bytes)\n` +
      "npm run download-fonts を実行してフォントを配置してください。"
    );
  }

  // ArrayBuffer → Base64（チャンク処理でスタックオーバーフロー防止）
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  const base64 = btoa(binary);
  console.log(
    `[PDF] フォント読み込み完了: ${url} ` +
    `(${Math.round(buffer.byteLength / 1024)} KB)`
  );
  return base64;
}

/**
 * jsPDFにNotoSansJPフォントを登録する
 * 失敗時はフォールバックフォントを返す
 */
async function registerJapaneseFont(doc: {
  addFileToVFS: (filename: string, base64: string) => void;
  addFont: (filename: string, fontName: string, style: string) => void;
  setFont: (fontName: string, style?: string) => void;
}): Promise<{ fontName: string; available: boolean }> {
  const FONT_NAME = "NotoSansJP";

  // 同一オリジンの public/fonts/ から取得（CORS不要・確実）
  const BASE = "/fonts/";

  try {
    // Regular
    if (!cachedFontRegular) {
      cachedFontRegular = await fetchTTFAsBase64(`${BASE}NotoSansJP-Regular.ttf`);
    }
    doc.addFileToVFS("NotoSansJP-Regular.ttf", cachedFontRegular);
    doc.addFont("NotoSansJP-Regular.ttf", FONT_NAME, "normal");

    // Bold
    if (!cachedFontBold) {
      cachedFontBold = await fetchTTFAsBase64(`${BASE}NotoSansJP-Bold.ttf`);
    }
    doc.addFileToVFS("NotoSansJP-Bold.ttf", cachedFontBold);
    doc.addFont("NotoSansJP-Bold.ttf", FONT_NAME, "bold");

    doc.setFont(FONT_NAME, "normal");
    console.log("[PDF] 日本語フォント登録完了");
    return { fontName: FONT_NAME, available: true };

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PDF] フォント登録失敗:", msg);
    console.error(
      "[PDF] 対処法: プロジェクトルートで以下を実行してください\n" +
      "  npm run download-fonts"
    );
    doc.setFont("helvetica", "normal");
    return { fontName: "helvetica", available: false };
  }
}

// ── メイン関数 ───────────────────────────────────────────────
export async function downloadEstimatePDF(
  estimate: Estimate,
  company: CompanySettings
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF生成はブラウザ環境でのみ実行できます");
  }

  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const calc = calcEstimate(
    estimate.items,
    estimate.taxRate,
    estimate.discountAmount
  );

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ml = 15;
  const mr = 15;

  // 日本語フォント登録
  const { fontName, available: fontAvailable } = await registerJapaneseFont(
    doc as unknown as {
      addFileToVFS: (filename: string, base64: string) => void;
      addFont: (filename: string, fontName: string, style: string) => void;
      setFont: (fontName: string, style?: string) => void;
    }
  );

  // ── テキスト描画ヘルパー ───────────────────────────────────
  function txt(
    text: string,
    x: number,
    y: number,
    opts: {
      size?: number;
      bold?: boolean;
      color?: string;
      align?: "left" | "right" | "center";
      maxWidth?: number;
    } = {}
  ): void {
    if (!text) return;
    const {
      size = 10,
      bold = false,
      color = "#000000",
      align = "left",
      maxWidth,
    } = opts;
    doc.setFont(fontName, bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16)
    );
    if (maxWidth) {
      doc.text(text, x, y, { align, maxWidth });
    } else {
      doc.text(text, x, y, { align });
    }
  }

  // ── 矩形塗り ──────────────────────────────────────────────
  function fillRect(
    x: number,
    y: number,
    w: number,
    h: number,
    hex: string
  ): void {
    doc.setFillColor(
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    );
    doc.rect(x, y, w, h, "F");
  }

  // ── 罫線 ──────────────────────────────────────────────────
  function drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    hex = "#cccccc",
    lw = 0.3
  ): void {
    doc.setDrawColor(
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    );
    doc.setLineWidth(lw);
    doc.line(x1, y1, x2, y2);
  }

  // ════════════════════════════════════════════════════════
  // 1. タイトル「見積書」
  // ════════════════════════════════════════════════════════
  txt("見　積　書", pageW / 2, 17, {
    size: 18,
    bold: true,
    color: "#1b3a6b",
    align: "center",
  });
  txt(`発行日：${estimate.issueDate}`, pageW - mr, 14, {
    size: 8,
    color: "#666666",
    align: "right",
  });

  // ════════════════════════════════════════════════════════
  // 2. 宛先（左）＆ 発行者（右）
  // ════════════════════════════════════════════════════════
  const colLeft = ml;
  const colRightEnd = pageW - mr;
  let ly = 28;
  let ry = 28;

  // 宛先
  txt(`${estimate.clientName || "　"} 御中`, colLeft, ly, {
    size: 13,
    bold: true,
    color: "#1b3a6b",
  });
  ly += 1;
  drawLine(colLeft, ly, colLeft + 85, ly, "#1b3a6b", 0.5);
  ly += 6;

  txt(`件名：${estimate.title || "　"}`, colLeft, ly, {
    size: 9,
    color: "#444444",
  });
  ly += 7;

  // 合計金額ボックス
  fillRect(colLeft, ly, 85, 13, "#1b3a6b");
  txt("合計金額（税込）", colLeft + 3, ly + 5, {
    size: 7,
    color: "#aac4e8",
  });
  txt(`¥${fmt(calc.total)}`, colLeft + 82, ly + 10, {
    size: 13,
    bold: true,
    color: "#ffffff",
    align: "right",
  });
  ly += 18;

  // 発行者（右カラム）
  if (company.logoBase64) {
    try {
      doc.addImage(company.logoBase64, "PNG", colRightEnd - 35, ry - 2, 35, 12);
      ry += 15;
    } catch {
      // ロゴ読み込み失敗は無視
    }
  }

  const companyLines: [string, number, boolean][] = [
    [company.name || "", 10, true],
    [company.postalCode ? `〒${company.postalCode}` : "", 8, false],
    [company.address || "", 8, false],
    [company.phone ? `TEL：${company.phone}` : "", 8, false],
    [company.email || "", 8, false],
  ];
  for (const [t, sz, bold] of companyLines) {
    if (!t) continue;
    txt(t, colRightEnd, ry, {
      size: sz,
      bold,
      color: "#222222",
      align: "right",
    });
    ry += sz * 0.42 + 2;
  }

  // ════════════════════════════════════════════════════════
  // 3. 区切り線
  // ════════════════════════════════════════════════════════
  const tableStartY = Math.max(ly, ry) + 4;
  drawLine(ml, tableStartY - 2, pageW - mr, tableStartY - 2, "#1b3a6b", 0.5);

  // ════════════════════════════════════════════════════════
  // 4. 明細テーブル
  // ════════════════════════════════════════════════════════
  const bodyRows = estimate.items.map((item) => [
    item.name || "",
    item.quantity.toLocaleString(),
    item.unit || "",
    `¥${fmt(item.unitPrice)}`,
    `¥${fmt(item.quantity * item.unitPrice)}`,
  ]);
  while (bodyRows.length < 5) bodyRows.push(["", "", "", "", ""]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: ml, right: mr },
    head: [["品目", "数量", "単位", "単価", "金額"]],
    body: bodyRows,
    styles: {
      font: fontName,
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      font: fontName,
      fillColor: [27, 58, 107],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      minCellHeight: 9,
    },
    bodyStyles: { font: fontName },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: { fillColor: [245, 244, 240] },
  });

  // ════════════════════════════════════════════════════════
  // 5. 合計サマリー
  // ════════════════════════════════════════════════════════
  const docEx = doc as unknown as JsPDFWithAutoTable;
  let sy = docEx.lastAutoTable.finalY + 7;
  const labelX = pageW - mr - 60;
  const valueX = pageW - mr;
  const rowH = 7;

  txt("小計", labelX, sy, { size: 9, color: "#555555" });
  txt(`¥${fmt(calc.subtotal)}`, valueX, sy, {
    size: 9,
    color: "#333333",
    align: "right",
  });
  sy += rowH;

  if (calc.discountAmount > 0) {
    txt("値引き", labelX, sy, { size: 9, color: "#555555" });
    txt(`-¥${fmt(calc.discountAmount)}`, valueX, sy, {
      size: 9,
      color: "#cc3333",
      align: "right",
    });
    sy += rowH;
  }

  txt(`消費税（${estimate.taxRate}%）`, labelX, sy, {
    size: 9,
    color: "#555555",
  });
  txt(`¥${fmt(calc.taxAmount)}`, valueX, sy, {
    size: 9,
    color: "#333333",
    align: "right",
  });
  sy += rowH + 2;

  // 合計ボックス
  drawLine(labelX - 2, sy - 2, valueX, sy - 2, "#1b3a6b", 0.4);
  fillRect(labelX - 2, sy, valueX - labelX + 2, 12, "#1b3a6b");
  txt("合計金額（税込）", labelX, sy + 5, {
    size: 7.5,
    bold: true,
    color: "#aac4e8",
  });
  txt(`¥${fmt(calc.total)}`, valueX - 1, sy + 9, {
    size: 13,
    bold: true,
    color: "#ffffff",
    align: "right",
  });
  sy += 17;

  // ════════════════════════════════════════════════════════
  // 6. 備考・振込先
  // ════════════════════════════════════════════════════════
  if (estimate.note || company.bankInfo) {
    sy += 3;
    drawLine(ml, sy, pageW - mr, sy, "#cccccc", 0.3);
    sy += 6;

    if (estimate.note) {
      txt("備考：", ml, sy, { size: 9, bold: true, color: "#333333" });
      sy += 6;
      for (const l of estimate.note.split("\n")) {
        if (sy > pageH - 15) break;
        txt(l, ml + 3, sy, { size: 8.5, color: "#555555" });
        sy += 5.5;
      }
      sy += 3;
    }

    if (company.bankInfo) {
      txt("振込先：", ml, sy, { size: 9, bold: true, color: "#333333" });
      sy += 6;
      for (const l of company.bankInfo.split("\n")) {
        if (sy > pageH - 15) break;
        txt(l, ml + 3, sy, { size: 8.5, color: "#555555" });
        sy += 5.5;
      }
    }
  }

  // ════════════════════════════════════════════════════════
  // 7. フッター
  // ════════════════════════════════════════════════════════
  drawLine(ml, pageH - 10, pageW - mr, pageH - 10, "#dddddd", 0.2);
  txt("パッと見積 で作成", pageW / 2, pageH - 6, {
    size: 7,
    color: "#aaaaaa",
    align: "center",
  });

  if (!fontAvailable) {
    console.error(
      "[PDF] 日本語フォントが見つかりません。\n" +
      "以下を実行してフォントをダウンロードしてください:\n" +
      "  npm run download-fonts"
    );
  }

  // ════════════════════════════════════════════════════════
  // 8. 保存
  // ════════════════════════════════════════════════════════
  const filename = `見積書_${estimate.clientName || "無題"}_${estimate.issueDate}.pdf`;
  doc.save(filename);
}
