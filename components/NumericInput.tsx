"use client";
// =============================================
// テンキー最適化 数値入力コンポーネント
// =============================================

interface Props {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  prefix?: string; // "¥" など
  align?: "right" | "left";
}

export default function NumericInput({
  value,
  onChange,
  placeholder = "0",
  className = "",
  prefix,
  align = "right",
}: Props) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={placeholder}
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className={`w-full border border-gray-300 rounded-lg py-3 text-sm
          focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent
          ${align === "right" ? "text-right pr-3" : "text-left pl-3"}
          ${prefix ? "pl-6" : "px-3"}
          ${className}`}
      />
    </div>
  );
}
