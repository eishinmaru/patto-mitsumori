"use client";
// =============================================
// 合計サマリーブロック
// =============================================

import { CalcResult } from "@/lib/types";
import { fmt } from "@/lib/calc";
import NumericInput from "./NumericInput";

interface Props {
  calc: CalcResult;
  taxRate: number;
  discountAmount: number;
  onTaxRateChange?: (v: number) => void;
  onDiscountChange?: (v: number) => void;
  readonly?: boolean;
}

export default function SummaryBlock({
  calc,
  taxRate,
  discountAmount,
  onTaxRateChange,
  onDiscountChange,
  readonly = false,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2.5 text-sm">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">金額内訳</h3>

      {/* 小計 */}
      <div className="flex justify-between">
        <span className="text-gray-500">小計</span>
        <span className="font-semibold">¥{fmt(calc.subtotal)}</span>
      </div>

      {/* 値引き */}
      <div className="flex justify-between items-center">
        <span className="text-gray-500">値引き</span>
        {readonly ? (
          <span className={calc.discountAmount > 0 ? "text-red-500 font-semibold" : "text-gray-400"}>
            {calc.discountAmount > 0 ? `-¥${fmt(calc.discountAmount)}` : "なし"}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-xs">-¥</span>
            <NumericInput
              value={discountAmount}
              onChange={(v) => onDiscountChange?.(v)}
              placeholder="0"
              className="w-28 !py-1.5"
            />
          </div>
        )}
      </div>

      {/* 消費税率 */}
      <div className="flex justify-between items-center">
        <span className="text-gray-500">消費税率</span>
        {readonly ? (
          <span className="font-semibold">{taxRate}%</span>
        ) : (
          <div className="flex gap-1.5">
            {[0, 8, 10].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onTaxRateChange?.(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  taxRate === r
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-2 space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span>課税対象額</span>
          <span>¥{fmt(calc.taxBase)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">消費税額</span>
          <span className="font-semibold">¥{fmt(calc.taxAmount)}</span>
        </div>
      </div>

      {/* 合計 */}
      <div className="flex justify-between items-center bg-orange-50 rounded-xl px-4 py-3 mt-1">
        <span className="font-bold text-gray-800 text-base">合計（税込）</span>
        <span className="font-black text-orange-600 text-2xl">¥{fmt(calc.total)}</span>
      </div>
    </div>
  );
}
