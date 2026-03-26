"use client";
// =============================================
// LINE送付案内モーダル（PDF出力後に表示）
// =============================================

interface Props {
  filename: string;
  onClose: () => void;
}

export default function LineGuide({ filename, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-[#06C755] text-white px-5 py-4 flex items-center gap-3">
          <span className="text-3xl">💬</span>
          <div>
            <p className="font-black text-lg">PDFをLINEで送る方法</p>
            <p className="text-green-100 text-xs">ダウンロードが完了しました</p>
          </div>
        </div>

        {/* 本文 */}
        <div className="px-5 py-5 space-y-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm font-bold text-gray-700 mb-3">📱 手順</p>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="bg-[#06C755] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-bold text-gray-800">PDFをダウンロード済みです ✅</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ファイル名：<span className="font-mono text-gray-700">{filename}</span>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="bg-[#06C755] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-bold text-gray-800">LINEを開く</p>
                  <p className="text-xs text-gray-500 mt-0.5">送りたい相手のトーク画面を開いてください</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="bg-[#06C755] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-bold text-gray-800">📎 ボタンからPDFを添付</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    トーク画面の「＋」または📎マークをタップ →
                    「ファイル」を選択 →
                    ダウンロードフォルダから上記PDFを選択
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="bg-[#06C755] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
                <div>
                  <p className="font-bold text-gray-800">送信ボタンをタップ ✈️</p>
                  <p className="text-xs text-gray-500 mt-0.5">お客様に見積書が届きます</p>
                </div>
              </li>
            </ol>
          </div>

          <p className="text-xs text-gray-400 text-center">
            ※ PDFはご利用端末のダウンロードフォルダに保存されています
          </p>
        </div>

        {/* フッター */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3.5 rounded-xl text-base transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
