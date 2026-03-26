// =============================================
// localStorage ユーティリティ
// =============================================

import { Estimate, CompanySettings } from "./types";

const KEY = {
  COMPANY: "pm_company",
  ESTIMATES: "pm_estimates",
  INIT: "pm_initialized",
} as const;

// ── 初期化 ────────────────────────────────────
export const isInitialized = () =>
  localStorage.getItem(KEY.INIT) === "true";
export const markInitialized = () =>
  localStorage.setItem(KEY.INIT, "true");

// ── 会社情報 ──────────────────────────────────
export function getCompany(): CompanySettings {
  const raw = localStorage.getItem(KEY.COMPANY);
  if (!raw)
    return { name: "", postalCode: "", address: "", phone: "", email: "", logoBase64: "", bankInfo: "" };
  return JSON.parse(raw);
}
export const saveCompany = (s: CompanySettings) =>
  localStorage.setItem(KEY.COMPANY, JSON.stringify(s));

// ── 見積もり ──────────────────────────────────
export function getEstimates(): Estimate[] {
  const raw = localStorage.getItem(KEY.ESTIMATES);
  if (!raw) return [];
  return (JSON.parse(raw) as Estimate[]).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
export function getEstimateById(id: string): Estimate | null {
  return getEstimates().find((e) => e.id === id) ?? null;
}
export function saveEstimate(est: Estimate) {
  const list = getEstimates().filter((e) => e.id !== est.id);
  list.unshift(est);
  localStorage.setItem(KEY.ESTIMATES, JSON.stringify(list));
}
export function deleteEstimate(id: string) {
  localStorage.setItem(
    KEY.ESTIMATES,
    JSON.stringify(getEstimates().filter((e) => e.id !== id))
  );
}

// ── ユーティリティ ────────────────────────────
export const uid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const today = () => new Date().toISOString().split("T")[0];
