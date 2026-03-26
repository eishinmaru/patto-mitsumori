"use client";
// =============================================
// /settings ── 会社情報・ロゴ登録
// =============================================

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCompany, saveCompany } from "@/lib/storage";
import { CompanySettings } from "@/lib/types";

const BLANK: CompanySettings = {
  name: "", postalCode: "", address: "", phone: "",
  email: "", logoBase64: "", bankInfo: "",
};

// =============================================
// useSearchParams() を使う内部コンポーネント
// =============================================
function SettingsPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const isFirst = params.get("first") === "true";

  const [s, setS] = useState<CompanySettings>(BLANK);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setS(getCompany());
  }, []);

  if (!mounted) return null;

  const upd = (k: keyof CompanySettings, v: string) =>
    setS((p) => ({ ...p, [k]: v }));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => upd("logoBase64", ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveCompany(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (isFirst) router.push("/");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {isFirst && (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
            初回設定
          </span>
        )}
        <h1 className="text-lg font-black text-gray-800">⚙️ 会社情報設定</h1>
      </div>

      {isFirst && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
          <p className="font-bold mb-1">🎉 ようこそ！パッと見積へ</p>
          会社名や連絡先を設定しておくと、見積書に自動で反映されます。
          後でいつでも変更できます。
        </div>
      )}

      {/* ロゴ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-700 mb-3">🏷 会社ロゴ（任意）</p>
        {s.logoBase64 ? (
          <div className="flex items-center gap-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.logoBase64} alt="ロゴ" className="h-14 object-contain border rounded-lg bg-gray-50 p-1" />
            <button
              type="button"
              onClick={() => upd("logoBase64", "")}
              className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              削除
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-20 flex items-center justify-center mb-3 text-gray-400 text-sm">
            ロゴ画像なし
          </div>
        )}
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg font-bold transition-colors"
        >
          📁 画像を選択
        </button>
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
        <p className="text-xs text-gray-400 mt-2">PNG・JPG対応。見積書の右上に表示されます。</p>
      </div>

      {/* 基本情報 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
        <p className="text-sm font-bold text-gray-700">📝 基本情報</p>

        {[
          { key: "name" as const, label: "会社名・屋号", placeholder: "○○建設、田中塗装店 など", required: true },
          { key: "postalCode" as const, label: "郵便番号", placeholder: "123-4567", inputMode: "numeric" as const },
          { key: "address" as const, label: "住所", placeholder: "大阪府○○市..." },
          { key: "phone" as const, label: "電話番号", placeholder: "090-XXXX-XXXX", inputMode: "tel" as const },
          { key: "email" as const, label: "メール", placeholder: "info@example.com", inputMode: "email" as const },
        ].map(({ key, label, placeholder, required, inputMode }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 block mb-1">
              {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              inputMode={inputMode}
              placeholder={placeholder}
              value={s[key]}
              onChange={(e) => upd(key, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm
                focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        ))}
      </div>

      {/* 振込先 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <label className="block text-sm font-bold text-gray-700 mb-2">🏦 振込先情報</label>
        <textarea
          placeholder={"○○銀行 ○○支店\n普通 1234567\n口座名義：タナカ タロウ"}
          value={s.bankInfo}
          onChange={(e) => upd("bankInfo", e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm
            focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* 保存 */}
      <button
        type="button"
        onClick={handleSave}
        className={`w-full py-4 rounded-2xl font-black text-base shadow-lg transition-colors ${
          saved
            ? "bg-green-500 text-white"
            : "bg-orange-500 hover:bg-orange-600 text-white"
        }`}
      >
        {saved ? "✅ 保存しました！" : isFirst ? "設定して始める →" : "💾 保存する"}
      </button>
    </div>
  );
}

// =============================================
// デフォルトエクスポート：Suspense でラップ
// =============================================
export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-gray-400">読み込み中...</div>}>
      <SettingsPageInner />
    </Suspense>
  );
}