// =============================================
// jsPDF による見積書PDF生成
// 日本語対応：TTFフォントをfetchしてjsPDFに埋め込む
// woff/woff2はjsPDF非対応のため、TTFのみを使用
// =============================================

import { Estimate, CompanySettings } from "./types";
import { calcEstimate, fmt } from "./calc";

interface JsPDFWithAutoTable {
  lastAutoTable: { finalY: number };
}

let cachedFontRegular: string | null = null;
let cachedFontBold: string | null = null;

// TTFフォントのCDN候補（順番に試みる）
// jsPDFはTTF形式のみ対応。woff/woff2は非対応。
const FONT_SOURCES_REGULAR = [
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Regular.ttf",
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted-upm/NotoSansJP/NotoSansJP-Regular.ttf",
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Regular.ttf",
];

const FONT_SOURCES_BOLD = [
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Bold.ttf",
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted-upm/NotoSansJP/NotoSansJP-Bold.ttf",
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Bold.ttf",
];

async function fetchFontWithFallback(urls: string[]): Promise<string> {
  const errors: string[] = [];

  for (const url of urls) {
    try {
      console.log(`[PDF] フォント取得試行: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const msg = `HTTP ${res.status} ${res.statusText}`;
        console.warn(`[PDF] フォント取得失敗 (${msg}): ${url}`);
        errors.push(`${url}: ${msg}`);
        continue;
      }

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 1000) {
        const msg = `ファイルサイズが小さすぎます (${buffer.byteLength} bytes)`;
        console.warn(`[PDF] フォント取得失敗 (${msg}): ${url}`);
        errors.push(`${url}: ${msg}`);
        continue;
      }

      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);
      console.log(`[PDF] フォント取得成功: ${url} (${Math.round(buffer.byteLength / 1024)}KB)`);
      return base64;

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[PDF] フォント取得エラー (${msg}): ${url}`);
      errors.push(`${url}: ${msg}`);
    }
  }

  throw new Error(`全フォントソースの取得に失敗しました:\n${errors.join("\n")}`);
}

