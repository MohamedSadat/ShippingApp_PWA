import { UserType } from "../lib/unifiedApi";
import type { IconName } from "../components/Icon";

export type Role = "customer" | "agent";

/**
 * The app serves shipping partners only, as the ERP's partner logins do:
 * BPCust (shipper) accounts get the Customer view, BPAgent (courier)
 * accounts the Agent view. Staff (Employee/Exec/Supervisor) get null —
 * they work in the ERP web app, and the agent screens act for one
 * courier account, which a staff key doesn't have.
 */
export function roleForUserType(userType: UserType): Role | null {
  if (userType === UserType.BPCust) return "customer";
  if (userType === UserType.BPAgent) return "agent";
  return null;
}

export interface NavItem {
  path: string;
  /** i18next key for the nav label, resolved in NavBar via useTranslation */
  labelKey: string;
  icon: IconName;
  /** relative to the role's base path, e.g. "" for index */
  end?: boolean;
  /** The raised centre action (customer "+"): icon only, label kept for screen readers */
  primary?: boolean;
}

/**
 * Single source of truth for which routes each role can see/reach.
 * Mirrors CGBoard's NAV_ACCESS pattern: one app, gated by role rather
 * than separate deployments. Add a route here AND in the role's
 * route tree (src/features/<role>/routes.tsx).
 */
export const NAV_ACCESS: Record<Role, NavItem[]> = {
  customer: [
    { path: "/customer", labelKey: "nav.dashboard", icon: "home", end: true },
    { path: "/customer/shipments", labelKey: "nav.myShipment", icon: "box", end: true },
    { path: "/customer/shipments/new", labelKey: "nav.addShipment", icon: "plus", primary: true },
    { path: "/customer/account", labelKey: "nav.myAccount", icon: "user" },
    { path: "/customer/settings", labelKey: "nav.more", icon: "more" },
  ],
  agent: [
    { path: "/agent", labelKey: "nav.manifest", icon: "list", end: true },
    { path: "/agent/scan/pickup", labelKey: "nav.pickupScan", icon: "scan" },
    { path: "/agent/scan/delivery", labelKey: "nav.deliveryScan", icon: "truck" },
    { path: "/agent/cod", labelKey: "nav.cod", icon: "wallet" },
    { path: "/agent/settings", labelKey: "nav.settings", icon: "settings" },
  ],
};

export function homePathForRole(role: Role): string {
  return NAV_ACCESS[role][0].path;
}
