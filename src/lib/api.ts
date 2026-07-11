import type { Role } from "../auth/roles";

const API_BASE_URL = "https://api.cashgearerp.com";
const API_KEY_HEADER = "X-API-Key";

// Mirrors CG.Infrastructure.CGTypes.UserType on the backend.
export const UserType = {
  Employee: 0,
  Exec: 1,
  Supervisor: 2,
  BPAgent: 3,
  BPCust: 4,
} as const;
export type UserType = (typeof UserType)[keyof typeof UserType];

// Only BPCust is a customer-facing business partner; everyone else
// (internal staff and business-partner agents) uses the Agent view.
function roleForUserType(userType: UserType): Role {
  return userType === UserType.BPCust ? "customer" : "agent";
}

export interface LoginRequest {
  userName: string;
  password: string;
  company: string;
}

export interface LoginResult {
  apiKey: string;
  userName: string;
  company: string;
  partnerAccountId: string;
  userType: UserType;
  role: Role;
}

interface LoginResponseBody {
  APIKey?: string;
  UserName?: string;
  Company?: string;
  PartnerAccountId?: string;
  UserType?: UserType;
  Success?: boolean;
  Message?: string;
}

export async function login(request: LoginRequest): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      UserName: request.userName,
      Password: request.password,
      Company: request.company,
    }),
  });

  const data = (await response.json()) as LoginResponseBody;

  if (!data.Success || !data.APIKey) {
    throw new Error(data.Message || "Login failed");
  }

  const userType = data.UserType ?? UserType.Employee;

  return {
    apiKey: data.APIKey,
    userName: data.UserName || request.userName,
    company: data.Company || request.company,
    partnerAccountId: data.PartnerAccountId || "",
    userType,
    role: roleForUserType(userType),
  };
}

export interface ShipOrder {
  company: string;
  codAmount: number;
  freightAmount: number;
  orderCost: number;
  orderDate: string;
  orderId: string;
  orderStatus: string;
  custAccount: string;
  contactName: string | null;
  description: string | null;
  custAccountName: string | null;
  carrierId: string | null;
  carrierName: string | null;
}

export interface PagedOrderResult<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

interface ShipOrderResponseBody {
  Company: string;
  CODAmount: number;
  FreightAmount: number;
  OrderCost: number;
  OrderDate: string;
  OrderId: string;
  OrderStatus: string;
  CustAccount: string;
  ContactName: string | null;
  Description: string | null;
  CustAccountModel?: { Name: string } | null;
  CarrierId: string | null;
  CarrierIdModel?: { Name: string } | null;
}

interface PagedOrderResponseBody {
  Data: ShipOrderResponseBody[];
  TotalCount: number;
  PageNumber: number;
  PageSize: number;
}

export async function getMyOrders(
  apiKey: string,
  pageNumber = 1,
  pageSize = 25,
): Promise<PagedOrderResult<ShipOrder>> {
  const url = new URL(`${API_BASE_URL}/api/ship/ShipOrder/GetMyOrders`);
  url.searchParams.set("pageNumber", String(pageNumber));
  url.searchParams.set("pageSize", String(pageSize));

  const response = await fetch(url, {
    headers: { [API_KEY_HEADER]: apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to load orders (${response.status})`);
  }

  const data = (await response.json()) as PagedOrderResponseBody;

  return {
    data: data.Data.map((order) => ({
      company: order.Company,
      codAmount: order.CODAmount,
      freightAmount: order.FreightAmount,
      orderCost: order.OrderCost,
      orderDate: order.OrderDate,
      orderId: order.OrderId,
      orderStatus: order.OrderStatus,
      custAccount: order.CustAccount,
      contactName: order.ContactName,
      description: order.Description,
      custAccountName: order.CustAccountModel?.Name ?? null,
      carrierId: order.CarrierId,
      carrierName: order.CarrierIdModel?.Name ?? null,
    })),
    totalCount: data.TotalCount,
    pageNumber: data.PageNumber,
    pageSize: data.PageSize,
  };
}
