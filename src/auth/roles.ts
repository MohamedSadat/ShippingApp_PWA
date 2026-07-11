import { UserType } from "../lib/unifiedApi";

export type Role = "customer" | "agent";

/**
 * BPCust (business-partner customer accounts) get the Customer view.
 * Everything else (Employee/Exec/Supervisor internal staff, and
 * BPAgent) gets the Agent view for now — no privilege differentiation
 * among internal staff roles yet.
 */
export function roleForUserType(userType: UserType): Role {
  return userType === UserType.BPCust ? "customer" : "agent";
}

export interface NavItem {
  path: string;
  label: string;
  /** relative to the role's base path, e.g. "" for index */
  end?: boolean;
}

/**
 * Single source of truth for which routes each role can see/reach.
 * Mirrors CGBoard's NAV_ACCESS pattern: one app, gated by role rather
 * than separate deployments. Add a route here AND in the role's
 * route tree (src/features/<role>/routes.tsx).
 */
export const NAV_ACCESS: Record<Role, NavItem[]> = {
  customer: [
    { path: "/customer", label: "Dashboard", end: true },
    { path: "/customer/shipments", label: "My Shipment" },
    { path: "/customer/shipments/new", label: "Add Shipment" },
    { path: "/customer/account", label: "My Account" },
    { path: "/customer/settings", label: "Settings" },
  ],
  agent: [
    { path: "/agent", label: "Manifest", end: true },
    { path: "/agent/scan/pickup", label: "Pickup Scan" },
    { path: "/agent/scan/delivery", label: "Delivery Scan" },
    { path: "/agent/cod", label: "COD" },
  ],
};

export function homePathForRole(role: Role): string {
  return NAV_ACCESS[role][0].path;
}
