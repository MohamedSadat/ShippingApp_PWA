import type { ShipOrderDto } from "../../lib/unifiedApi";

// Kept apart from ShipmentGrid: that component is lazy-loaded with @cashgear/ui, so
// importing from it would pull the library into the app shell.

// Egyptian mobile, same mask as the ERP's shipment form; saved as the 11 digits only.
export const PHONE_MASK = "0000 000 0000";

// Same naming rule as Add Shipment's governorate picker; older addresses only
// have the legacy free-text governrate.
export function governorateName(order: ShipOrderDto, language: string): string {
  const address = order.toAddressModel;
  const gov = address?.governorate;
  if (gov) return language === "ar" ? gov.name : gov.nameEn || gov.name;
  return address?.governrate ?? "";
}
