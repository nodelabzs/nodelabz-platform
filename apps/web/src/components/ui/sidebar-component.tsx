"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Mail,
  MessageCircle,
  Share2,
  Wand2,
  Workflow,
  BarChart3,
  Plug,
  Settings,
  Sparkles,
  Lock,
} from "lucide-react";
import type { Permissions } from "@nodelabz/shared-types";
import { usePlan } from "@/hooks/use-plan";
import { UpgradeModal } from "@/components/ui/upgrade-modal";

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  permission?: keyof Permissions;
  /** If set, this nav item requires the given feature to be accessible on the current plan */
  gatedFeature?: string;
}

interface DetailItem {
  label: string;
  isActive?: boolean;
}

interface DetailSection {
  title: string;
  items: DetailItem[];
}

interface DetailContent {
  title: string;
  sections: DetailSection[];
}

const navItems: NavItem[] = [
  { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard", permission: "analytics" },
  { id: "contacts", icon: <Users size={18} />, label: "Contactos", permission: "crm" },
  { id: "campaigns", icon: <Megaphone size={18} />, label: "Campanas", permission: "campaigns" },
  { id: "email", icon: <Mail size={18} />, label: "Email", permission: "campaigns" },
  { id: "whatsapp", icon: <MessageCircle size={18} />, label: "WhatsApp", permission: "campaigns" },
  { id: "social", icon: <Share2 size={18} />, label: "Social", permission: "campaigns" },
  { id: "ai-studio", icon: <Wand2 size={18} />, label: "AI Studio", permission: "campaigns" },
  { id: "automations", icon: <Workflow size={18} />, label: "Automatizaciones", permission: "campaigns", gatedFeature: "workflows" },
  { id: "reports", icon: <BarChart3 size={18} />, label: "Reportes", permission: "reports" },
  { id: "integrations", icon: <Plug size={18} />, label: "Integraciones", permission: "integrations" },
];

const contentMap: Record<string, DetailContent> = {
  dashboard: {
    title: "Dashboard",
    sections: [
      { title: "OVERVIEW", items: [{ label: "Home", isActive: true }, { label: "Health Score" }, { label: "Metricas" }, { label: "Node Map" }] },
      { title: "INSIGHTS", items: [{ label: "Recomendaciones IA" }, { label: "Digest Diario" }] },
      { title: "ACCIONES RAPIDAS", items: [{ label: "Conectar plataforma" }, { label: "Generar reporte" }] },
    ],
  },
  contacts: {
    title: "Contactos",
    sections: [
      { title: "GESTION", items: [{ label: "Todos los contactos", isActive: true }, { label: "Empresas" }, { label: "Importar contactos" }] },
      { title: "PIPELINE", items: [{ label: "Pipeline principal" }, { label: "Deals" }, { label: "Actividades" }] },
      { title: "SEGMENTACION", items: [{ label: "Etiquetas" }, { label: "Listas inteligentes" }, { label: "Lead scoring" }] },
    ],
  },
  campaigns: {
    title: "Campanas",
    sections: [
      { title: "GESTION", items: [{ label: "Todas las campanas", isActive: true }, { label: "Crear campana" }] },
      { title: "RENDIMIENTO", items: [{ label: "Meta Ads" }, { label: "Google Ads" }, { label: "TikTok Ads" }] },
      { title: "CONTENIDO", items: [{ label: "Generador de copy IA" }, { label: "Creativos" }, { label: "Calendario" }] },
    ],
  },
  email: {
    title: "Email",
    sections: [
      { title: "GESTION", items: [{ label: "Campanas", isActive: true }, { label: "Plantillas" }, { label: "Secuencias" }] },
      { title: "CONSTRUCTOR", items: [{ label: "Editor drag & drop" }, { label: "Previsualizacion" }] },
      { title: "METRICAS", items: [{ label: "Entregas" }, { label: "Aperturas" }, { label: "Clics" }] },
    ],
  },
  whatsapp: {
    title: "WhatsApp",
    sections: [
      { title: "MENSAJES", items: [{ label: "Conversaciones", isActive: true }, { label: "Plantillas" }, { label: "Broadcasts" }] },
      { title: "AUTOMATIZACION", items: [{ label: "Respuestas IA" }, { label: "Secuencias" }] },
      { title: "CONFIGURACION", items: [{ label: "Numero conectado" }, { label: "Reglas" }] },
    ],
  },
  social: {
    title: "Social Media",
    sections: [
      { title: "PUBLICACIONES", items: [{ label: "Calendario", isActive: true }, { label: "Crear publicacion" }] },
      { title: "CANALES", items: [{ label: "Facebook" }, { label: "Instagram" }, { label: "TikTok" }, { label: "LinkedIn" }] },
      { title: "ENGAGEMENT", items: [{ label: "Bandeja de entrada" }, { label: "Menciones" }] },
    ],
  },
  "ai-studio": {
    title: "AI Studio",
    sections: [
      { title: "GENERACION", items: [{ label: "Generar Imagen", isActive: true }, { label: "Generar Video" }, { label: "Generar Copy" }] },
      { title: "MARCA", items: [{ label: "Editor de Marca" }] },
      { title: "ASISTENTE", items: [{ label: "Chat IA" }] },
    ],
  },
  automations: {
    title: "Automatizaciones",
    sections: [
      { title: "WORKFLOWS", items: [{ label: "Todos los workflows", isActive: true }, { label: "Crear workflow" }] },
      { title: "TRIGGERS", items: [{ label: "Formularios" }, { label: "Lead score" }, { label: "Email events" }] },
      { title: "HISTORIAL", items: [{ label: "Ejecuciones recientes" }, { label: "Errores" }] },
    ],
  },
  reports: {
    title: "Reportes",
    sections: [
      { title: "GENERACION", items: [{ label: "Resumen ejecutivo", isActive: true }, { label: "Reporte personalizado" }] },
      { title: "PROGRAMADOS", items: [{ label: "Reportes diarios" }, { label: "Reportes semanales" }, { label: "Reportes mensuales" }] },
      { title: "EXPORTAR", items: [{ label: "Descargar PDF" }, { label: "Enviar por email" }] },
    ],
  },
  integrations: {
    title: "Integraciones",
    sections: [
      { title: "CONECTADAS", items: [{ label: "Meta Ads", isActive: true }, { label: "Google Ads" }, { label: "GA4" }, { label: "Stripe" }, { label: "Shopify" }] },
      { title: "DISPONIBLES", items: [{ label: "TikTok" }, { label: "LinkedIn" }, { label: "WhatsApp Business" }, { label: "MercadoLibre" }] },
      { title: "CONFIGURACION", items: [{ label: "OAuth tokens" }, { label: "Sync status" }] },
    ],
  },
  settings: {
    title: "Configuracion",
    sections: [
      { title: "CUENTA", items: [{ label: "Perfil", isActive: true }, { label: "Equipo" }, { label: "Roles y permisos" }] },
      { title: "FACTURACION", items: [{ label: "Plan actual" }, { label: "Metodo de pago" }, { label: "Historial" }] },
      { title: "PLATAFORMA", items: [{ label: "Idioma" }, { label: "Notificaciones" }, { label: "API Keys" }] },
      { title: "IA", items: [{ label: "Contexto de Negocio" }] },
    ],
  },
};

export function IconNavigation({
  activeSection,
  onSectionChange,
  onAiChatToggle,
  aiChatOpen,
  isSuperAdmin,
  permissions,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onAiChatToggle?: () => void;
  aiChatOpen?: boolean;
  isSuperAdmin?: boolean;
  permissions?: Permissions;
}) {
  const { canAccess, requiredPlanFor, isTrialExpired } = usePlan();
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    feature: string;
    requiredPlan: string;
  }>({ open: false, feature: "", requiredPlan: "" });

  // Filter nav items by permissions
  const visibleItems = navItems.filter((item) => {
    if (isSuperAdmin) return true; // Super Admins see everything
    if (!item.permission) return true; // No permission required
    if (!permissions) return true; // No permissions loaded yet, show all
    const perm = permissions[item.permission];
    return perm !== "none";
  });

  const handleNavClick = (item: NavItem) => {
    // Super admins bypass plan gating
    if (isSuperAdmin || !item.gatedFeature) {
      onSectionChange(item.id);
      return;
    }

    if (!canAccess(item.gatedFeature)) {
      const required = requiredPlanFor(item.gatedFeature);
      setUpgradeModal({
        open: true,
        feature: item.gatedFeature,
        requiredPlan: required ?? "CRECIMIENTO",
      });
      return;
    }

    onSectionChange(item.id);
  };

  return (
    <>
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false, feature: "", requiredPlan: "" })}
        feature={upgradeModal.feature}
        requiredPlan={upgradeModal.requiredPlan}
        isTrialExpired={isTrialExpired}
      />
    <aside className="flex flex-col items-center py-2 w-[48px] h-full border-r border-[#2e2e2e] flex-shrink-0" style={{ backgroundColor: '#1c1c1c' }}>
      <div className="flex flex-col gap-[2px] w-full items-center px-1">
        {visibleItems.map((item) => {
          const isLocked = !isSuperAdmin && !!item.gatedFeature && !canAccess(item.gatedFeature);
          return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item)}
            title={isLocked ? `${item.label} (requiere plan superior)` : item.label}
            className={`relative flex items-center justify-center w-[38px] h-[38px] rounded-md transition-colors ${
              activeSection === item.id
                ? "text-[#ededed]"
                : isLocked
                  ? "text-[#555] hover:text-[#777] hover:bg-[#2a2a2a]"
                  : "text-[#666] hover:text-[#999] hover:bg-[#2a2a2a]"
            }`}
            style={activeSection === item.id ? { backgroundColor: '#2a2a2a' } : {}}
          >
            {activeSection === item.id && (
              <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-r-sm" style={{ backgroundColor: '#3ecf8e' }} />
            )}
            {item.icon}
            {isLocked && (
              <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full" style={{ backgroundColor: '#3ecf8e' }}>
                <Lock size={8} className="text-[#171717]" />
              </div>
            )}
          </button>
          );
        })}
      </div>
      <div className="flex-1" />
      <div className="flex flex-col gap-[2px] w-full items-center px-1 pb-1">
        {/* AI Chat button */}
        <button
          type="button"
          onClick={onAiChatToggle}
          title="Chat IA"
          className={`relative flex items-center justify-center w-[38px] h-[38px] rounded-md transition-colors mb-1 ${
            aiChatOpen
              ? "text-[#ededed]"
              : "text-[#f59e0b] hover:text-[#fbbf24] hover:bg-[#2a2a2a]"
          }`}
          style={aiChatOpen ? { backgroundColor: '#2a2a2a' } : {}}
        >
          {aiChatOpen && (
            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-r-sm" style={{ backgroundColor: '#3ecf8e' }} />
          )}
          <Sparkles size={18} />
          <div className="absolute top-[6px] right-[6px] w-[6px] h-[6px] rounded-full" style={{ backgroundColor: '#f59e0b' }} />
        </button>
        <button
          type="button"
          onClick={() => onSectionChange("settings")}
          title="Configuracion"
          className={`relative flex items-center justify-center w-[38px] h-[38px] rounded-md transition-colors ${
            activeSection === "settings"
              ? "text-[#ededed]"
              : "text-[#666] hover:text-[#999] hover:bg-[#2a2a2a]"
          }`}
          style={activeSection === "settings" ? { backgroundColor: '#2a2a2a' } : {}}
        >
          {activeSection === "settings" && (
            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-r-sm" style={{ backgroundColor: '#3ecf8e' }} />
          )}
          <Settings size={18} />
        </button>
      </div>
    </aside>
    </>
  );
}

