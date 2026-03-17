import { SignJWT, jwtVerify } from "jose";

const INVITE_SECRET = new TextEncoder().encode(
  process.env.INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "invite-secret-change-me"
);

export interface InvitePayload {
  tenantId: string;
  tenantName: string;
  roleName: string;
  email: string;
  invitedBy: string;
}

export async function createInviteToken(payload: InvitePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(INVITE_SECRET);
}

export async function verifyInviteToken(token: string): Promise<InvitePayload> {
  try {
    const { payload } = await jwtVerify(token, INVITE_SECRET);
    return {
      tenantId: payload.tenantId as string,
      tenantName: payload.tenantName as string,
      roleName: payload.roleName as string,
      email: payload.email as string,
      invitedBy: payload.invitedBy as string,
    };
  } catch {
    throw new Error("Invitacion invalida o expirada");
  }
}
