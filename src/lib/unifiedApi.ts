const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Fixed organization whose active companies populate the login dropdown.
const ORG_ID = "CashGear";

export const UserType = {
  Employee: 0,
  Exec: 1,
  Supervisor: 2,
  BPAgent: 3,
  BPCust: 4,
} as const;

export type UserType = (typeof UserType)[keyof typeof UserType];

// Registered by AuthProvider. Called with the rejected key whenever an
// authenticated request comes back 401 — the key was deactivated or has
// expired server-side, so the stored session is dead.
let unauthorizedHandler: ((apiKey: string) => void) | null = null;

export function setUnauthorizedHandler(handler: ((apiKey: string) => void) | null) {
  unauthorizedHandler = handler;
}

// fetch for every endpoint behind UnifiedAPI's ApiKey scheme: attaches the
// X-Api-Key header and reports a 401 to the unauthorized handler. Not used by
// the anonymous endpoints (login, loginByKey, company list) — a 401 there means
// bad credentials, not an expired session.
async function authFetch(apiKey: string, url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Api-Key", apiKey);
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    unauthorizedHandler?.(apiKey);
  }
  return response;
}

// UnifiedAPI rejects a request in one of two shapes: a controller's own
// { message }, or — when [ApiController] model validation fails (e.g. a field
// over its [MaxLength]) before the action even runs — a ProblemDetails whose
// `errors` maps each field to its messages. Falls back when the body is neither.
async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.text().catch(() => "");
  try {
    const data = JSON.parse(body);
    if (typeof data?.message === "string" && data.message) return data.message;
    if (data?.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors)
        .flat()
        .filter((m): m is string => typeof m === "string" && m.length > 0);
      if (messages.length) return messages.join(" ");
    }
    if (typeof data?.title === "string" && data.title) return data.title;
  } catch {
    // Not JSON (empty body, proxy error page) — use the fallback.
  }
  return fallback;
}

export interface LoginRequest {
  userName: string;
  password: string;
  /** null lets the server fall back to the user's organization default company. */
  company?: string | null;
  apiKey?: string;
}

export interface LoginResult {
  apiKey: string | null;
  userName: string | null;
  name: string | null;
  company: string | null;
  /** Direct link to the resolved company's uploaded logo (Companies.LogoUrl); null when unset. */
  companyLogoUrl?: string | null;
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
      company: request.company ?? null,
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

export interface CompanyOption {
  value: string;
  label: string;
}

// Active companies for an org — populates the login company dropdown. The
// CompanyInfoController endpoint is [AllowAnonymous], so like login/loginByKey
// it runs before auth and sends no X-Api-Key header. value=CoID (what /api/Login
// expects as `company`), label=CoName. Throws on non-OK so the caller can fall back.
export async function fetchActiveCompanies(orgId = ORG_ID): Promise<CompanyOption[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/CompanyInfo/GetActiveCompaniesByOrgId/${encodeURIComponent(orgId)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`GetActiveCompaniesByOrgId failed with status ${response.status}`);
  }
  const list = (await response.json()) as Array<Record<string, unknown>>;
  return list
    .map((c) => {
      const value = String(c.coID ?? c.coId ?? c.CoID ?? "");
      const label = String(c.coName ?? c.CoName ?? value);
      return { value, label };
    })
    .filter((c) => c.value);
}

// ShipOrderController — see memory/project_shiporder_api.md, more actions
// will be added under this same base route over time.

// Mirrors the backend AddressBook entity. Note `governrate` — the misspelling is
// the actual property name on the server, not a typo here. It's the legacy free-text
// governorate; orders saved by GoveId leave it blank and carry `governorate` instead.
export interface AddressBookModel {
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  city?: string | null;
  governrate?: string | null;
  goveId?: number | null;
  zoneId?: number | null;
  governorate?: { name: string; nameEn: string | null } | null;
  zone?: { name: string } | null;
  country?: string | null;
  postalcode?: string | null;
  phone?: string | null;
  phone2?: string | null;
  contactName?: string | null;
  fullAddress?: string | null;
}

