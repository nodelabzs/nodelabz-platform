"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function OrgPage() {

  const { data: session } = trpc.auth.getSession.useQuery();
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
  const tenantName = session?.tenant?.name ?? "Mi Proyecto";
  const tenantPlan = session?.tenant?.plan ?? "INICIO";
  const trialEndsAt = session?.tenant?.trialEndsAt;
  const isTrialActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;

  const { data: usage } = trpc.billing.getUsage.useQuery();
  const { data: integrations } = trpc.integrations.list.useQuery();
  const { data: healthScore } = trpc.healthScore.getCurrent.useQuery();

  const contactCount = usage?.contacts?.used ?? 0;
  const integrationCount = integrations?.filter((i) => i.status === "active").length ?? 0;

  const { data: stats } = trpc.superadmin.getPlatformStats.useQuery(undefined, {
    enabled: isSuperAdmin,
  });

  const planColors: Record<string, string> = {
    INICIO: "#888",
    CRECIMIENTO: "#3ecf8e",
    PROFESIONAL: "#6366f1",
    AGENCIA: "#f59e0b",
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-4">Proyectos</h1>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 h-[34px] px-3 rounded-md border border-[#333] text-[#666] text-[13px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>Buscar proyecto</span>
        </div>
        <div className="flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Main project card */}
        <Link href="/dashboard" className="block rounded-lg border border-[#2e2e2e] p-4 hover:border-[#444] transition-colors" style={{ backgroundColor: '#1c1c1c' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[14px] font-medium text-[#ededed]">{tenantName}</h3>
            <span className="text-[#555] hover:text-[#999]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-3 mt-2">
            <span className="text-[10px] px-1.5 py-[1px] rounded border text-[#3ecf8e] border-[#3ecf8e]/30 font-medium uppercase">Activo</span>
            <span
              className="text-[10px] px-1.5 py-[1px] rounded border font-medium uppercase"
              style={{ color: planColors[tenantPlan] ?? "#888", borderColor: (planColors[tenantPlan] ?? "#888") + "40" }}
            >
              {tenantPlan}
            </span>
            {isTrialActive && (
              <span className="text-[10px] px-1.5 py-[1px] rounded border border-[#444] text-[#888] font-medium uppercase">Trial</span>
            )}
          </div>
          <div className="flex items-center gap-4 pt-3 border-t border-[#2e2e2e]">
            <div>
              <p className="text-[10px] text-[#555] uppercase">Contactos</p>
              <p className="text-[13px] text-[#ededed] font-medium">{contactCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#555] uppercase">Integraciones</p>
              <p className="text-[13px] text-[#ededed] font-medium">{integrationCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#555] uppercase">Health Score</p>
              <p className="text-[13px] text-[#ededed] font-medium">{healthScore?.overallScore ?? "--"}</p>
            </div>
          </div>
        </Link>

        {/* Gestion de Clientes card — super admin only */}
        {isSuperAdmin && (
          <Link href="/dashboard/companies" className="block rounded-lg border border-[#2e2e2e] p-4 hover:border-[#444] transition-colors" style={{ backgroundColor: '#1c1c1c' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[14px] font-medium text-[#ededed]">Gestion de Clientes</h3>
              <span className="text-[#555] hover:text-[#999]">
                <Building2 size={16} />
              </span>
            </div>
            <p className="text-[12px] text-[#555] mb-2">Marketing, Data & AI para tus clientes</p>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[10px] px-1.5 py-[1px] rounded border text-emerald-400 border-emerald-500/30 font-medium uppercase">Super Admin</span>
            </div>
            <div className="flex items-center gap-4 pt-3 border-t border-[#2e2e2e]">
              <div>
                <p className="text-[10px] text-[#555] uppercase">Empresas</p>
                <p className="text-[13px] text-[#ededed] font-medium">{stats?.totalTenants ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#555] uppercase">Activas</p>
                <p className="text-[13px] text-[#ededed] font-medium">{stats?.activeTenants ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#555] uppercase">En Trial</p>
                <p className="text-[13px] text-[#ededed] font-medium">{stats?.trialTenants ?? 0}</p>
              </div>
            </div>
          </Link>
        )}
      </div>

    </div>
  );
}
