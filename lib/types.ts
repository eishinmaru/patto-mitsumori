// =============================================
// 型定義
// =============================================

/** 明細行 */
export interface LineItem {
  id: string;
  name: string;      // 品目名
  quantity: number;  // 数量
  unit: string;      // 単位
  unitPrice: number; // 単価（円・整数）
}

/** 見積もり */
export interface Estimate {
  id: string;
  title: string;          // 件名
  clientName: string;     // 顧客名
  issueDate: string;      // 発行日 YYYY-MM-DD
  items: LineItem[];
  taxRate: number;        // 消費税率 0/8/10
  discountAmount: number; // 値引き額（円・整数）
  note: string;           // 備考
  createdAt: string;
  updatedAt: string;
}

/** 会社情報 */
export interface CompanySettings {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  logoBase64: string;
  bankInfo: string;
}

/** 計算結果 */
export interface CalcResult {
  subtotal: number;
  discountAmount: number;
  taxBase: number;
  taxAmount: number;
  total: number;
}
