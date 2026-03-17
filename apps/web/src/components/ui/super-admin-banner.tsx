"use client";

import React from "react";
import { Shield, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

export function SuperAdminBanner({
  tenantName,
  tenantPlan,
}: {
  tenantName: string;
  tenantPlan?: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const exitTenant = trpc.superadmin.exitTenant.useMutation({
    onSuccess: () => {
      utils.auth.getSession.invalidate();
      router.push("/dashboard/companies");
    },
  });

  return (
    <div
      className="flex items-center justify-between px-4 h-[34px] flex-shrink-0 border-b"
      style={{
        backgroundColor: "#1a2e1a",
        borderColor: "#2d4a2d",
      }}
    >
      <div className="flex items-center gap-2 text-[12px]">
        <Shield size={13} className="text-emerald-400" />
        <span className="text-emerald-300 font-medium">Viendo como:</span>
        <span className="text-[#ededed] font-semibold">{tenantName}</span>
        {tenantPlan && (
          <span className="text-[9px] px-[5px] py-[1px] rounded border border-emerald-500/30 text-emerald-400 font-medium uppercase tracking-wider">
            {tenantPlan}
          </span>
        )}
      </div>
      <button
        onClick={() => exitTenant.mutate()}
        disabled={exitTenant.isPending}
        className="flex items-center gap-1 text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
      >
        Salir
        <ArrowRight size={12} />
      </button>
    </div>
  );
}
