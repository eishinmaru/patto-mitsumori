"use client";
// =============================================
// / ── 見積もり入力画面（メイン）
// =============================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LineItemRow from "@/components/LineItemRow";
import SummaryBlock from "@/components/SummaryBlock";
import LineGuide from "@/components/LineGuide";
import {
  getEstimateById,
  getEstimates,
  saveEstimate,
  getCompany,
  isInitialized,
  markInitialized,
  uid,
  today,
} from "@/lib/storage";
import { calcEstimate } from "@/lib/calc";
import { Estimate, LineItem } from "@/lib/types";

const newItem = (): LineItem => ({
  id: uid(),
  name: "",
  quantity: 1,
  unit: "式",
  unitPrice: 0,
});

const blankEstimate = (): Estimate => ({
  id: uid(),
  title: "",
  clientName: "",
  issueDate: today(),
  items: [newItem()],
  taxRate: 10,
  discountAmount: 0,
  note: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function HomePage() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");

  const [est, setEst] = useState<Estimate>(blankEstimate());
  const [mounted, setMounted] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lineGuide, setLineGuide] = useState<{ show: boolean; filename: string }>({
    show: false,
    filename: "",
  });
  const [saved, setSaved] = useState(false);
  const [templates, setTemplates] = useState<Estimate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // ── est を ref で保持（useCallback の deps を安定させるため） ──
  const estRef = useRef(est);
  useEffect(() => { estRef.current = est; }, [est]);

  useEffect(() => {
    setMounted(true);
    if (!isInitialized()) {
      markInitialized();
      router.push("/settings?first=true");
      return;
    }
    if (editId) {
      const existing = getEstimateById(editId);
      if (existing) setEst(existing);
    }
    setTemplates(getEstimates().slice(0, 10));
  }, [editId, router]);

  // ── 保存（useCallback は early return より前に定義） ──────────
  const handleSave = useCallback(() => {
    const updated = { ...estRef.current, updatedAt: new Date().toISOString() };
    saveEstimate(updated);
    setEst(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []); // estRef は mutable ref なので deps 不要

  // ─────────────────────────────────────────────────────────────
  // early return はすべての Hook 定義より後に置く
  // ─────────────────────────────────────────────────────────────
  if (!mounted) return null;

  const calc = calcEstimate(est.items, est.taxRate, est.discountAmount);

  // ── フィールド更新 ──────────────────────────────────────────
  const setField = <K extends keyof Estimate>(k: K, v: Estimate[K]) =>
    setEst((p) => ({ ...p, [k]: v }));

  // ── 明細 CRUD ───────────────────────────────────────────────
  const updateItem = (item: LineItem) =>
    setEst((p) => ({ ...p, items: p.items.map((i) => (i.id === item.id ? item : i)) }));
  const deleteItem = (id: string) =>
    setEst((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));
  const addItem = () =>
    setEst((p) => ({ ...p, items: [...p.items, newItem()] }));

  // ── テンプレート適用 ────────────────────────────────────────
  const applyTemplate = (tpl: Estimate) => {
    setEst((p) => ({
      ...p,
      items: tpl.items.map((i) => ({ ...i, id: uid() })),
      taxRate: tpl.taxRate,
      note: tpl.note,
    }));
    setShowTemplates(false);
  };

  // ── PDF出力 ─────────────────────────────────────────────────
  const handlePDF = async () => {
    if (pdfLoading) return;
    const updated = { ...est, updatedAt: new Date().toISOString() };
    saveEstimate(updated);
    setEst(updated);

    setPdfLoading(true);
    try {
      const company = getCompany();
      const { downloadEstimatePDF } = await import("@/lib/pdf");
      await downloadEstimatePDF(updated, company);
      const filename = `見積書_${updated.clientName || "無題"}_${updated.issueDate}.pdf`;
      setLineGuide({ show: true, filename });
    } catch (e) {
      console.error(e);
      alert("PDF生成に失敗しました。もう一度お試しください。");
    } finally {
      setPdfLoading(false);
    }
  };

  // ── リセット ────────────────────────────────────────────────
  const handleNew = () => {
    if (!confirm("入力内容をクリアして新規作成しますか？")) return;
    setEst(blankEstimate());
    router.replace("/");
  };

  return (
    <>
      {/* LINE送付案内モーダル */}
      {lineGuide.show && (
        <LineGuide
          filename={lineGuide.filename}
          onClose={() => setLineGuide({ show: false, filename: "" })}
        />
      )}

      <div className="space-y-4">
        {/* ページヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-gray-800">
            {editId ? "✏️ 見積もりを編集" : "✏️ 新しい見積もり"}
          </h1>
          <div className="flex gap-2">
            {templates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs border border-orange-300 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-50 font-bold"
              >
                📋 テンプレ
              </button>
            )}
            <button
              type="button"
              onClick={handleNew}
              className="text-xs border border-gray-300 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              ＋ 新規
            </button>
          </div>
        </div>

        {/* テンプレート選択 */}
        {showTemplates && (
          <div className="bg-white border border-orange-200 rounded-xl shadow-lg p-3 space-y-1">
            <p className="text-xs text-gray-400 font-bold px-1 mb-2">過去の見積もりから流用</p>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-orange-50 text-sm border border-transparent hover:border-orange-200 transition-colors"
              >
                <span className="font-bold text-gray-800">{tpl.title || "（件名なし）"}</span>
                <span className="text-xs text-gray-400 ml-2">{tpl.clientName}　{tpl.issueDate}</span>
              </button>
            ))}
          </div>
        )}

        {/* 広告スペース */}
        <div className="bg-gray-100 border border-dashed border-gray-300 rounded-xl h-16 flex items-center justify-center text-xs text-gray-400">
          広告スペース（AdSense）
        </div>

        {/* 基本情報 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">基本情報</h2>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="外壁塗装工事、電気設備工事 など"
              value={est.title}
              onChange={(e) => setField("title", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm
                focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">お客様名</label>
            <input
              type="text"
              placeholder="田中様、○○工務店 など"
              value={est.clientName}
              onChange={(e) => setField("clientName", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm
                focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">発行日</label>
            <input
              type="date"
              value={est.issueDate}
              onChange={(e) => setField("issueDate", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm
                focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* 明細 */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-black text-gray-700">明細（{est.items.length}行）</h2>
          </div>

          {est.items.map((item, i) => (
            <LineItemRow
              key={item.id}
              item={item}
              index={i}
              onChange={updateItem}
              onDelete={deleteItem}
            />
          ))}

          <button
            type="button"
            onClick={addItem}
            className="w-full border-2 border-dashed border-orange-300 text-orange-500
              hover:bg-orange-50 rounded-xl py-4 text-sm font-bold transition-colors mt-1"
          >
            ＋ 明細行を追加
          </button>
        </div>

        {/* 合計サマリー */}
        <SummaryBlock
          calc={calc}
          taxRate={est.taxRate}
          discountAmount={est.discountAmount}
          onTaxRateChange={(v) => setField("taxRate", v)}
          onDiscountChange={(v) => setField("discountAmount", v)}
        />

        {/* 備考 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            備考
          </label>
          <textarea
            placeholder="お支払い期限、工事条件、その他ご連絡事項など"
            value={est.note}
            onChange={(e) => setField("note", e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handlePDF}
            disabled={pdfLoading}
            className={`w-full py-5 rounded-2xl font-black text-lg shadow-lg transition-all ${
              pdfLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600 text-white active:scale-95"
            }`}
          >
            {pdfLoading ? "⏳ PDF生成中..." : "📄 PDF出力 → LINEで送る"}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
              saved
                ? "bg-green-500 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            {saved ? "✅ 保存しました" : "💾 下書き保存"}
          </button>
        </div>

        {/* PDF＋LINE説明バナー */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 text-sm text-gray-600">
          <p className="font-bold text-gray-800 mb-1">📱 LINEでの送り方</p>
          <p className="text-xs leading-relaxed">
            「PDF出力」ボタンでPDFをダウンロードした後、
            LINEのトーク画面から📎ボタンでファイルとして添付して送ってください。
          </p>
        </div>
      </div>
    </>
  );
}