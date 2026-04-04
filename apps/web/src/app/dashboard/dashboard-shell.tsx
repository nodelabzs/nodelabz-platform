"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { IconNavigation, DetailSidebar } from "@/components/ui/sidebar-component";
import { TopNavbar } from "@/components/ui/top-navbar";
import { AiChatPanel } from "@/components/ui/ai-chat-panel";
import { WorkflowEditor } from "@/components/ui/workflow/workflow-editor";
import { ContentRouter, getDefaultItem } from "@/components/pages/content-router";
import { SuperAdminBanner } from "@/components/ui/super-admin-banner";
import { useChatStore } from "@/stores/chat-store";
import { trpc } from "@/lib/trpc";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial state from URL search params, fallback to defaults
  const urlSection = searchParams.get("s") || "dashboard";
  const urlItem = searchParams.get("i") || getDefaultItem(urlSection);

  const [activeSection, setActiveSection] = useState<string>(urlSection);
  const [activeItem, setActiveItem] = useState<string>(urlItem);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  // Track the source of the last navigation to avoid circular updates
  const navSourceRef = useRef<"url" | "click" | "init">("init");

  const { workflowDraft, setWorkflowDraft, autonomy } = useChatStore();
  const { showWarning, secondsLeft, stayLoggedIn, logout } = useIdleTimeout();

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

  // Sync URL → state when search params change (back/forward navigation)
  useEffect(() => {
    const s = searchParams.get("s") || "dashboard";
    const i = searchParams.get("i") || getDefaultItem(s);
    if (s !== activeSection || i !== activeItem) {
      navSourceRef.current = "url";
      setActiveSection(s);
      setActiveItem(i);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync state → URL when activeSection or activeItem changes (user clicks)
  useEffect(() => {
    // Skip if this state change came from URL (back/forward) or initial render
    if (navSourceRef.current === "url" || navSourceRef.current === "init") {
      navSourceRef.current = "click"; // Reset for next interaction
      return;
    }
    const params = new URLSearchParams();
    params.set("s", activeSection);
    params.set("i", activeItem);
    const newUrl = `${pathname}?${params.toString()}`;
    router.push(newUrl, { scroll: false });
  }, [activeSection, activeItem, pathname, router]);

  // Listen for programmatic navigation from page components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { section: string; item?: string };
      if (detail?.section) {
        navSourceRef.current = "click";
        setActiveSection(detail.section);
        setActiveItem(detail.item ?? getDefaultItem(detail.section));
      }
    };
    window.addEventListener("dashboard:navigate", handler);
    return () => window.removeEventListener("dashboard:navigate", handler);
  }, []);

  // When section changes, reset active item to default
  const handleSectionChange = useCallback((section: string) => {
    navSourceRef.current = "click";
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
        tenantName={activeTenantName || "Mi Empresa"}
        userName={displayName}
        projectName={isInsideCompany ? undefined : (activeTenantName || "Mi Empresa")}
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
        {/* DetailSidebar hidden on small screens */}
        <div className="hidden md:flex h-full">
          <DetailSidebar
            activeSection={activeSection}
            activeItem={activeItem}
            onItemChange={(item: string) => { navSourceRef.current = "click"; setActiveItem(item); }}
          />
        </div>

        {/* Main content area */}
        <div
          className="flex-1 overflow-auto min-w-0"
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
            <div className="p-3 sm:p-4 md:p-6 h-full overflow-auto">
              <ContentRouter section={activeSection} activeItem={activeItem} />
            </div>
          )}
        </div>

        {/* AI Chat panel: full overlay on mobile, side panel on desktop */}
        {aiChatOpen && (
          <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto">
            <AiChatPanel
              onClose={() => setAiChatOpen(false)}
              activeSection={activeSection as AiSection}
              plan={plan}
              onOpenWorkflowEditor={handleOpenWorkflowEditor}
            />
          </div>
        )}
      </div>

      {/* Inactivity warning modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[#2e2e2e] p-6 text-center" style={{ backgroundColor: "#1c1c1c" }}>
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="text-[16px] font-semibold text-[#ededed] mb-2">Sesion por expirar</h3>
            <p className="text-[13px] text-[#888] mb-4">
              Tu sesion se cerrara en <span className="text-[#f59e0b] font-bold">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span> por inactividad.
            </p>
            <div className="flex gap-3">
              <button
                onClick={logout}
                className="flex-1 py-2 px-4 rounded-lg border border-[#333] text-[13px] text-[#888] hover:text-[#ededed] hover:border-[#555] transition-colors"
              >
                Cerrar sesion
              </button>
              <button
                onClick={stayLoggedIn}
                className="flex-1 py-2 px-4 rounded-lg text-[13px] font-semibold text-white transition-colors"
                style={{ backgroundColor: "#3ecf8e" }}
              >
                Seguir conectado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
