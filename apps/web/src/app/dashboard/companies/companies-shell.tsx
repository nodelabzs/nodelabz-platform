"use client";

import React, { useState } from "react";
import { TopNavbar } from "@/components/ui/top-navbar";
import {
  AllCompaniesPage,
  PlatformMetricsPage,
  AuditLogsPage,
  SecurityAlertsPage,
  SuperAdminSettingsPage,
} from "@/components/pages/admin-pages";
import {
  Building2,
  BarChart3,
  DollarSign,
  Activity,
  ScrollText,
  ShieldAlert,
  ShieldBan,
  UserCog,
  Key,
  ToggleRight,
} from "lucide-react";

interface SidebarSection {
  title: string;
  items: { id: string; icon: React.ReactNode; label: string }[];
}

const sidebarSections: SidebarSection[] = [
  {
    title: "CLIENTES",
    items: [
      { id: "companies", icon: <Building2 size={14} />, label: "Todas las empresas" },
    ],
  },
  {
    title: "PLATAFORMA",
    items: [
      { id: "metrics", icon: <BarChart3 size={14} />, label: "Metricas generales" },
      { id: "revenue", icon: <DollarSign size={14} />, label: "Revenue" },
      { id: "usage", icon: <Activity size={14} />, label: "Uso por tenant" },
    ],
  },
  {
    title: "SEGURIDAD",
    items: [
      { id: "audit-logs", icon: <ScrollText size={14} />, label: "Logs de auditoria" },
      { id: "security-alerts", icon: <ShieldAlert size={14} />, label: "Alertas de seguridad" },
      { id: "prompt-injections", icon: <ShieldBan size={14} />, label: "Prompt injections" },
    ],
  },
  {
    title: "CONFIGURACION",
    items: [
      { id: "super-admins", icon: <UserCog size={14} />, label: "Super admins" },
      { id: "api-keys", icon: <Key size={14} />, label: "API Keys" },
      { id: "feature-flags", icon: <ToggleRight size={14} />, label: "Feature flags" },
    ],
  },
];

const contentMap: Record<string, React.ReactNode> = {
  "companies": <AllCompaniesPage />,
  "metrics": <PlatformMetricsPage />,
  "revenue": <PlatformMetricsPage />,
  "usage": <PlatformMetricsPage />,
  "audit-logs": <AuditLogsPage />,
  "security-alerts": <SecurityAlertsPage />,
  "prompt-injections": <SecurityAlertsPage filterAction="prompt_injection_blocked" />,
  "super-admins": <SuperAdminSettingsPage />,
  "api-keys": <div className="text-[#888] text-sm">API Keys - Proximamente</div>,
  "feature-flags": <div className="text-[#888] text-sm">Feature Flags - Proximamente</div>,
};

export function CompaniesShell({ userName }: { userName: string }) {
  const [activeItem, setActiveItem] = useState("companies");

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden" style={{ backgroundColor: "#171717" }}>
      <TopNavbar
        tenantName="NodeLabz"
        userName={userName}
        isSuperAdmin
        companiesContext={{ companyName: "", companyId: "" }}
      />
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="w-[220px] h-full border-r border-[#2e2e2e] flex flex-col flex-shrink-0 overflow-y-auto"
          style={{ backgroundColor: "#1c1c1c" }}
        >
          <div className="px-4 pt-3 pb-2 border-b border-[#2e2e2e]">
            <div className="flex items-center gap-2">
              <div className="w-[22px] h-[22px] rounded bg-emerald-500/20 flex items-center justify-center">
                <Building2 size={12} className="text-emerald-400" />
              </div>
              <h2 className="text-[14px] font-semibold text-[#ededed]">Gestion de Clientes</h2>
            </div>
          </div>
          <nav className="flex-1 pt-2">
            {sidebarSections.map((section, sIdx) => (
              <div key={sIdx} className="mb-3">
                {sIdx > 0 && (
                  <div
                    className="h-px mx-auto mb-3"
                    style={{ width: "calc(100% - 1.5rem)", backgroundColor: "#2e2e2e" }}
                  />
                )}
                <div className="px-4 mb-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#555]">
                    {section.title}
                  </span>
                </div>
                {section.items.map((item) => {
                  const isActive = activeItem === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveItem(item.id)}
                      className={`flex items-center gap-2.5 w-full px-4 py-[6px] text-[13px] transition-colors ${
                        isActive
                          ? "text-[#ededed] font-medium"
                          : "text-[#888] hover:text-[#ccc] hover:bg-[#2a2a2a]"
                      }`}
                      style={isActive ? { backgroundColor: "#2a2a2a" } : {}}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8" style={{ backgroundColor: "#171717" }}>
          {contentMap[activeItem] ?? <AllCompaniesPage />}
        </div>
      </div>
    </div>
  );
}
