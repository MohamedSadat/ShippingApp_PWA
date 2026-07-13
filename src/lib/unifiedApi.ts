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
 * Re-authenticates with just a previously issued apiKey. UserType and
 * PartnerAccountId are both populated same as full login.
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

export interface AddressBookModel {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

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
  toAddressModel?: AddressBookModel | null;
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

export async function getOrder(apiKey: string, orderId: string): Promise<ShipOrderDto> {
  const response = await fetch(`${API_BASE_URL}/api/ship/ShipOrder/GetOrder/${encodeURIComponent(orderId)}`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`GetOrder failed with status ${response.status}`);
  }

  return response.json();
}

// ShipOrderCmdController — add-shipment flow (GetGovs / GetZones / InitOrder / SaveOrder)

export interface ShipGov {
  goveId: number;
  name: string;
  nameEn: string;
  code: string | null;
  active: boolean;
  sortOrder: number;
}

export interface ShipZone {
  zoneId: number;
  name: string;
  code: string | null;
  goveId: number;
  active: boolean;
  sortOrder: number;
}

export interface ShipAddressDraft {
  id?: number;
  goveId: number;
  zoneId: number | null;
  street: string | null;
  city?: string | null;
  building?: string | null;
  phone: string | null;
  phone2: string | null;
  contactName: string | null;
  country?: string | null;
}

// Fuller mirror of the backend ShipOrderDto (unlike the slim ShipOrderDto
// above, used only for list/detail display) — InitOrder's response must be
// echoed back into SaveOrder almost unchanged, so this keeps every field
// SaveOrder depends on (notably orderType, which the server resolves
// OrderTypeModel from).
export interface ShipOrderDraft {
  company: string;
  orderId: string;
  orderType: string;
  statusProfileId: string;
  orderDate: string;
  dueDate: string | null;
  custAccount: string;
  fromAddress: number | null;
  toAddress: number | null;
  toAddressModel: ShipAddressDraft | null;
  orderStatus: string;
  carrierId: string | null;
  trackingNumber: string | null;
  externalId: string | null;
  senderName: string | null;
  senderPhone: string | null;
  siteId: string;
  notes: string | null;
  description: string | null;
  totalWeight: number;
  totalVolume: number;
  codAmount: number;
  freightAmount: number;
  orderCost: number;
  contactName: string;
  contactPhone: string;
  contactPhone2: string | null;
  allowOpen: boolean;
  deleted: boolean;
  rowVersion: string | null;
}

export async function getGovs(apiKey: string): Promise<ShipGov[]> {
  const response = await fetch(`${API_BASE_URL}/api/ship/ShipOrderCmd/GetGovs`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`GetGovs failed with status ${response.status}`);
  }

  return response.json();
}

export async function getZones(apiKey: string, govId: number): Promise<ShipZone[]> {
  const response = await fetch(`${API_BASE_URL}/api/ship/ShipOrderCmd/GetZones/${govId}`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`GetZones failed with status ${response.status}`);
  }

  return response.json();
}

export async function initOrder(apiKey: string): Promise<ShipOrderDraft> {
  const response = await fetch(`${API_BASE_URL}/api/ship/ShipOrderCmd/InitOrder`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`InitOrder failed with status ${response.status}`);
  }

  return response.json();
}

export async function saveOrder(apiKey: string, draft: ShipOrderDraft): Promise<{ orderId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/ship/ShipOrderCmd/SaveOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify(draft),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || `SaveOrder failed with status ${response.status}`);
  }

  return result;
}

export async function updateZoneFreight(apiKey: string, draft: ShipOrderDraft): Promise<{ freightAmount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/ship/ShipOrderCmd/UpdateZone`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify(draft),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || `UpdateZone failed with status ${response.status}`);
  }

  return result;
}

// PartnerController — see memory/project_partner_api.md

export async function getAccountBalance(apiKey: string, accountId: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/ship/Partner/GetAccountBalance/${encodeURIComponent(accountId)}`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`GetAccountBalance failed with status ${response.status}`);
  }

  return response.json();
}

// PushController — see memory/project_unifiedapi_auth.md for the X-Api-Key pattern.

export async function getPushPublicKey(apiKey: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/ship/Push/PublicKey`, {
    headers: { "X-Api-Key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`GetPushPublicKey failed with status ${response.status}`);
  }

  const result: { publicKey: string } = await response.json();
  return result.publicKey;
}

export interface PushSubscribeRequest {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export async function subscribePush(apiKey: string, subscription: PushSubscribeRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/ship/Push/Subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error(`Subscribe failed with status ${response.status}`);
  }
}

export async function unsubscribePush(apiKey: string, endpoint: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/ship/Push/Unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) {
    throw new Error(`Unsubscribe failed with status ${response.status}`);
  }
}
