import type { IconName } from "../components/Icon";

/**
 * Status groups for chips, tiles and filters. The API sends `orderStatus` as a
 * description string only (no status code), so this matches known Arabic and
 * English wording. If the order DTOs ever carry the StatusProfile code, map that
 * here instead and drop the text matching.
 */
export type StatusTone =
  | "created"
  | "picked"
  | "warehouse"
  | "outForDelivery"
  | "redelivery"
  | "partial"
  | "delivered"
  | "failed"
  | "returned"
  | "canceled"
  | "unknown";

export const STATUS_TONES: StatusTone[] = [
  "created",
  "picked",
  "warehouse",
  "outForDelivery",
  "redelivery",
  "partial",
  "delivered",
  "failed",
  "returned",
  "canceled",
];

// Order matters: "تم الاستلام بالمخزن" is a warehouse status even though it says استلام,
// and "إعادة التوصيل" is a redelivery even though it says التوصيل.
const RULES: [StatusTone, RegExp][] = [
  ["failed", /فشل|تعذر|fail/],
  ["returned", /مرتجع|ارجاع|رجوع|return/],
  ["canceled", /ملغ|الغاء|cancel/],
  ["redelivery", /اعاده|redeliver|re-deliver/],
  ["outForDelivery", /قيد التوصيل|خرج|للتوصيل|out for|on the way/],
  ["partial", /جزئي|partial/],
  ["delivered", /تسليم|سلم|deliver/],
  ["warehouse", /مخزن|مستودع|warehouse|hub|received/],
  ["picked", /التقاط|استلام|بيكاب|pick/],
  ["created", /انشاء|جديد|مسوده|creat|new|draft|await/],
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
}

const cache = new Map<string, StatusTone>();

export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return "unknown";
  let tone = cache.get(status);
  if (!tone) {
    const text = normalise(status);
    tone = RULES.find(([, re]) => re.test(text))?.[0] ?? "unknown";
    cache.set(status, tone);
  }
  return tone;
}

export const TONE_ICON: Record<StatusTone, IconName> = {
  created: "box",
  picked: "truck",
  warehouse: "warehouse",
  outForDelivery: "truck",
  redelivery: "redelivery",
  partial: "delivered",
  delivered: "delivered",
  failed: "failed",
  returned: "undo",
  canceled: "x",
  unknown: "box",
};

/** CSS colour token for a tone (defined per theme in index.css). */
export const TONE_COLOR: Record<StatusTone, string> = {
  created: "var(--tone-grey)",
  picked: "var(--tone-amber)",
  warehouse: "var(--tone-blue)",
  outForDelivery: "var(--tone-indigo)",
  redelivery: "var(--tone-amber)",
  partial: "var(--tone-amber)",
  delivered: "var(--tone-green)",
  failed: "var(--tone-red)",
  returned: "var(--tone-amber)",
  canceled: "var(--tone-grey)",
  unknown: "var(--tone-grey)",
};

/** Statuses that need the merchant to decide something. */
export function needsAttention(tone: StatusTone): boolean {
  return tone === "failed" || tone === "returned" || tone === "redelivery";
}