export function DetailSidebar({
  activeSection,
  activeItem,
  onItemChange,
}: {
  activeSection: string;
  activeItem?: string;
  onItemChange?: (item: string) => void;
}) {
  const content = contentMap[activeSection] ?? contentMap["dashboard"]!;
  return (
    <aside className="w-[240px] h-full border-r border-[#2e2e2e] flex flex-col flex-shrink-0 overflow-y-auto" style={{ backgroundColor: '#1c1c1c' }}>
      <div className="px-5 pt-3 pb-2 border-b border-[#2e2e2e]">
        <h2 className="text-[15px] font-semibold text-[#ededed]">{content.title}</h2>
      </div>
      <nav className="flex-1 pt-1">
        <ul className="flex flex-col space-y-4 my-2">
          {content.sections.map((section, sIdx) => (
            <li key={sIdx}>
              {sIdx > 0 && (
                <div className="h-px mx-auto mb-4" style={{ width: 'calc(100% - 1.5rem)', backgroundColor: '#2e2e2e' }} />
              )}
              <div className="flex space-x-3 mb-2 font-normal px-3 mx-3">
                <span className="text-[11px] font-normal uppercase tracking-[0.1em] text-[#666]">
                  {section.title}
                </span>
              </div>
              <div>
                {section.items.map((item, iIdx) => {
                  const isActive = activeItem ? item.label === activeItem : item.isActive;
                  return (
                    <button
                      key={iIdx}
                      type="button"
                      onClick={() => onItemChange?.(item.label)}
                      className={`block w-full text-left text-[14px] py-[5px] px-6 transition-colors ${
                        isActive
                          ? "text-[#ededed] font-medium"
                          : "text-[#999] hover:text-[#ededed]"
                      }`}
                      style={isActive ? { backgroundColor: '#2a2a2a' } : {}}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default function Frame760() {
  return null;
}
