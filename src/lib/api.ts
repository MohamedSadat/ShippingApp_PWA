import type { Role } from "../auth/roles";

const API_BASE_URL = "https://api.cashgearerp.com";

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
