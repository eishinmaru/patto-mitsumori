// =============================================
// jsPDF による見積書PDF生成
// =============================================

import { Estimate, CompanySettings } from "./types";
import { calcEstimate, fmt } from "./calc";

interface JsPDFWithAutoTable {
  lastAutoTable: { finalY: number };
}

export async function downloadEstimatePDF(
  estimate: Estimate,
  company: CompanySettings
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const calc = calcEstimate(estimate.items, estimate.taxRate, estimate.discountAmount);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ml = 15;
  const mr = 15;

  function txt(text: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: string; align?: "left" | "right" | "center" } = {}) {
    const { size = 10, bold = false, color = "#000000", align = "left" } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const r = parseInt(color.slice(1,3),16);
    const g = parseInt(color.slice(3,5),16);
    const b = parseInt(color.slice(5,7),16);
    doc.setTextColor(r,g,b);
    doc.text(text, x, y, { align });
  }

  function fillRect(x: number, y: number, w: number, h: number, hex: string) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    doc.setFillColor(r,g,b);
    doc.rect(x,y,w,h,"F");
  }

  function line(x1: number, y1: number, x2: number, y2: number, hex = "#cccccc", lw = 0.3) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    doc.setDrawColor(r,g,b);
    doc.setLineWidth(lw);
    doc.line(x1,y1,x2,y2);
  }

  txt("MITSUMORI-SHO", pageW/2, 16, { size:18, bold:true, align:"center", color:"#1b3a6b" });
  txt("( Estimate )", pageW/2, 21, { size:8, color:"#888888", align:"center" });
  txt(`Date: ${estimate.issueDate}`, pageW-mr, 14, { size:8, color:"#666666", align:"right" });

  const colLeft = ml;
  const colRightEnd = pageW - mr;
  let ly = 28;
  let ry = 28;

  txt(estimate.clientName || "---", colLeft, ly, { size:13, bold:true, color:"#1b3a6b" });
  ly += 1;
  line(colLeft, ly, colLeft+85, ly, "#1b3a6b", 0.5);
  ly += 5;
  txt(`Subject: ${estimate.title || "---"}`, colLeft, ly, { size:9, color:"#444444" });
  ly += 6;

  fillRect(colLeft, ly, 85, 12, "#1b3a6b");
  txt("TOTAL (tax incl.)", colLeft+2, ly+4, { size:7, color:"#aac4e8" });
  txt(`\\${fmt(calc.total)}`, colLeft+83, ly+9, { size:13, bold:true, color:"#ffffff", align:"right" });
  ly += 16;

  if (company.logoBase64) {
    try { doc.addImage(company.logoBase64,"PNG",colRightEnd-35,ry-2,35,12); ry+=14; } catch { /* ignore */ }
  }

  const companyLines: [string, number, boolean][] = [
    [company.name||"---", 10, true],
    [company.postalCode ? `〒 ${company.postalCode}` : "", 8, false],
    [company.address||"", 8, false],
    [company.phone ? `TEL: ${company.phone}` : "", 8, false],
    [company.email||"", 8, false],
  ];
  for (const [t,sz,bold] of companyLines) {
    if (!t) continue;
    txt(t, colRightEnd, ry, { size:sz, bold, color:"#222222", align:"right" });
    ry += sz*0.42+1.8;
  }

  const tableStartY = Math.max(ly,ry)+4;
  line(ml, tableStartY-2, pageW-mr, tableStartY-2, "#1b3a6b", 0.5);

  const bodyRows = estimate.items.map(item => [
    item.name||"",
    item.quantity.toLocaleString(),
    item.unit||"",
    `\\${fmt(item.unitPrice)}`,
    `\\${fmt(item.quantity*item.unitPrice)}`,
  ]);
  while (bodyRows.length < 5) bodyRows.push(["","","","",""]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left:ml, right:mr },
    head: [["Item / Description","Qty","Unit","Unit Price","Amount"]],
    body: bodyRows,
    styles: { font:"helvetica", fontSize:9, cellPadding:{top:3,bottom:3,left:3,right:3}, lineColor:[220,220,220], lineWidth:0.2 },
    headStyles: { fillColor:[27,58,107], textColor:[255,255,255], fontStyle:"bold", fontSize:8.5, halign:"center" },
    columnStyles: {
      0:{cellWidth:"auto",halign:"left"},
      1:{cellWidth:14,halign:"center"},
      2:{cellWidth:14,halign:"center"},
      3:{cellWidth:30,halign:"right"},
      4:{cellWidth:30,halign:"right"},
    },
    alternateRowStyles: { fillColor:[245,244,240] },
  });

  const docEx = doc as unknown as JsPDFWithAutoTable;
  let sy = docEx.lastAutoTable.finalY + 6;
  const labelX = pageW-mr-55;
  const valueX = pageW-mr;
  const rowH = 6;

  txt("Subtotal", labelX, sy, { size:8.5, color:"#555555" });
  txt(`\\${fmt(calc.subtotal)}`, valueX, sy, { size:8.5, align:"right", color:"#333333" });
  sy += rowH;

  if (calc.discountAmount > 0) {
    txt("Discount", labelX, sy, { size:8.5, color:"#555555" });
    txt(`-\\${fmt(calc.discountAmount)}`, valueX, sy, { size:8.5, align:"right", color:"#cc3333" });
    sy += rowH;
  }

  txt(`Tax (${estimate.taxRate}%)`, labelX, sy, { size:8.5, color:"#555555" });
  txt(`\\${fmt(calc.taxAmount)}`, valueX, sy, { size:8.5, align:"right", color:"#333333" });
  sy += rowH+1;

  line(labelX-2, sy-1, valueX, sy-1, "#1b3a6b", 0.4);
  fillRect(labelX-2, sy, valueX-labelX+2, 10, "#1b3a6b");
  txt("TOTAL (tax incl.)", labelX, sy+4, { size:7.5, bold:true, color:"#aac4e8" });
  txt(`\\${fmt(calc.total)}`, valueX-1, sy+7.5, { size:13, bold:true, color:"#ffffff", align:"right" });
  sy += 14;

  if (estimate.note || company.bankInfo) {
    sy += 2;
    line(ml, sy, pageW-mr, sy, "#cccccc", 0.3);
    sy += 5;
    if (estimate.note) {
      txt("Note:", ml, sy, { size:8.5, bold:true, color:"#333333" });
      sy += 5;
      for (const l of estimate.note.split("\n")) {
        if (sy > pageH-15) break;
        txt(l, ml+3, sy, { size:8, color:"#555555" });
        sy += 5;
      }
      sy += 2;
    }
    if (company.bankInfo) {
      txt("Bank Info:", ml, sy, { size:8.5, bold:true, color:"#333333" });
      sy += 5;
      for (const l of company.bankInfo.split("\n")) {
        if (sy > pageH-15) break;
        txt(l, ml+3, sy, { size:8, color:"#555555" });
        sy += 5;
      }
    }
  }

  line(ml, pageH-10, pageW-mr, pageH-10, "#dddddd", 0.2);
  txt("Generated by Patto-Mitsumori", pageW/2, pageH-6, { size:7, color:"#aaaaaa", align:"center" });

  doc.save(`mitsumori_${estimate.clientName||"untitled"}_${estimate.issueDate}.pdf`);
}