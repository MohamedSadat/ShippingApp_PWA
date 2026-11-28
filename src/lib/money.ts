// Money and count formatting, one place for both apps.
// Western digits everywhere (numberingSystem "latn"), Egyptian pounds, two decimals.

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(lang: string, currency: boolean): Intl.NumberFormat {
  const key = `${lang}|${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", {
      ...(currency ? { style: "currency", currency: "EGP" } : {}),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      numberingSystem: "latn",
    });
    formatters.set(key, f);
  }
  return f;
}

/** "1,200.00 ج.م" / "EGP 1,200.00". `currency: false` drops the currency. */
export function formatMoney(value: number, lang: string, options: { currency?: boolean } = {}): string {
  return formatter(lang, options.currency ?? true).format(value);
}

// Left-to-right isolate so a minus sign or the currency never jumps sides inside Arabic text.
const LRI = "⁦";
const PDI = "⁩";

/** formatMoney wrapped in a bidi isolate, for amounts dropped into translated sentences. */
export function moneyText(value: number, lang: string, options: { currency?: boolean } = {}): string {
  return `${LRI}${formatMoney(value, lang, options)}${PDI}`;
}

/** Any id or number that must read left to right inside Arabic text (waybills, phones). */
export function ltr(text: string): string {
  return `${LRI}${text}${PDI}`;
}
