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
  /** i18next key for the nav label, resolved in NavBar via useTranslation */
  labelKey: string;
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
    { path: "/customer", labelKey: "nav.dashboard", end: true },
    { path: "/customer/shipments", labelKey: "nav.myShipment" },
    { path: "/customer/shipments/new", labelKey: "nav.addShipment" },
    { path: "/customer/account", labelKey: "nav.myAccount" },
    { path: "/customer/settings", labelKey: "nav.settings" },
  ],
  agent: [
    { path: "/agent", labelKey: "nav.manifest", end: true },
    { path: "/agent/scan/pickup", labelKey: "nav.pickupScan" },
    { path: "/agent/scan/delivery", labelKey: "nav.deliveryScan" },
    { path: "/agent/cod", labelKey: "nav.cod" },
    { path: "/agent/settings", labelKey: "nav.settings" },
  ],
};

export function homePathForRole(role: Role): string {
  return NAV_ACCESS[role][0].path;
}
