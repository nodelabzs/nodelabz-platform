import { InviteForm } from "./invite-form";
import { verifyInviteToken } from "@/server/auth/invites";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="w-full max-w-sm p-8 space-y-4 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl text-center">
        <h2 className="text-2xl font-bold text-white">Invitacion invalida</h2>
        <p className="text-sm text-gray-300">
          No se encontro el token de invitacion. Solicita un nuevo enlace al administrador.
        </p>
      </div>
    );
  }

  let invite;
  try {
    invite = await verifyInviteToken(token);
  } catch {
    return (
      <div className="w-full max-w-sm p-8 space-y-4 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl text-center">
        <h2 className="text-2xl font-bold text-white">Invitacion expirada</h2>
        <p className="text-sm text-gray-300">
          Este enlace ya no es valido. Solicita una nueva invitacion al administrador.
        </p>
      </div>
    );
  }

  return (
    <InviteForm
      token={token}
      email={invite.email}
      tenantName={invite.tenantName}
      roleName={invite.roleName}
      invitedBy={invite.invitedBy}
    />
  );
}
