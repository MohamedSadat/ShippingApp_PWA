const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const UserType = {
  Employee: 0,
  Exec: 1,
  Supervisor: 2,
  BPAgent: 3,
  BPCust: 4,
} as const;

export type UserType = (typeof UserType)[keyof typeof UserType];

export interface LoginRequest {
  userName: string;
  password: string;
  company?: string;
  apiKey?: string;
}

export interface LoginResult {
  apiKey: string | null;
  userName: string | null;
  name: string | null;
  company: string | null;
  success: boolean;
  message: string;
  partnerAccountId: string | null;
  userType: UserType;
  roles: string[];
}

export async function login(request: LoginRequest): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: request.userName,
      password: request.password,
      company: request.company ?? "",
      apiKey: request.apiKey ?? "",
    }),
  });

  // UnifiedAPI returns a LogInResult body (with success/message) on both
  // 200 and 401 — the HTTP status alone isn't enough to tell success
  // from a rejected login, so always parse and let the caller check
  // `result.success`.
  return response.json();
}

/**
 * Re-authenticates with just a previously issued apiKey. UserType is
 * populated same as full login, so roleForUserType works here too —
 * but PartnerAccountId is not set by the server's LoginByKey handler
 * and always comes back null.
 */
export async function loginByKey(apiKey: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/Login/LogInByKey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  return response.json();
}

// ShipOrderController — see memory/project_shiporder_api.md, more actions
// will be added under this same base route over time.

export interface ShipOrderDto {
  company: string;
  orderId: string;
  orderDate: string;
  orderStatus: string;
  custAccount: string;
  contactName: string;
  description: string | null;
  codAmount: number;
  freightAmount: number;
  orderCost: number;
  carrierId: string | null;
  carrierName: string | null;
  custAccountModel: { name: string } | null;
}

export interface PagedOrderResult<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export async function getMyOrders(
  apiKey: string,
  pageNumber = 1,
  pageSize = 30,
): Promise<PagedOrderResult<ShipOrderDto>> {
  const response = await fetch(
    `${API_BASE_URL}/api/ship/ShipOrder/GetMyOrders?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    { headers: { "X-Api-Key": apiKey } },
  );

  if (!response.ok) {
    throw new Error(`GetMyOrders failed with status ${response.status}`);
  }

  return response.json();
}
