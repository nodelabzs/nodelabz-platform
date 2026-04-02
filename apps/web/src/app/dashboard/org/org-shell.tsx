"use client";

import React from "react";
import { OrgSidebar } from "@/components/ui/org-sidebar";
import { TopNavbar } from "@/components/ui/top-navbar";
import { trpc } from "@/lib/trpc";

export function OrgShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const { data: session } = trpc.auth.getSession.useQuery();
  const tenantName = session?.tenant?.name ?? "Mi Empresa";

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden" style={{ backgroundColor: '#171717' }}>
      <TopNavbar tenantName={tenantName} userName={userName} />
      <div className="flex flex-row flex-1 overflow-hidden">
        <OrgSidebar />
        <div className="flex-1 overflow-auto p-8" style={{ backgroundColor: '#171717' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
