"use client";
// =============================================
// /history ── 過去見積もり一覧
// =============================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getEstimates,
  deleteEstimate,
  saveEstimate,
  uid,
  today,
} from "@/lib/storage";
import { calcEstimate, fmt } from "@/lib/calc";
import { Estimate } from "@/lib/types";

export default function HistoryPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEstimates(getEstimates());
  }, []);

  if (!mounted) return null;

  const filtered = estimates.filter(
    (e) => e.title.includes(search) || e.clientName.includes(search)
  );

  /** 複製して編集画面へ */
  const handleDuplicate = (est: Estimate) => {
    const copied: Estimate = {
      ...est,
      id: uid(),
      title: `${est.title}（コピー）`,
      issueDate: today(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveEstimate(copied);
    router.push(`/?id=${copied.id}`);
  };

  /** 削除 */
  const handleDelete = (id: string) => {
    if (!confirm("この見積もりを削除しますか？")) return;
    deleteEstimate(id);
    setEstimates(getEstimates());
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-gray-800">📋 見積もり履歴</h1>

      {/* 検索 */}
      <input
        type="search"
        placeholder="🔍 件名・お客様名で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm
          focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      {/* 広告スペース */}
      <div className="bg-gray-100 border border-dashed border-gray-300 rounded-xl h-16 flex items-center justify-center text-xs text-gray-400">
        広告スペース（AdSense）
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 space-y-3">
          <p className="text-5xl">📋</p>
          <p className="font-bold">{search ? "検索結果がありません" : "まだ見積もりがありません"}</p>
          <Link
            href="/"
            className="inline-block mt-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
          >
            最初の見積もりを作る →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">{filtered.length}件</p>
          {filtered.map((est) => {
            const calc = calcEstimate(est.items, est.taxRate, est.discountAmount);
            return (
              <div
                key={est.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                {/* ヘッダー */}
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 mr-2">
                    <p className="font-black text-gray-800 truncate text-base">
                      {est.title || "（件名なし）"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {est.clientName || "お客様未設定"}　{est.issueDate}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{est.items.length}行</p>
                  </div>
                  <p className="text-orange-600 font-black text-xl whitespace-nowrap">
                    ¥{fmt(calc.total)}
                  </p>
                </div>

                {/* アクション */}
                <div className="grid grid-cols-4 gap-2">
                  <Link
                    href={`/?id=${est.id}`}
                    className="text-center bg-orange-50 hover:bg-orange-100 text-orange-600
                      font-bold text-xs py-2.5 rounded-lg transition-colors"
                  >
                    ✏️ 編集
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(est)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600
                      font-bold text-xs py-2.5 rounded-lg transition-colors"
                  >
                    📋 複製
                  </button>
                  <PDFButton est={est} />
                  <button
                    type="button"
                    onClick={() => handleDelete(est.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-500
                      font-bold text-xs py-2.5 rounded-lg transition-colors"
                  >
                    🗑 削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 履歴カード内PDFボタン ─────────────────────
function PDFButton({ est }: { est: Estimate }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handlePDF = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { getCompany } = await import("@/lib/storage");
      const { downloadEstimatePDF } = await import("@/lib/pdf");
      await downloadEstimatePDF(est, getCompany());
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      alert("PDF生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePDF}
      disabled={loading}
      className={`font-bold text-xs py-2.5 rounded-lg transition-colors ${
        done
          ? "bg-green-100 text-green-600"
          : loading
          ? "bg-gray-100 text-gray-400"
          : "bg-green-50 hover:bg-green-100 text-green-600"
      }`}
    >
      {loading ? "⏳" : done ? "✅" : "📄 PDF"}
    </button>
  );
}
