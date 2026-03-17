"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, Search, ChevronDown, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function TenantSwitcher({ currentTenantName }: { currentTenantName: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data } = trpc.superadmin.listTenants.useQuery(
    { page: 1, limit: 8, search: search || undefined },
    { enabled: open }
  );

  const setActiveTenant = trpc.superadmin.setActiveTenant.useMutation({
    onSuccess: (_data, variables) => {
      utils.auth.getSession.invalidate();
      setOpen(false);
      router.push(`/dashboard/companies/${variables.tenantId}`);
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        <span className="text-[#ededed] text-[13px]">{currentTenantName}</span>
        <ChevronDown size={12} className="text-[#666]" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[32px] w-[260px] rounded-lg border border-[#2e2e2e] py-1 z-50 shadow-xl"
          style={{ backgroundColor: "#1c1c1c" }}
        >
          {/* Search */}
          <div className="px-3 py-2 border-b border-[#2e2e2e]">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                placeholder="Buscar empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[28px] pl-7 pr-3 rounded border border-[#333] bg-[#111] text-[12px] text-[#ededed] placeholder-[#555] focus:outline-none focus:border-[#555]"
                autoFocus
              />
            </div>
          </div>

          {/* Tenants list */}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {data?.tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setActiveTenant.mutate({ tenantId: tenant.id })}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-[#2a2a2a] transition-colors ${
                  tenant.name === currentTenantName ? "bg-[#2a2a2a]" : ""
                }`}
              >
                <Building2 size={14} className="text-[#666] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#ededed] truncate">{tenant.name}</p>
                  <p className="text-[10px] text-[#555]">{tenant.plan}</p>
                </div>
              </button>
            ))}
          </div>

          {/* All companies link */}
          <div className="border-t border-[#2e2e2e] pt-1 mt-1">
            <Link
              href="/dashboard/companies"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[12px] text-emerald-400 hover:bg-[#2a2a2a] transition-colors"
            >
              <ArrowRight size={12} />
              Todas las empresas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