export interface ShipOrderDto {
  company: string;
  orderId: string;
  orderDate: string;
  orderStatus: string;
  custAccount: string;
  contactName: string;
  contactPhone: string | null;
  description: string | null;
  codAmount: number;
  freightAmount: number;
  orderCost: number;
  carrierId: string | null;
  carrierName: string | null;
  custAccountModel: { name: string } | null;
  toAddressModel?: AddressBookModel | null;
  /** Base64 SQL rowversion. Returned by getOrder only; updateWorkflow must send it back. */
  rowVersion?: string | null;
  /** Settlement flags (ShipInvoiceStatus), the merchant's and the courier's. List endpoints only. */
  invoiceStatus?: ShipInvoiceStatus;
  vendInvoiceStatus?: ShipInvoiceStatus;
  /** The due date; once a delivery outcome is posted, its posting date. List endpoints only. */
  dueDate?: string | null;
}

/** The backend TShipInvoiceStatus: a settlement flag on a shipment. */
export const ShipInvoiceStatus = {
  Open: 0,
  /** Delivery outcome posted: for a courier, the cash is still with them. */
  Posted: 1,
  /** The courier handed the cash over (agent payment journal). */
  Collected: 2,
  /** The merchant was paid out. */
  Remited: 3,
  Canceled: 4,
} as const;
export type ShipInvoiceStatus = (typeof ShipInvoiceStatus)[keyof typeof ShipInvoiceStatus];

export interface PagedOrderResult<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  /** A total over every matching order, when the endpoint fills it (GetAgentCodOrders: COD). */
  netAmount?: number;
}

export async function getMyOrders(
  apiKey: string,
  pageNumber = 1,
  pageSize = 30,
): Promise<PagedOrderResult<ShipOrderDto>> {
  const response = await authFetch(
    apiKey,
    `${API_BASE_URL}/api/ship/ShipOrder/GetMyOrders?pageNumber=${pageNumber}&pageSize=${pageSize}`,
  );

  if (!response.ok) {
    throw new Error(`GetMyOrders failed with status ${response.status}`);
  }

  return response.json();
}

// GetPartnerPendingOrder / GetPartnerCompletedOrder resolve the partner from the API
// key's own claims — customers get their own orders, agents get the ones they carry.
async function getPartnerOrders(
  action: "GetPartnerPendingOrder" | "GetPartnerCompletedOrder",
  apiKey: string,
  pageNumber: number,
  pageSize: number,
): Promise<PagedOrderResult<ShipOrderDto>> {
  const response = await authFetch(
    apiKey,
    `${API_BASE_URL}/api/ship/ShipOrder/${action}?pageNumber=${pageNumber}&pageSize=${pageSize}`,
  );

  if (!response.ok) {
    throw new Error(`${action} failed with status ${response.status}`);
  }

  // A user type the endpoint doesn't handle answers 200 with an empty body.
  const body = await response.text();
  if (!body) {
    return { data: [], totalCount: 0, pageNumber, pageSize };
  }

  return JSON.parse(body);
}

export function getPartnerPendingOrders(
  apiKey: string,
  pageNumber = 1,
  pageSize = 30,
): Promise<PagedOrderResult<ShipOrderDto>> {
  return getPartnerOrders("GetPartnerPendingOrder", apiKey, pageNumber, pageSize);
}

export function getPartnerCompletedOrders(
  apiKey: string,
  pageNumber = 1,
  pageSize = 30,
): Promise<PagedOrderResult<ShipOrderDto>> {
  return getPartnerOrders("GetPartnerCompletedOrder", apiKey, pageNumber, pageSize);
}

