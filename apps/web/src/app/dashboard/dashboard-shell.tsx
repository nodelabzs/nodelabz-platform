"use client";

import React, { useState } from "react";
import { IconNavigation, DetailSidebar } from "@/components/ui/sidebar-component";
import { TopNavbar } from "@/components/ui/top-navbar";
import { AiChatPanel } from "@/components/ui/ai-chat-panel";

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { email?: string; user_metadata?: { name?: string; full_name?: string } };
}) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario";

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden" style={{ backgroundColor: '#171717' }}>
      <TopNavbar tenantName="NodeLabz" userName={displayName} projectName="NodeLabz" />
      <div className="flex flex-row flex-1 overflow-hidden">
        <IconNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onAiChatToggle={() => setAiChatOpen(!aiChatOpen)}
          aiChatOpen={aiChatOpen}
        />
        <DetailSidebar activeSection={activeSection} />
        <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: '#171717' }}>
          {children}
        </div>
        {aiChatOpen && <AiChatPanel onClose={() => setAiChatOpen(false)} />}
      </div>
    </div>
  );
}
