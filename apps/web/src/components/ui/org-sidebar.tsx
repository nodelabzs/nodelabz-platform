"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Users,
  CreditCard,
  Plug,
  Receipt,
  Settings,
  Building2,
} from "lucide-react";

const orgNavItems = [
  { id: "overview", icon: <Building2 size={18} />, label: "Projects", href: "/dashboard/org" },
  { id: "team", icon: <Users size={18} />, label: "Team", href: "/dashboard/org/team" },
  { id: "integrations", icon: <Plug size={18} />, label: "Integrations", href: "/dashboard/org/integrations" },
  { id: "usage", icon: <Receipt size={18} />, label: "Usage", href: "/dashboard/org/usage" },
  { id: "billing", icon: <CreditCard size={18} />, label: "Billing", href: "/dashboard/org/billing" },
  { id: "settings", icon: <Settings size={18} />, label: "Settings", href: "/dashboard/org/settings" },
];

export function OrgSidebar() {
  const pathname = usePathname();

  const getActiveId = () => {
    if (pathname === "/dashboard/org") return "overview";
    const segment = pathname.split("/").pop();
    return orgNavItems.find((item) => item.id === segment)?.id || "overview";
  };

  const activeId = getActiveId();

  return (
    <aside className="flex flex-col items-center py-2 w-[48px] h-full border-r border-[#2e2e2e] flex-shrink-0" style={{ backgroundColor: '#1c1c1c' }}>
      <div className="flex flex-col gap-[2px] w-full items-center px-1">
        {orgNavItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            title={item.label}
            className={`relative flex items-center justify-center w-[38px] h-[38px] rounded-md transition-colors ${
              activeId === item.id
                ? "text-[#ededed]"
                : "text-[#666] hover:text-[#999] hover:bg-[#2a2a2a]"
            }`}
            style={activeId === item.id ? { backgroundColor: '#2a2a2a' } : {}}
          >
            {activeId === item.id && (
              <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-r-sm" style={{ backgroundColor: '#3ecf8e' }} />
            )}
            {item.icon}
          </Link>
        ))}
      </div>
    </aside>
  );
}
