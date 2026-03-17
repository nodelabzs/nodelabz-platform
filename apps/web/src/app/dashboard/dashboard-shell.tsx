"use client";

import React, { useState, useCallback, useEffect } from "react";
import { IconNavigation, DetailSidebar } from "@/components/ui/sidebar-component";
import { TopNavbar } from "@/components/ui/top-navbar";
import { AiChatPanel } from "@/components/ui/ai-chat-panel";
import { WorkflowEditor } from "@/components/ui/workflow/workflow-editor";
import { ContentRouter, getDefaultItem } from "@/components/pages/content-router";
import { SuperAdminBanner } from "@/components/ui/super-admin-banner";
import { useChatStore } from "@/stores/chat-store";
import { trpc } from "@/lib/trpc";
import { usePathname } from "next/navigation";
import type { AiSection, ChatArtifact, PlanName, WorkflowArtifact, Permissions } from "@nodelabz/shared-types";

export function DashboardShell({
  children,
  user,
  plan,
}: {
  children?: React.ReactNode;
  user: { email?: string; user_metadata?: { name?: string; full_name?: string } };
  plan?: PlanName;
}) {
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [activeItem, setActiveItem] = useState<string>(getDefaultItem("dashboard"));
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const pathname = usePathname();
  const { workflowDraft, setWorkflowDraft, autonomy } = useChatStore();

  const createWorkflow = trpc.workflow.create.useMutation();
  const utils = trpc.useUtils();

  // Refetch session when pathname changes (server layout may have changed activeTenantId)
  useEffect(() => {
    utils.auth.getSession.invalidate();
  }, [pathname, utils.auth.getSession]);

  // Fetch session to get isSuperAdmin + activeTenantId + permissions
  const { data: session } = trpc.auth.getSession.useQuery();
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
  const activeTenantId = session?.user?.activeTenantId;
  const activeTenantName = session?.tenant?.name;
  const activeTenantPlan = session?.tenant?.plan;

  // Determine if we're inside /dashboard/companies/[tenantId]
  const isInsideCompany = /\/dashboard\/companies\/[^/]+/.test(pathname);
  const companiesContext = isInsideCompany
    ? { companyName: activeTenantName || "Cargando...", companyId: activeTenantId || "" }
    : undefined;
  const permissions = (session?.user?.permissions ?? {}) as Permissions;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario";

  // When section changes, reset active item to default
  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
    setActiveItem(getDefaultItem(section));
  }, []);

  const handleOpenWorkflowEditor = useCallback(
    (artifact: ChatArtifact & { artifactType: "workflow" }) => {
      setWorkflowDraft(artifact.payload);
    },
    [setWorkflowDraft]
  );

  const handleSaveWorkflow = useCallback(
    async (data: {
      name: string;
      nodes: unknown[];
      edges: unknown[];
      activate: boolean;
    }) => {
      const triggerNode = (data.nodes as { type?: string; data?: unknown }[]).find(
        (n) => n.type === "trigger"
      );
      await createWorkflow.mutateAsync({
        name: data.name,
        trigger: (triggerNode?.data as Record<string, unknown>) || {},
        nodes: data.nodes as Record<string, unknown>[],
        edges: data.edges as Record<string, unknown>[],
        isActive: data.activate,
      });
      setWorkflowDraft(null);
    },
    [createWorkflow, setWorkflowDraft]
  );

  return (
    <div
      className="flex flex-col w-full h-screen overflow-hidden"
      style={{ backgroundColor: "#171717" }}
    >
      {/* Super Admin banner when viewing a company via /dashboard/companies/[tenantId] */}
      {isSuperAdmin && isInsideCompany && (
        <SuperAdminBanner
          tenantName={activeTenantName || "Cargando..."}
          tenantPlan={activeTenantPlan}
        />
      )}

      <TopNavbar
        tenantName="NodeLabz"
        userName={displayName}
        projectName={isInsideCompany ? undefined : "NodeLabz"}
        isSuperAdmin={isSuperAdmin}
        companiesContext={companiesContext}
      />
      <div className="flex flex-row flex-1 overflow-hidden">
        <IconNavigation
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          onAiChatToggle={() => setAiChatOpen(!aiChatOpen)}
          aiChatOpen={aiChatOpen}
          isSuperAdmin={isSuperAdmin}
          permissions={permissions}
        />
        <DetailSidebar
          activeSection={activeSection}
          activeItem={activeItem}
          onItemChange={setActiveItem}
        />

        {/* Main content area */}
        <div
          className="flex-1 overflow-auto"
          style={{ backgroundColor: "#171717" }}
        >
          {workflowDraft ? (
            <WorkflowEditor
              draft={workflowDraft as WorkflowArtifact["payload"]}
              autonomy={autonomy}
              onClose={() => setWorkflowDraft(null)}
              onSave={handleSaveWorkflow}
            />
          ) : (
            <div className="p-6 min-h-full">
              <ContentRouter section={activeSection} activeItem={activeItem} />
            </div>
          )}
        </div>

        {aiChatOpen && (
          <AiChatPanel
            onClose={() => setAiChatOpen(false)}
            activeSection={activeSection as AiSection}
            plan={plan}
            onOpenWorkflowEditor={handleOpenWorkflowEditor}
          />
        )}
      </div>
    </div>
  );
}
