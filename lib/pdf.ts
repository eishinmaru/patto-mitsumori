// =============================================
// jsPDF による見積書PDF生成
// ・このファイルは動的import経由でクライアントのみ実行される
// ・document が存在する場合のみ canvas を使って日本語を画像化
// ・document が存在しない場合は ASCII フォールバック
// =============================================

import { Estimate, CompanySettings } from "./types";
import { calcEstimate, fmt } from "./calc";

interface JsPDFWithAutoTable {
  lastAutoTable: { finalY: number };
}

// ── canvas が使える環境かどうか ──────────────────────────────
function canUseCanvas(): boolean {
  return typeof document !== "undefined";
}

// ── 日本語テキストを canvas で画像化してPDFに埋め込む ─────────
function makeJpImage(
  doc: { addImage: (...args: unknown[]) => void },
  text: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    bold?: boolean;
    color?: string;
    align?: "left" | "right" | "center";
    maxWidthMm?: number;
  } = {}
): void {
  if (!text || text.trim() === "") return;
  if (!canUseCanvas()) return;

  const {
    size = 10,
    bold = false,
    color = "#000000",
    align = "left",
    maxWidthMm,
  } = opts;

  const scale = 4;
  const pxPerMm = 3.7795;
  const pxSize = size * pxPerMm * scale;
  const fontFamily =
    '"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic","Meiryo","Noto Sans JP",sans-serif';
  const fontStr = `${bold ? "bold " : ""}${pxSize}px ${fontFamily}`;

  // テキスト幅を計測
  const measure = document.createElement("canvas");
  const mctx = measure.getContext("2d")!;
  mctx.font = fontStr;
  const textWidthPx = mctx.measureText(text).width;
  const textWidthMm = textWidthPx / (pxPerMm * scale);

  const renderWidthMm = maxWidthMm
    ? Math.min(textWidthMm, maxWidthMm)
    : textWidthMm;
  const canvasW = Math.ceil(renderWidthMm * pxPerMm * scale) + 4;
  // ★ 修正1: canvasH を 1.3 倍に変更
  const canvasH = Math.ceil(size * pxPerMm * scale * 1.3);

  if (canvasW <= 0 || canvasH <= 0) return;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.font = fontStr;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";

  // ★ 修正2: drawX に Math.max(0, ...) を追加してはみ出し防止
  let drawX = 0;
  if (align === "right") drawX = Math.max(0, canvasW - textWidthPx);
  else if (align === "center") drawX = Math.max(0, (canvasW - textWidthPx) / 2);

  ctx.fillText(text, drawX, pxSize * 0.05);

  const imgData = canvas.toDataURL("image/png");
  const imgWmm = renderWidthMm;
  const imgHmm = canvasH / (pxPerMm * scale);

  // ★ 修正3: align に応じたPDF X座標（imgWmm ベースで計算）
  let pdfX = x;
  if (align === "right") pdfX = x - imgWmm;
  else if (align === "center") pdfX = x - imgWmm / 2;

  // ★ 修正4: pdfY を y - imgHmm に変更
  const pdfY = y - imgHmm;

  doc.addImage(imgData, "PNG", pdfX, pdfY, imgWmm, imgHmm);
}