/** A failed request whose HTTP status the caller acts on, e.g. 403 vs 404. */
export class ApiStatusError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// GetPartnerOrder holds the key to its own orders: 403 when a customer didn't place
// the order or an agent doesn't carry it, 404 when the company has no such order.
export async function getOrder(apiKey: string, orderId: string): Promise<ShipOrderDto> {
  const response = await authFetch(
    apiKey,
    `${API_BASE_URL}/api/ship/ShipOrder/GetPartnerOrder/${encodeURIComponent(orderId)}`,
  );

  if (!response.ok) {
    throw new ApiStatusError(`GetPartnerOrder failed with status ${response.status}`, response.status);
  }

  return response.json();
}

// ShipOrderController GetBatch — one PDF with a label per order, the same
// ShipBatchExtendPDF the web app's Print button renders.
export async function getShipLabelsPdf(apiKey: string, orderIds: string[]): Promise<Blob> {
  const ids = orderIds.map(encodeURIComponent).join(",");
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/ShipOrder/GetBatch/${ids}/pdf`, {
    headers: { Accept: "application/pdf" },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `GetBatch failed with status ${response.status}`));
  }

  return response.blob();
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
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/ShipOrderCmd/GetGovs`);

  if (!response.ok) {
    throw new Error(`GetGovs failed with status ${response.status}`);
  }

  return response.json();
}

export async function getZones(apiKey: string, govId: number): Promise<ShipZone[]> {
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/ShipOrderCmd/GetZones/${govId}`);

  if (!response.ok) {
    throw new Error(`GetZones failed with status ${response.status}`);
  }

  return response.json();
}

export async function initOrder(apiKey: string): Promise<ShipOrderDraft> {
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/ShipOrderCmd/InitOrder`);

  if (!response.ok) {
    throw new Error(`InitOrder failed with status ${response.status}`);
  }

  return response.json();
}

export async function saveOrder(apiKey: string, draft: ShipOrderDraft): Promise<{ orderId: string }> {
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/ShipOrderCmd/SaveOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `SaveOrder failed with status ${response.status}`));
  }

  return response.json();
}

export async function updateZoneFreight(apiKey: string, draft: ShipOrderDraft): Promise<{ freightAmount: number }> {
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/ShipOrderCmd/UpdateZone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `UpdateZone failed with status ${response.status}`));
  }

  return response.json();
}

// Workflow actions (agent delivery flow) — ShipOrderCmd controller.
// Mirrors the backend AllowedActionDto returned by GetAllowedActions
// (CG.Infrastructure/CGModels/ThrdPL/StatusProfile.cs).
export interface WorkflowAction {
  targetStatusCode: string;
  description: string;
  buttonLabel: string; // e.g. "Confirm Order", "Cancel"
  cssClass: string | null; // e.g. "btn-primary", "btn-danger"
  icon: string | null;
  lookupId: string | null;
  requiresReason: boolean;
  requiresAccount: boolean;
  requiresLocation: boolean;
  requiresConfirmation: boolean;
  requiresAmount: boolean;
  isFinal: boolean;
  /** The BusinessTransaction it runs, e.g. SHIP_DELIVER; tells the settlement outcomes apart. */
  transactionId: string | null;
}

export async function getAllowedActions(apiKey: string, orderId: string): Promise<WorkflowAction[]> {
  const response = await authFetch(
    apiKey,
    `${API_BASE_URL}/api/ship/ShipOrderCmd/GetAllowedActions/${encodeURIComponent(orderId)}`,
  );

  if (!response.ok) {
    throw new Error(`GetAllowedActions failed with status ${response.status}`);
  }

  return response.json();
}

export interface WorkflowUpdateResult {
  orderId: string;
  orderStatus: string;
  invoiceStatus: number;
  /** The order's new version — send this, not the old one, with the next action. */
  rowVersion: string;
}

