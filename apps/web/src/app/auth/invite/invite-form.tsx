"use client";

import { useActionState } from "react";
import { inviteSignUpAction, type InviteSignUpState } from "@/server/auth/actions";
import { User, Lock, ArrowRight, Building2, Shield, Mail } from "lucide-react";

const initialState: InviteSignUpState = {};

const roleDescriptions: Record<string, string> = {
  Admin: "Acceso total a la plataforma, facturacion, equipo e integraciones",
  Manager: "Acceso completo excepto facturacion y gestion de equipo",
  Editor: "Puede editar campanas, contactos y reportes. Sin acceso a facturacion ni equipo",
  Viewer: "Solo lectura. Puede ver analiticas, contactos y reportes",
};

const roleColors: Record<string, string> = {
  Admin: "text-red-400 border-red-500/30 bg-red-500/10",
  Manager: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  Editor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  Viewer: "text-gray-400 border-gray-500/30 bg-gray-500/10",
};

export function InviteForm({
  token,
  email,
  tenantName,
  roleName,
  invitedBy,
}: {
  token: string;
  email: string;
  tenantName: string;
  roleName: string;
  invitedBy: string;
}) {
  const [state, formAction, pending] = useActionState(inviteSignUpAction, initialState);

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Te han invitado</h2>
        <p className="mt-2 text-sm text-gray-300">
          {invitedBy} te invito a unirte a
        </p>
      </div>

      {/* Tenant + Role info */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Building2 size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white">{tenantName}</p>
            <p className="text-[11px] text-gray-400">Empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
            <Shield size={18} className="text-gray-400" />
          </div>
          <div>
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${roleColors[roleName] || "text-gray-400 border-gray-500/30"}`}>
              {roleName}
            </span>
            <p className="text-[11px] text-gray-500 mt-1">
              {roleDescriptions[roleName] || "Permisos personalizados"}
            </p>
          </div>
        </div>
      </div>

      {state.error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        {/* Email (read-only) */}
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <Mail size={14} />
            Email
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="block w-full py-2.5 px-0 text-sm text-gray-400 bg-transparent border-0 border-b-2 border-gray-600 cursor-not-allowed"
          />
        </div>

        {/* Name */}
        <div>
          <label htmlFor="invite_name" className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <User size={14} />
            Tu nombre
          </label>
          <input
            id="invite_name"
            name="name"
            type="text"
            className="block w-full py-2.5 px-0 text-sm text-white bg-transparent border-0 border-b-2 border-gray-500 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="invite_password" className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <Lock size={14} />
            Contrasena
          </label>
          <input
            id="invite_password"
            name="password"
            type="password"
            minLength={8}
            className="block w-full py-2.5 px-0 text-sm text-white bg-transparent border-0 border-b-2 border-gray-500 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors"
            placeholder="Min. 8 caracteres"
            required
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="group w-full flex items-center justify-center py-3 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 transition-all duration-300 disabled:opacity-50"
        >
          {pending ? "Creando cuenta..." : "Unirme a " + tenantName}
          {!pending && (
            <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
          )}
        </button>
      </form>
    </div>
  );
}