export async function downloadEstimatePDF(
  estimate: Estimate,
  company: CompanySettings
): Promise<void> {
  if (!canUseCanvas()) {
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

  function jpText(
    text: string,
    x: number,
    y: number,
    opts: {
      size?: number;
      bold?: boolean;
      color?: string;
      align?: "left" | "right" | "center";
      maxWidthMm?: number;
    } = {}
  ): void {
    if (!text || text.trim() === "") return;
    if (canUseCanvas()) {
      makeJpImage(
        doc as unknown as { addImage: (...args: unknown[]) => void },
        text, x, y, opts
      );
    } else {
      const { size = 10, bold = false, color = "#000000", align = "left" } = opts;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      doc.setTextColor(r, g, b);
      doc.text(text, x, y, { align });
    }
  }

  function fillRect(x: number, y: number, w: number, h: number, hex: string): void {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(x, y, w, h, "F");
  }

  function drawLine(
    x1: number, y1: number, x2: number, y2: number,
    hex = "#cccccc", lw = 0.3
  ): void {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(lw);
    doc.line(x1, y1, x2, y2);
  }

  // 1. タイトル
  jpText("見　積　書", pageW / 2, 17, { size: 18, bold: true, color: "#1b3a6b", align: "center" });
  jpText(`発行日：${estimate.issueDate}`, pageW - mr, 14, { size: 8, color: "#666666", align: "right" });

  // 2. 宛先（左）＆ 発行者（右）
  const colLeft = ml;
  const colRightEnd = pageW - mr;
  let ly = 28;
  let ry = 28;

  jpText(`${estimate.clientName || "　"} 御中`, colLeft, ly, { size: 13, bold: true, color: "#1b3a6b" });
  ly += 1;
  drawLine(colLeft, ly, colLeft + 85, ly, "#1b3a6b", 0.5);
  ly += 5;
  jpText(`件名：${estimate.title || "　"}`, colLeft, ly, { size: 9, color: "#444444" });
  ly += 6;

  fillRect(colLeft, ly, 85, 13, "#1b3a6b");
  jpText("合計金額（税込）", colLeft + 2, ly + 5, { size: 7, color: "#aac4e8" });
  jpText(`¥${fmt(calc.total)}`, colLeft + 83, ly + 11, { size: 13, bold: true, color: "#ffffff", align: "right" });
  ly += 17;

  if (company.logoBase64) {
    try {
      doc.addImage(company.logoBase64, "PNG", colRightEnd - 35, ry - 2, 35, 12);
      ry += 14;
    } catch { /* ロゴ読み込み失敗は無視 */ }
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
    jpText(t, colRightEnd, ry, { size: sz, bold, color: "#222222", align: "right" });
    ry += sz * 0.42 + 1.8;
  }

  // 3. 区切り線
  const tableStartY = Math.max(ly, ry) + 4;
  drawLine(ml, tableStartY - 2, pageW - mr, tableStartY - 2, "#1b3a6b", 0.5);

  // 4. 明細テーブル
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
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [27, 58, 107],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      minCellHeight: 9,
    },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    alternateRowStyles: { fillColor: [245, 244, 240] },
    didDrawCell: (data) => {
      if (!canUseCanvas()) return;

      if (data.section === "head") {
        const labels = ["品目", "数量", "単位", "単価", "金額"];
        const label = labels[data.column.index];
        if (!label) return;
        makeJpImage(
          doc as unknown as { addImage: (...args: unknown[]) => void },
          label,
          data.cell.x + data.cell.width / 2,
          data.cell.y + data.cell.height / 2 + 1.5,
          { size: 8.5, bold: true, color: "#ffffff", align: "center" }
        );
      }

      if (data.section === "body" && data.column.index === 0) {
        const rowItem = estimate.items[data.row.index];
        if (!rowItem?.name) return;
        const bgHex = data.row.index % 2 === 0 ? "#ffffff" : "#f5f4f0";
        fillRect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, bgHex);
        makeJpImage(
          doc as unknown as { addImage: (...args: unknown[]) => void },
          rowItem.name,
          data.cell.x + 3,
          data.cell.y + data.cell.height / 2 + 1.5,
          { size: 9, color: "#000000", align: "left", maxWidthMm: data.cell.width - 6 }
        );
      }

      if (data.section === "body" && data.column.index === 2) {
        const rowItem = estimate.items[data.row.index];
        if (!rowItem?.unit) return;
        const bgHex = data.row.index % 2 === 0 ? "#ffffff" : "#f5f4f0";
        fillRect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, bgHex);
        makeJpImage(
          doc as unknown as { addImage: (...args: unknown[]) => void },
          rowItem.unit,
          data.cell.x + data.cell.width / 2,
          data.cell.y + data.cell.height / 2 + 1.5,
          { size: 9, color: "#000000", align: "center" }
        );
      }
    },
  });

  // 5. 合計サマリー
  const docEx = doc as unknown as JsPDFWithAutoTable;
  let sy = docEx.lastAutoTable.finalY + 6;
  const labelX = pageW - mr - 58;
  const valueX = pageW - mr;
  const rowH = 6.5;

  jpText("小計", labelX, sy, { size: 8.5, color: "#555555" });
  jpText(`¥${fmt(calc.subtotal)}`, valueX, sy, { size: 8.5, color: "#333333", align: "right" });
  sy += rowH;

  if (calc.discountAmount > 0) {
    jpText("値引き", labelX, sy, { size: 8.5, color: "#555555" });
    jpText(`-¥${fmt(calc.discountAmount)}`, valueX, sy, { size: 8.5, color: "#cc3333", align: "right" });
    sy += rowH;
  }

  jpText(`消費税（${estimate.taxRate}%）`, labelX, sy, { size: 8.5, color: "#555555" });
  jpText(`¥${fmt(calc.taxAmount)}`, valueX, sy, { size: 8.5, color: "#333333", align: "right" });
  sy += rowH + 1;

  drawLine(labelX - 2, sy - 1, valueX, sy - 1, "#1b3a6b", 0.4);
  fillRect(labelX - 2, sy, valueX - labelX + 2, 11, "#1b3a6b");
  jpText("合計金額（税込）", labelX, sy + 5, { size: 7.5, bold: true, color: "#aac4e8" });
  jpText(`¥${fmt(calc.total)}`, valueX - 1, sy + 8.5, { size: 13, bold: true, color: "#ffffff", align: "right" });
  sy += 15;

  // 6. 備考・振込先
  if (estimate.note || company.bankInfo) {
    sy += 2;
    drawLine(ml, sy, pageW - mr, sy, "#cccccc", 0.3);
    sy += 5;

    if (estimate.note) {
      jpText("備考：", ml, sy, { size: 8.5, bold: true, color: "#333333" });
      sy += 5.5;
      for (const l of estimate.note.split("\n")) {
        if (sy > pageH - 15) break;
        jpText(l, ml + 3, sy, { size: 8, color: "#555555" });
        sy += 5;
      }
      sy += 2;
    }

    if (company.bankInfo) {
      jpText("振込先：", ml, sy, { size: 8.5, bold: true, color: "#333333" });
      sy += 5.5;
      for (const l of company.bankInfo.split("\n")) {
        if (sy > pageH - 15) break;
        jpText(l, ml + 3, sy, { size: 8, color: "#555555" });
        sy += 5;
      }
    }
  }

  // 7. フッター
  drawLine(ml, pageH - 10, pageW - mr, pageH - 10, "#dddddd", 0.2);
  jpText("パッと見積 で作成", pageW / 2, pageH - 6, { size: 7, color: "#aaaaaa", align: "center" });

  // 8. 保存
  doc.save(`見積書_${estimate.clientName || "無題"}_${estimate.issueDate}.pdf`);
}