export interface WorkflowInput {
  /** Required by an action with requiresReason; one of getActionReasons' descriptions. */
  reason?: string;
  /**
   * Cash taken from the receiver. Required for a partial delivery; left out, a
   * delivery collects the full COD and a failed-pay the freight.
   */
  actualCollected?: number;
}

// actionId is the action's targetStatusCode. rowVersion is the version the agent
// last loaded (getOrder): the server answers 409 when the order changed since, and
// 400 when it is missing. A missing reason or amount the action needs is a 400
// ("Reason required." / "Amount required."). There is no location/account payload:
// actions needing one are done at the hub.
export async function updateWorkflow(
  apiKey: string,
  actionId: string,
  orderId: string,
  rowVersion: string,
  input: WorkflowInput = {},
): Promise<WorkflowUpdateResult> {
  const response = await authFetch(
    apiKey,
    `${API_BASE_URL}/api/ship/ShipOrderCmd/updateworkflow/${encodeURIComponent(actionId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, rowVersion, reason: input.reason, actualCollected: input.actualCollected }),
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `updateWorkflow failed with status ${response.status}`));
  }

  return response.json();
}

/** A reason option for an action (a LookupValue). */
export interface ActionReason {
  code: string;
  meaning: string;
  description: string | null;
}

// The reasons for one action on one order — the lookup list on the action's
// target status. Empty when the action has none.
export async function getActionReasons(apiKey: string, orderId: string, actionId: string): Promise<ActionReason[]> {
  const response = await authFetch(
    apiKey,
    `${API_BASE_URL}/api/ship/ShipOrderCmd/GetActionReasons/${encodeURIComponent(orderId)}/${encodeURIComponent(actionId)}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `GetActionReasons failed with status ${response.status}`));
  }

  return response.json();
}

// PartnerController — see memory/project_partner_api.md

export async function getAccountBalance(apiKey: string, accountId: string): Promise<number> {
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/Partner/GetAccountBalance/${encodeURIComponent(accountId)}`);

  if (!response.ok) {
    throw new Error(`GetAccountBalance failed with status ${response.status}`);
  }

  return response.json();
}

/** One of a courier's COD shipments (GetAgentCodOrders). */
export interface AgentCodOrder {
  orderId: string;
  orderDate: string;
  /** Posting date of the delivery outcome (the settlement sets the due date to it). */
  dueDate: string | null;
  /** Status description, as in the partner order lists. */
  orderStatus: string | null;
  contactName: string | null;
  contactPhone: string | null;
  codAmount: number;
  /** What the shipment posted to the courier's account (collected − the courier's fee). */
  agentAmount: number;
  vendInvoiceStatus: ShipInvoiceStatus;
}

// A courier key's own COD shipments by settlement: Posted = the cash is still
// with the courier, Collected = handed over. netAmount is the COD total over all
// of them, not just this page. Settling is done by accounts, not from the app.
export async function getAgentCodOrders(
  apiKey: string,
  settlement: typeof ShipInvoiceStatus.Posted | typeof ShipInvoiceStatus.Collected,
  pageNumber = 1,
  pageSize = 25,
): Promise<PagedOrderResult<AgentCodOrder>> {
  const response = await authFetch(
    apiKey,
    `${API_BASE_URL}/api/ship/Partner/GetAgentCodOrders?settlement=${settlement}&pageNumber=${pageNumber}&pageSize=${pageSize}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `GetAgentCodOrders failed with status ${response.status}`));
  }

  return response.json();
}

// PushController — see memory/project_unifiedapi_auth.md for the X-Api-Key pattern.

export async function getPushPublicKey(apiKey: string): Promise<string> {
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/Push/PublicKey`);

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
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/Push/Subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error(`Subscribe failed with status ${response.status}`);
  }
}

export async function unsubscribePush(apiKey: string, endpoint: string): Promise<void> {
  const response = await authFetch(apiKey, `${API_BASE_URL}/api/ship/Push/Unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) {
    throw new Error(`Unsubscribe failed with status ${response.status}`);
  }
}
