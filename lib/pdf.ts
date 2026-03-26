// =============================================
// jsPDF による PDF 生成
// =============================================

import { Estimate, CompanySettings } from "./types";
import { calcEstimate, fmt } from "./calc";

/**
 * 見積書PDFを生成してダウンロードする
 * ※ jspdf は動的インポートで読み込み（SSR回避）
 */
export async function downloadEstimatePDF(
  estimate: Estimate,
  company: CompanySettings
): Promise<void> {
  // 動的インポート（クライアントサイドのみ）
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const calc = calcEstimate(estimate.items, estimate.taxRate, estimate.discountAmount);

  // ── フォント設定（日本語はUnicode対応フォントが必要なため、
  //    文字化け回避のためBase64埋め込みフォントではなく
  //    標準フォントで英数字、日本語部分は別処理） ──
  // ※ 日本語PDFはjsPDF標準フォントでは文字化けするため、
  //    ここではNoto Sans JPをCDNから取得する方式を採用。
  //    ただしCDN依存を避けるため、フォールバックとして
  //    日本語テキストをcanvas経由でPNGに変換して埋め込む。

  const pageW = doc.internal.pageSize.getWidth();   // 210mm
  const margin = 15;
  const contentW = pageW - margin * 2;

  // ── ヘルパー：日本語テキストをcanvasでPNGに変換して埋め込む ──
  function addJpText(
    text: string,
    x: number,
    y: number,
    opts: {
      fontSize?: number;
      fontWeight?: string;
      color?: string;
      align?: "left" | "right" | "center";
      maxWidth?: number;
    } = {}
  ) {
    const {
      fontSize = 10,
      fontWeight = "normal",
      color = "#000000",
      align = "left",
      maxWidth,
    } = opts;

    if (!text) return;

    const canvas = document.createElement("canvas");
    const scale = 3; // 高解像度
    const pxPerMm = 3.7795; // 1mm = 3.7795px (96dpi)
    const pxFontSize = fontSize * pxPerMm * scale;

    const ctx = canvas.getContext("2d")!;
    ctx.font = `${fontWeight} ${pxFontSize}px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`;

    const textPx = ctx.measureText(text).width;
    const textMm = textPx / (pxPerMm * scale);

    // maxWidthが指定されている場合はクリップ
    const renderWidthMm = maxWidth ? Math.min(textMm, maxWidth) : textMm;
    const canvasWidthPx = Math.ceil(renderWidthMm * pxPerMm * scale) + 4;
    const canvasHeightPx = Math.ceil(fontSize * pxPerMm * scale * 1.4);

    canvas.width = canvasWidthPx;
    canvas.height = canvasHeightPx;

    const ctx2 = canvas.getContext("2d")!;
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    ctx2.font = `${fontWeight} ${pxFontSize}px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`;
    ctx2.fillStyle = color;
    ctx2.textBaseline = "top";

    let drawX = 0;
    if (align === "right") drawX = canvasWidthPx - textPx;
    else if (align === "center") drawX = (canvasWidthPx - textPx) / 2;

    ctx2.fillText(text, drawX, 2);

    const imgData = canvas.toDataURL("image/png");
    const imgW = renderWidthMm;
    const imgH = (canvasHeightPx / (pxPerMm * scale));

    let drawXmm = x;
    if (align === "right") drawXmm = x - renderWidthMm;
    else if (align === "center") drawXmm = x - renderWidthMm / 2;

    doc.addImage(imgData, "PNG", drawXmm, y - imgH * 0.8, imgW, imgH);
  }

  // ════════════════════════════════════════
  // タイトル「見積書」
  // ════════════════════════════════════════
  addJpText("見　積　書", pageW / 2, 20, {
    fontSize: 18,
    fontWeight: "bold",
    align: "center",
  });

  // ── 発行日
  addJpText(`発行日：${estimate.issueDate}`, pageW - margin, 28, {
    fontSize: 9,
    color: "#666666",
    align: "right",
  });

  // ════════════════════════════════════════
  // 宛先ブロック（左）
  // ════════════════════════════════════════
  addJpText(`${estimate.clientName || "　"} 御中`, margin, 40, {
    fontSize: 13,
    fontWeight: "bold",
  });

  // 宛先下線
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.5);
  doc.line(margin, 41, margin + 80, 41);

  addJpText(`件名：${estimate.title}`, margin, 47, {
    fontSize: 10,
    color: "#444444",
  });

  addJpText(`合計金額：¥${fmt(calc.total)}（税込）`, margin, 54, {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1d4ed8",
  });

  // ════════════════════════════════════════
  // 発行者ブロック（右）
  // ════════════════════════════════════════
  const rightX = pageW - margin;
  let ry = 37;

  // ロゴ画像
  if (company.logoBase64) {
    try {
      const logoH = 12;
      const logoW = 30;
      doc.addImage(company.logoBase64, "PNG", rightX - logoW, ry, logoW, logoH);
      ry += logoH + 2;
    } catch {
      // ロゴ読み込み失敗は無視
    }
  }

  const companyLines: [string, number][] = [
    [company.name, 10],
    [company.postalCode ? `〒${company.postalCode}` : "", 8],
    [company.address, 8],
    [company.phone ? `TEL: ${company.phone}` : "", 8],
    [company.email, 8],
  ];
  for (const [text, fs] of companyLines) {
    if (!text) continue;
    addJpText(text, rightX, ry, { fontSize: fs, align: "right" });
    ry += fs * 0.45 + 1.5;
  }

  // ════════════════════════════════════════
  // 明細テーブル
  // ════════════════════════════════════════
  const tableTop = 62;

  // テーブルヘッダー（日本語はcanvas経由で後から上書き）
  autoTable(doc, {
    startY: tableTop,
    margin: { left: margin, right: margin },
    head: [["品目", "数量", "単位", "単価", "金額"]],
    body: estimate.items.map((item) => [
      item.name || "",
      item.quantity.toString(),
      item.unit,
      `\\${fmt(item.unitPrice)}`,
      `\\${fmt(item.quantity * item.unitPrice)}`,
    ]),
    // 空行パディング（最低5行）
    ...(estimate.items.length < 5
      ? {
          body: [
            ...estimate.items.map((item) => [
              item.name || "",
              item.quantity.toString(),
              item.unit,
              `\\${fmt(item.unitPrice)}`,
              `\\${fmt(item.quantity * item.unitPrice)}`,
            ]),
            ...Array.from({ length: 5 - estimate.items.length }).map(() => [
              "",
              "",
              "",
              "",
              "",
            ]),
          ],
        }
      : {}),
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [37, 99, 235], // blue-600
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 16 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawCell: (data) => {
      // ヘッダーの日本語を上書き
      if (data.section === "head") {
        const labels = ["品目", "数量", "単位", "単価", "金額"];
        const label = labels[data.column.index];
        if (label) {
          addJpText(
            label,
            data.cell.x + data.cell.width / 2,
            data.cell.y + data.cell.height * 0.65,
            { fontSize: 9, fontWeight: "bold", color: "#ffffff", align: "center" }
          );
        }
      }
      // 品目列の日本語テキスト
      if (data.section === "body" && data.column.index === 0) {
        const text = estimate.items[data.row.index]?.name ?? "";
        if (text) {
          // 既存テキストをクリア（白で塗る）
          doc.setFillColor(
            data.row.index % 2 === 0 ? 255 : 248
          );
          doc.rect(
            data.cell.x + 0.5,
            data.cell.y + 0.5,
            data.cell.width - 1,
            data.cell.height - 1,
            "F"
          );
          addJpText(text, data.cell.x + 2, data.cell.y + data.cell.height * 0.7, {
            fontSize: 9,
            maxWidth: data.cell.width - 4,
          });
        }
      }
      // 単位列
      if (data.section === "body" && data.column.index === 2) {
        const unit = estimate.items[data.row.index]?.unit ?? "";
        if (unit) {
          doc.setFillColor(data.row.index % 2 === 0 ? 255 : 248);
          doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, "F");
          addJpText(unit, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height * 0.7, {
            fontSize: 9,
            align: "center",
          });
        }
      }
    },
  });

  // ════════════════════════════════════════
  // 合計サマリー（右寄せ）
  // ════════════════════════════════════════
  // @ts-expect-error jspdf-autotable adds lastAutoTable
  const afterTable = (doc as any).lastAutoTable.finalY + 4;
  const sumX = pageW - margin;
  const sumLabelX = sumX - 45;
  let sy = afterTable + 5;

  const summaryRows: [string, string, boolean][] = [
    ["小計", `¥${fmt(calc.subtotal)}`, false],
    ...(calc.discountAmount > 0
      ? ([["値引き", `-¥${fmt(calc.discountAmount)}`, false]] as [string, string, boolean][])
      : []),
    [`消費税(${estimate.taxRate}%)`, `¥${fmt(calc.taxAmount)}`, false],
  ];

  for (const [label, value] of summaryRows) {
    addJpText(label, sumLabelX, sy, { fontSize: 9, color: "#555555" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(value, sumX, sy, { align: "right" });
    sy += 6;
  }

  // 合計ボックス
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(sumLabelX - 5, sy - 1, sumX - sumLabelX + 5 + margin - margin, 9, 1, 1, "F");
  addJpText("合計（税込）", sumLabelX, sy + 6, {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e3a8a",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(29, 78, 216);
  doc.text(`¥${fmt(calc.total)}`, sumX, sy + 6, { align: "right" });
  sy += 14;

  // ════════════════════════════════════════
  // 備考・振込先
  // ════════════════════════════════════════
  if (estimate.note || company.bankInfo) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, sy, pageW - margin, sy);
    sy += 5;

    if (estimate.note) {
      addJpText("備考", margin, sy, { fontSize: 9, fontWeight: "bold" });
      sy += 5;
      const noteLines = estimate.note.split("\n");
      for (const line of noteLines) {
        addJpText(line, margin + 2, sy, { fontSize: 8.5, color: "#444444" });
        sy += 5;
      }
    }

    if (company.bankInfo) {
      addJpText("振込先", margin, sy, { fontSize: 9, fontWeight: "bold" });
      sy += 5;
      const bankLines = company.bankInfo.split("\n");
      for (const line of bankLines) {
        addJpText(line, margin + 2, sy, { fontSize: 8.5, color: "#444444" });
        sy += 5;
      }
    }
  }

  // ════════════════════════════════════════
  // ダウンロード
  // ════════════════════════════════════════
  const filename = `見積書_${estimate.clientName || "無題"}_${estimate.issueDate}.pdf`;
  doc.save(filename);
}
