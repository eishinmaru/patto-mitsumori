"use client";
// =============================================
// 明細行（スマホ片手操作最優先）
// =============================================

import { LineItem } from "@/lib/types";
import { fmt } from "@/lib/calc";
import NumericInput from "./NumericInput";

interface Props {
  item: LineItem;
  index: number;
  onChange: (item: LineItem) => void;
  onDelete: (id: string) => void;
}

// よく使う単位のクイック選択
const QUICK_UNITS = ["式", "個", "m", "㎡", "本", "箇所", "台", "枚"];

export default function LineItemRow({ item, index, onChange, onDelete }: Props) {
  const total = item.quantity * item.unitPrice;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm mb-2">
      {/* 行ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="text-red-400 hover:text-red-600 text-lg leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50"
          aria-label="削除"
        >
          ×
        </button>
      </div>

      {/* 品目名 */}
      <input
        type="text"
        placeholder="品目名（例：外壁塗装、電気工事 等）"
        value={item.name}
        onChange={(e) => onChange({ ...item, name: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm mb-2
          focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
      />

      {/* 数量・単位・単価 */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1 ml-1">数量</label>
          <NumericInput
            value={item.quantity}
            onChange={(v) => onChange({ ...item, quantity: v || 1 })}
            placeholder="1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1 ml-1">単位</label>
          <input
            type="text"
            value={item.unit}
            onChange={(e) => onChange({ ...item, unit: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-3 text-sm text-center
              focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1 ml-1">単価（円）</label>
          <NumericInput
            value={item.unitPrice}
            onChange={(v) => onChange({ ...item, unitPrice: v })}
            placeholder="0"
          />
        </div>
      </div>

      {/* 単位クイック選択 */}
      <div className="flex gap-1.5 flex-wrap mb-2">
        {QUICK_UNITS.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onChange({ ...item, unit: u })}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              item.unit === u
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-500 border-gray-300 hover:border-orange-300"
            }`}
          >
            {u}
          </button>
        ))}
      </div>

      {/* 小計 */}
      <div className="text-right text-sm font-bold text-orange-600 bg-orange-50 rounded-lg px-3 py-1.5">
        小計：¥{fmt(total)}
      </div>
    </div>
  );
}
