// Display hygiene for names, phones and addresses coming from the ERP.

const PLACEHOLDER_NAMES = new Set(["بدون", "لا يوجد", "none", "n/a", "na", "-", "--", "no name"]);

/** Trims a name and its trailing periods; placeholder names ("بدون") become "". */
export function cleanName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim().replace(/[.\s]+$/u, "");
  return PLACEHOLDER_NAMES.has(trimmed.toLowerCase()) ? "" : trimmed;
}

function digitsOf(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** The phone's digits, or "" for empty and placeholder numbers (000000, too short). */
export function cleanPhone(phone: string | null | undefined): string {
  const digits = digitsOf(phone);
  if (digits.length < 7 || /^0+$/.test(digits)) return "";
  return digits;
}

/** An Egyptian mobile as its 11-digit local form (01xxxxxxxxx), or null. */
function localMobile(phone: string | null | undefined): string | null {
  let digits = cleanPhone(phone);
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

/** "+20 109 337 7697" for Egyptian mobiles; other numbers as their digits. */
export function formatPhone(phone: string | null | undefined): string {
  const local = localMobile(phone);
  if (!local) return cleanPhone(phone);
  return `+20 ${local.slice(1, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

export function telHref(phone: string | null | undefined): string | null {
  const local = localMobile(phone);
  if (local) return `tel:+20${local.slice(1)}`;
  const digits = cleanPhone(phone);
  return digits ? `tel:${digits}` : null;
}

/** A WhatsApp chat link for Egyptian mobiles; null for landlines and placeholders. */
export function whatsappHref(phone: string | null | undefined): string | null {
  const local = localMobile(phone);
  return local ? `https://wa.me/20${local.slice(1)}` : null;
}

/** Google Maps search for an address (the API carries no coordinates). */
export function mapsHref(parts: (string | null | undefined)[]): string | null {
  const query = parts.map((p) => (p ?? "").trim()).filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
