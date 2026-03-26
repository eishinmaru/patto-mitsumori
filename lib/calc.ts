// =============================================
// 金額計算（整数円単位）
// =============================================

import { LineItem, CalcResult } from "./types";

export function calcEstimate(
  items: LineItem[],
  taxRate: number,
  discountAmount: number
): CalcResult {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.floor((taxBase * taxRate) / 100);
  const total = taxBase + taxAmount;
  return { subtotal, discountAmount, taxBase, taxAmount, total };
}

/** 円表記フォーマット（例: 1,000） */
export function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}
