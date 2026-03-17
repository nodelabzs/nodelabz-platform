"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Users,
  Search,
  ArrowRight,
  Shield,
  BarChart3,
  Crown,
  Clock,
} from "lucide-react";

// ==========================================
// All Companies Page
// ==========================================

export function AllCompaniesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.superadmin.listTenants.useQuery({
    page,
    limit: 20,
    search: search || undefined,
  });

  const planColors: Record<string, string> = {
    INICIO: "#666",
    CRECIMIENTO: "#3b82f6",
    PROFESIONAL: "#8b5cf6",
    AGENCIA: "#f59e0b",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[#ededed]">Todas las Empresas</h1>
          <p className="text-[13px] text-[#666] mt-1">
            {data?.total ?? 0} empresas registradas
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full h-[36px] pl-9 pr-4 rounded-lg border border-[#333] bg-[#1c1c1c] text-[13px] text-[#ededed] placeholder-[#555] focus:outline-none focus:border-[#555]"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[140px] rounded-lg animate-pulse" style={{ backgroundColor: "#222" }} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.tenants.map((tenant) => {
              const isTrialActive = tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date();
              return (
                <Link
                  key={tenant.id}
                  href={`/dashboard/companies/${tenant.id}`}
                  className="block rounded-lg border border-[#2e2e2e] p-4 hover:border-[#444] transition-colors cursor-pointer"
                  style={{ backgroundColor: "#1c1c1c" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[32px] h-[32px] rounded-lg bg-[#2a2a2a] flex items-center justify-center">
                        <Building2 size={16} className="text-[#888]" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-medium text-[#ededed]">{tenant.name}</h3>
                        <p className="text-[11px] text-[#666]">{tenant.slug}</p>
                      </div>
                    </div>
                    <span
                      className="text-[9px] px-[6px] py-[2px] rounded-full font-semibold uppercase tracking-wider"
                      style={{
                        color: planColors[tenant.plan] || "#666",
                        backgroundColor: `${planColors[tenant.plan] || "#666"}20`,
                      }}
                    >
                      {tenant.plan}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[12px] text-[#777] mb-4">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {tenant.userCount} usuarios
                    </span>
                    {isTrialActive && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Clock size={12} />
                        Trial
                      </span>
                    )}
                  </div>

                  <span className="flex items-center gap-1.5 text-[12px] text-emerald-400 font-medium">
                    Entrar
                    <ArrowRight size={12} />
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-[12px] rounded border border-[#333] text-[#888] hover:text-[#ededed] hover:border-[#555] disabled:opacity-40 transition-colors"
              >
                Anterior
              </button>
              <span className="text-[12px] text-[#666]">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 text-[12px] rounded border border-[#333] text-[#888] hover:text-[#ededed] hover:border-[#555] disabled:opacity-40 transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==========================================
// Audit Logs Page
// ==========================================

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string | undefined>();

  const { data, isLoading } = trpc.superadmin.getAuditLogs.useQuery({
    page,
    limit: 50,
    action: actionFilter,
  });

  const actionColors: Record<string, string> = {
    enter_tenant: "#3b82f6",
    exit_tenant: "#8b5cf6",
    plan_changed: "#f59e0b",
    prompt_injection_blocked: "#ef4444",
    suspicious_activity: "#ef4444",
  };

  return (
    <div>
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-1">Logs de Auditoria</h1>
      <p className="text-[13px] text-[#666] mb-6">{data?.total ?? 0} eventos registrados</p>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["enter_tenant", "exit_tenant", "plan_changed", "prompt_injection_blocked"].map((action) => (
          <button
            key={action}
            onClick={() => setActionFilter(actionFilter === action ? undefined : action)}
            className={`px-3 py-1 text-[11px] rounded-full border transition-colors ${
              actionFilter === action
                ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                : "border-[#333] text-[#888] hover:text-[#ccc]"
            }`}
          >
            {action.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#2e2e2e] overflow-hidden" style={{ backgroundColor: "#1c1c1c" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#2e2e2e]">
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#666] font-medium">Accion</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#666] font-medium">Target</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#666] font-medium">Metadata</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#666] font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#555]">Cargando...</td></tr>
            ) : data?.logs.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#555]">Sin eventos</td></tr>
            ) : (
              data?.logs.map((log) => (
                <tr key={log.id} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#222]">
                  <td className="px-4 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-medium"
                      style={{
                        color: actionColors[log.action] || "#888",
                        backgroundColor: `${actionColors[log.action] || "#888"}15`,
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#999]">
                    {log.targetType && (
                      <span className="text-[#666]">{log.targetType}: </span>
                    )}
                    <span className="text-[#bbb] font-mono text-[11px]">{log.targetId?.slice(0, 8) || "-"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#777] text-[11px] font-mono">
                    {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-[#666] text-[12px]">
                    {new Date(log.createdAt).toLocaleString("es-CR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-[12px] rounded border border-[#333] text-[#888] disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-[12px] text-[#666]">{page} / {data.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="px-3 py-1.5 text-[12px] rounded border border-[#333] text-[#888] disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Security Alerts Page
// ==========================================

export function SecurityAlertsPage({ filterAction }: { filterAction?: string }) {
  const { data, isLoading } = trpc.superadmin.getAuditLogs.useQuery({
    page: 1,
    limit: 100,
    action: filterAction || "prompt_injection_blocked",
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Shield size={20} className="text-red-400" />
        <div>
          <h1 className="text-[22px] font-semibold text-[#ededed]">
            {filterAction === "prompt_injection_blocked" ? "Prompt Injections" : "Alertas de Seguridad"}
          </h1>
          <p className="text-[13px] text-[#666]">{data?.total ?? 0} alertas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-[#555] text-sm">Cargando...</div>
      ) : data?.logs.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1c1c1c" }}>
          <Shield size={32} className="text-emerald-500/30 mx-auto mb-3" />
          <p className="text-[#888] text-sm">Sin alertas de seguridad</p>
          <p className="text-[#555] text-xs mt-1">Todo esta funcionando correctamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-red-500/20 p-4"
              style={{ backgroundColor: "#1c1c1c" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-red-400">{log.action.replace(/_/g, " ")}</span>
                <span className="text-[11px] text-[#666]">{new Date(log.createdAt).toLocaleString("es-CR")}</span>
              </div>
              {log.metadata && (
                <pre className="text-[11px] text-[#777] font-mono bg-[#111] rounded p-2 overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Platform Metrics Page
// ==========================================

export function PlatformMetricsPage() {
  const { data, isLoading } = trpc.superadmin.getPlatformStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[100px] rounded-lg animate-pulse" style={{ backgroundColor: "#222" }} />
        ))}
      </div>
    );
  }

  const stats = [
    { label: "Total Empresas", value: data?.totalTenants ?? 0, icon: <Building2 size={16} />, color: "#3b82f6" },
    { label: "Total Usuarios", value: data?.totalUsers ?? 0, icon: <Users size={16} />, color: "#8b5cf6" },
    { label: "Empresas Activas", value: data?.activeTenants ?? 0, icon: <BarChart3 size={16} />, color: "#22c55e" },
    { label: "En Trial", value: data?.trialTenants ?? 0, icon: <Clock size={16} />, color: "#f59e0b" },
  ];

  return (
    <div>
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-6">Metricas de Plataforma</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[#2e2e2e] p-4"
            style={{ backgroundColor: "#1c1c1c" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-[28px] h-[28px] rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
            </div>
            <p className="text-[24px] font-semibold text-[#ededed]">{stat.value}</p>
            <p className="text-[12px] text-[#666]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div className="rounded-lg border border-[#2e2e2e] p-5" style={{ backgroundColor: "#1c1c1c" }}>
        <h2 className="text-[15px] font-medium text-[#ededed] mb-4">Distribucion por Plan</h2>
        <div className="space-y-3">
          {data?.planDistribution.map((p) => {
            const total = data.totalTenants || 1;
            const percentage = Math.round((p.count / total) * 100);
            const color = planColors[p.plan] || "#666";
            return (
              <div key={p.plan}>
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <span className="text-[#ccc]">{p.plan}</span>
                  <span className="text-[#888]">{p.count} ({percentage}%)</span>
                </div>
                <div className="h-[6px] rounded-full bg-[#2a2a2a] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const planColors: Record<string, string> = {
  INICIO: "#666",
  CRECIMIENTO: "#3b82f6",
  PROFESIONAL: "#8b5cf6",
  AGENCIA: "#f59e0b",
};

// ==========================================
// Super Admin Settings Page
// ==========================================

export function SuperAdminSettingsPage() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Crown size={20} className="text-amber-400" />
        <h1 className="text-[22px] font-semibold text-[#ededed]">Super Admins</h1>
      </div>

      <div className="rounded-lg border border-[#2e2e2e] p-6" style={{ backgroundColor: "#1c1c1c" }}>
        <p className="text-[13px] text-[#888] mb-4">
          Los Super Admins tienen acceso total a la plataforma y pueden operar como cualquier empresa.
        </p>

        <div className="rounded-lg border border-[#2e2e2e] p-4">
          <div className="flex items-center gap-3">
            <div className="w-[36px] h-[36px] rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Crown size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#ededed]">fedetafur3@gmail.com</p>
              <p className="text-[11px] text-emerald-400 font-medium">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
