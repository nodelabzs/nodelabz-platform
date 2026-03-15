"use client";

import React from "react";
import { OrgSidebar } from "@/components/ui/org-sidebar";
import { TopNavbar } from "@/components/ui/top-navbar";

export function OrgShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="flex flex-col w-full h-screen overflow-hidden" style={{ backgroundColor: '#171717' }}>
      <TopNavbar tenantName="NodeLabz" userName={userName} />
      <div className="flex flex-row flex-1 overflow-hidden">
        <OrgSidebar />
        <div className="flex-1 overflow-auto p-8" style={{ backgroundColor: '#171717' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