async function registerJapaneseFont(doc: {
  addFileToVFS: (filename: string, base64: string) => void;
  addFont: (filename: string, fontName: string, style: string) => void;
  setFont: (fontName: string, style?: string) => void;
}): Promise<{ fontName: string; available: boolean }> {
  const FONT_NAME = "NotoSansJP";

  try {
    if (!cachedFontRegular) {
      console.log("[PDF] NotoSansJP-Regular を取得中...");
      cachedFontRegular = await fetchFontWithFallback(FONT_SOURCES_REGULAR);
    }
    doc.addFileToVFS("NotoSansJP-Regular.ttf", cachedFontRegular);
    doc.addFont("NotoSansJP-Regular.ttf", FONT_NAME, "normal");

    if (!cachedFontBold) {
      console.log("[PDF] NotoSansJP-Bold を取得中...");
      cachedFontBold = await fetchFontWithFallback(FONT_SOURCES_BOLD);
    }
    doc.addFileToVFS("NotoSansJP-Bold.ttf", cachedFontBold);
    doc.addFont("NotoSansJP-Bold.ttf", FONT_NAME, "bold");

    doc.setFont(FONT_NAME, "normal");
    console.log("[PDF] 日本語フォント登録完了");
    return { fontName: FONT_NAME, available: true };

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PDF] 日本語フォントの登録に失敗しました:", msg);
    console.warn("[PDF] helveticaフォントで続行します（日本語は文字化けする可能性があります）");
    doc.setFont("helvetica", "normal");
    return { fontName: "helvetica", available: false };
  }
}

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
  const calc = calcEstimate(estimate.items, estimate.taxRate, estimate.discountAmount);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ml = 15;
  const mr = 15;

  const { fontName, available: fontAvailable } = await registerJapaneseFont(
    doc as unknown as {
      addFileToVFS: (filename: string, base64: string) => void;
      addFont: (filename: string, fontName: string, style: string) => void;
      setFont: (fontName: string, style?: string) => void;
    }
  );

  function txt(
    text: string, x: number, y: number,
    opts: { size?: number; bold?: boolean; color?: string; align?: "left" | "right" | "center"; maxWidth?: number } = {}
  ): void {
    if (!text) return;
    const { size = 10, bold = false, color = "#000000", align = "left", maxWidth } = opts;
    doc.setFont(fontName, bold ? "bold" : "normal");
    doc.setFontSize(size);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    doc.setTextColor(r, g, b);
    if (maxWidth) { doc.text(text, x, y, { align, maxWidth }); }
    else { doc.text(text, x, y, { align }); }
  }

  function fillRect(x: number, y: number, w: number, h: number, hex: string): void {
    doc.setFillColor(parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16));
    doc.rect(x, y, w, h, "F");
  }

  function drawLine(x1: number, y1: number, x2: number, y2: number, hex = "#cccccc", lw = 0.3): void {
    doc.setDrawColor(parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16));
    doc.setLineWidth(lw);
    doc.line(x1, y1, x2, y2);
  }

  // 1. タイトル
  txt("見　積　書", pageW / 2, 17, { size: 18, bold: true, color: "#1b3a6b", align: "center" });
  txt(`発行日：${estimate.issueDate}`, pageW - mr, 14, { size: 8, color: "#666666", align: "right" });

  // 2. 宛先（左）＆ 発行者（右）
  const colLeft = ml;
  const colRightEnd = pageW - mr;
  let ly = 28;
  let ry = 28;

  txt(`${estimate.clientName || "　"} 御中`, colLeft, ly, { size: 13, bold: true, color: "#1b3a6b" });
  ly += 1;
  drawLine(colLeft, ly, colLeft + 85, ly, "#1b3a6b", 0.5);
  ly += 6;
  txt(`件名：${estimate.title || "　"}`, colLeft, ly, { size: 9, color: "#444444" });
  ly += 7;

  fillRect(colLeft, ly, 85, 13, "#1b3a6b");
  txt("合計金額（税込）", colLeft + 3, ly + 5, { size: 7, color: "#aac4e8" });
  txt(`¥${fmt(calc.total)}`, colLeft + 82, ly + 10, { size: 13, bold: true, color: "#ffffff", align: "right" });
  ly += 18;

  if (company.logoBase64) {
    try { doc.addImage(company.logoBase64, "PNG", colRightEnd - 35, ry - 2, 35, 12); ry += 15; }
    catch { /* ignore */ }
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
    txt(t, colRightEnd, ry, { size: sz, bold, color: "#222222", align: "right" });
    ry += sz * 0.42 + 2;
  }

  // 3. 区切り線
  const tableStartY = Math.max(ly, ry) + 4;
  drawLine(ml, tableStartY - 2, pageW - mr, tableStartY - 2, "#1b3a6b", 0.5);

  // 4. 明細テーブル
  const bodyRows = estimate.items.map((item) => [
    item.name || "", item.quantity.toLocaleString(), item.unit || "",
    `¥${fmt(item.unitPrice)}`, `¥${fmt(item.quantity * item.unitPrice)}`,
  ]);
  while (bodyRows.length < 5) bodyRows.push(["", "", "", "", ""]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: ml, right: mr },
    head: [["品目", "数量", "単位", "単価", "金額"]],
    body: bodyRows,
    styles: { font: fontName, fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { font: fontName, fillColor: [27, 58, 107], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9, halign: "center", minCellHeight: 9 },
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

  // 5. 合計サマリー
  const docEx = doc as unknown as JsPDFWithAutoTable;
  let sy = docEx.lastAutoTable.finalY + 7;
  const labelX = pageW - mr - 60;
  const valueX = pageW - mr;
  const rowH = 7;

  txt("小計", labelX, sy, { size: 9, color: "#555555" });
  txt(`¥${fmt(calc.subtotal)}`, valueX, sy, { size: 9, color: "#333333", align: "right" });
  sy += rowH;

  if (calc.discountAmount > 0) {
    txt("値引き", labelX, sy, { size: 9, color: "#555555" });
    txt(`-¥${fmt(calc.discountAmount)}`, valueX, sy, { size: 9, color: "#cc3333", align: "right" });
    sy += rowH;
  }

  txt(`消費税（${estimate.taxRate}%）`, labelX, sy, { size: 9, color: "#555555" });
  txt(`¥${fmt(calc.taxAmount)}`, valueX, sy, { size: 9, color: "#333333", align: "right" });
  sy += rowH + 2;

  drawLine(labelX - 2, sy - 2, valueX, sy - 2, "#1b3a6b", 0.4);
  fillRect(labelX - 2, sy, valueX - labelX + 2, 12, "#1b3a6b");
  txt("合計金額（税込）", labelX, sy + 5, { size: 7.5, bold: true, color: "#aac4e8" });
  txt(`¥${fmt(calc.total)}`, valueX - 1, sy + 9, { size: 13, bold: true, color: "#ffffff", align: "right" });
  sy += 17;

  // 6. 備考・振込先
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

  // 7. フッター
  drawLine(ml, pageH - 10, pageW - mr, pageH - 10, "#dddddd", 0.2);
  txt("パッと見積 で作成", pageW / 2, pageH - 6, { size: 7, color: "#aaaaaa", align: "center" });

  if (!fontAvailable) {
    console.error(
      "[PDF] 警告: 日本語フォントの取得に失敗しました。\n" +
      "試みたURL:\n" + [...FONT_SOURCES_REGULAR, ...FONT_SOURCES_BOLD].join("\n")
    );
  }

  // 8. 保存
  doc.save(`見積書_${estimate.clientName || "無題"}_${estimate.issueDate}.pdf`);
}