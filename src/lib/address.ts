import type { ShipOrderDto } from "./unifiedApi";
import { governorateName } from "../features/customer/shipmentFields";

// A street field that only says the country is no use for routing.
const COUNTRY_ONLY = new Set(["egypt", "مصر", "eg"]);

function clean(value: string | null | undefined): string {
  const text = (value ?? "").trim().replace(/[.,،\s]+$/u, "");
  return COUNTRY_ONLY.has(text.toLowerCase()) ? "" : text;
}

/** Two display lines for a shipment's destination: street, then area · city · governorate. */
export function addressLines(order: ShipOrderDto, language: string): { street: string; area: string } {
  const address = order.toAddressModel;
  const street = [clean(address?.street), clean(address?.building)].filter(Boolean).join("، ");
  const areaParts: string[] = [];
  for (const part of [address?.zone?.name, address?.city, governorateName(order, language)].map(clean)) {
    if (part && !areaParts.includes(part)) areaParts.push(part);
  }
  return { street, area: areaParts.join(" · ") };
}
