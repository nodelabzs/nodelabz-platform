"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useHotkeys } from "@/hooks/use-hotkeys";
import {
  Search,
  Users,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Mail,
  MessageCircle,
  Share2,
  Wand2,
  Workflow,
  BarChart3,
  Plug,
  Settings,
  Plus,
  ArrowRight,
  Command,
  Hash,
} from "lucide-react";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: "navigation" | "contact" | "deal" | "action";
  action: () => void;
}

/* ================================================================== */
/*  Navigation items (static)                                          */
/* ================================================================== */

const SECTION_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={14} />,
  contacts: <Users size={14} />,
  campaigns: <Megaphone size={14} />,
  email: <Mail size={14} />,
  whatsapp: <MessageCircle size={14} />,
  social: <Share2 size={14} />,
  "ai-studio": <Wand2 size={14} />,
  automations: <Workflow size={14} />,
  reports: <BarChart3 size={14} />,
  integrations: <Plug size={14} />,
  settings: <Settings size={14} />,
};

const NAV_ITEMS: Array<{ section: string; item: string; label: string }> = [
  { section: "dashboard", item: "Home", label: "Dashboard" },
  { section: "dashboard", item: "Health Score", label: "Health Score" },
  { section: "dashboard", item: "Metricas", label: "Metricas" },
  { section: "contacts", item: "Todos los contactos", label: "Todos los contactos" },
  { section: "contacts", item: "Empresas", label: "Empresas" },
  { section: "contacts", item: "Importar contactos", label: "Importar contactos" },
  { section: "contacts", item: "Pipeline principal", label: "Pipeline" },
  { section: "contacts", item: "Deals", label: "Deals" },
  { section: "contacts", item: "Actividades", label: "Actividades" },
  { section: "contacts", item: "Lead scoring", label: "Lead scoring" },
  { section: "campaigns", item: "Todas las campanas", label: "Campanas" },
  { section: "campaigns", item: "Meta Ads", label: "Meta Ads" },
  { section: "campaigns", item: "Google Ads", label: "Google Ads" },
  { section: "campaigns", item: "TikTok Ads", label: "TikTok Ads" },
  { section: "email", item: "Campanas", label: "Email Campanas" },
  { section: "email", item: "Plantillas", label: "Plantillas Email" },
  { section: "email", item: "Secuencias", label: "Secuencias Email" },
  { section: "whatsapp", item: "Conversaciones", label: "WhatsApp" },
  { section: "social", item: "Calendario", label: "Social Media" },
  { section: "ai-studio", item: "Generar Imagen", label: "AI Imagen" },
  { section: "ai-studio", item: "Generar Video", label: "AI Video" },
  { section: "ai-studio", item: "Chat IA", label: "Chat IA" },
  { section: "automations", item: "Todos los workflows", label: "Workflows" },
  { section: "automations", item: "Crear workflow", label: "Crear workflow" },
  { section: "automations", item: "Formularios", label: "Formularios" },
  { section: "reports", item: "Resumen ejecutivo", label: "Resumen ejecutivo" },
  { section: "integrations", item: "Meta Ads", label: "Integracion Meta" },
  { section: "integrations", item: "Sync status", label: "Sync status" },
  { section: "settings", item: "Perfil", label: "Configuracion" },
  { section: "settings", item: "Equipo", label: "Equipo" },
  { section: "settings", item: "Plan actual", label: "Plan y facturacion" },
  { section: "settings", item: "Contexto de Negocio", label: "Contexto de Negocio" },
];

/* ================================================================== */
/*  Command Palette Component                                          */
/* ================================================================== */

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Toggle with Cmd+K
  useHotkeys([
    {
      key: "k",
      meta: true,
      handler: () => setOpen((prev) => !prev),
      allowInInput: true,
    },
  ]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Navigate to a section/item
  const navigate = useCallback((section: string, item: string) => {
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("dashboard:navigate", { detail: { section, item } })
    );
  }, []);

  // Search contacts
  const { data: contactResults } = trpc.contacts.list.useQuery(
    { page: 1, limit: 5, search: query },
    { enabled: open && query.length >= 2 }
  );

  // Search deals
  const { data: dealResults } = trpc.deals.list.useQuery(
    {},
    { enabled: open && query.length >= 2 }
  );

  // Build command items
  const items = useMemo<CommandItem[]>(() => {
    const results: CommandItem[] = [];
    const q = query.toLowerCase().trim();

    // Quick actions (always show when no query)
    if (!q) {
      results.push({
        id: "action-new-contact",
        label: "Crear contacto",
        description: "Agregar nuevo contacto",
        icon: <Plus size={14} />,
        category: "action",
        action: () => {
          navigate("contacts", "Todos los contactos");
          // Trigger create modal after navigation settles
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("command:create-contact"));
          }, 200);
        },
      });
      results.push({
        id: "action-new-deal",
        label: "Crear deal",
        description: "Agregar nuevo deal",
        icon: <Plus size={14} />,
        category: "action",
        action: () => {
          navigate("contacts", "Deals");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("command:create-deal"));
          }, 200);
        },
      });
    }

    // Navigation items (filtered)
    const navMatches = q
      ? NAV_ITEMS.filter(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            n.section.toLowerCase().includes(q) ||
            n.item.toLowerCase().includes(q)
        )
      : NAV_ITEMS.slice(0, 8);

    for (const nav of navMatches) {
      results.push({
        id: `nav-${nav.section}-${nav.item}`,
        label: nav.label,
        description: nav.section,
        icon: SECTION_ICONS[nav.section] ?? <Hash size={14} />,
        category: "navigation",
        action: () => navigate(nav.section, nav.item),
      });
    }

    // Contact search results
    if (q.length >= 2 && contactResults?.contacts) {
      for (const c of contactResults.contacts) {
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
        results.push({
          id: `contact-${c.id}`,
          label: name,
          description: c.email ?? c.company ?? undefined,
          icon: <Users size={14} />,
          category: "contact",
          action: () => {
            navigate("contacts", "Todos los contactos");
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("command:open-contact", { detail: { contactId: c.id } })
              );
            }, 200);
          },
        });
      }
    }

    // Deal search results
    if (q.length >= 2 && dealResults) {
      const filteredDeals = dealResults.filter(
        (d) => d.title.toLowerCase().includes(q)
      );
      for (const d of filteredDeals.slice(0, 5)) {
        results.push({
          id: `deal-${d.id}`,
          label: d.title,
          description: d.value ? `$${Number(d.value).toLocaleString()}` : undefined,
          icon: <Handshake size={14} />,
          category: "deal",
          action: () => {
            navigate("contacts", "Deals");
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("command:open-deal", { detail: { dealId: d.id } })
              );
            }, 200);
          },
        });
      }
    }

    return results;
  }, [query, contactResults, dealResults, navigate]);

  // Reset index when items change
  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[activeIndex]?.action();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) return null;

  // Group items by category
  const grouped = new Map<string, CommandItem[]>();
  for (const item of items) {
    const arr = grouped.get(item.category) ?? [];
    arr.push(item);
    grouped.set(item.category, arr);
  }

  const CATEGORY_LABELS: Record<string, string> = {
    action: "Acciones rapidas",
    navigation: "Navegacion",
    contact: "Contactos",
    deal: "Deals",
  };

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "var(--nl-bg-primary)",
          borderColor: "var(--nl-border)",
          boxShadow: "var(--nl-shadow-lg)",
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 h-12 border-b"
          style={{ borderColor: "var(--nl-border)" }}
        >
          <Search size={16} style={{ color: "var(--nl-text-muted)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar paginas, contactos, deals..."
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: "var(--nl-text-primary)" }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              color: "var(--nl-text-faint)",
              borderColor: "var(--nl-border-subtle)",
              backgroundColor: "var(--nl-bg-tertiary)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[340px] overflow-y-auto py-2"
        >
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px]" style={{ color: "var(--nl-text-muted)" }}>
                No se encontraron resultados
              </p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, categoryItems]) => (
              <div key={category}>
                <div
                  className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-medium"
                  style={{ color: "var(--nl-text-faint)" }}
                >
                  {CATEGORY_LABELS[category] ?? category}
                </div>
                {categoryItems.map((item) => {
                  const idx = globalIdx++;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => item.action()}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                      style={{
                        backgroundColor: isActive
                          ? "var(--nl-bg-elevated)"
                          : "transparent",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: "var(--nl-bg-tertiary)",
                          color: isActive
                            ? "var(--nl-accent)"
                            : "var(--nl-text-muted)",
                        }}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] truncate"
                          style={{
                            color: isActive
                              ? "var(--nl-text-primary)"
                              : "var(--nl-text-secondary)",
                          }}
                        >
                          {item.label}
                        </p>
                        {item.description && (
                          <p
                            className="text-[11px] truncate"
                            style={{ color: "var(--nl-text-faint)" }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                      {isActive && (
                        <ArrowRight
                          size={12}
                          style={{ color: "var(--nl-text-faint)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t text-[10px]"
          style={{
            borderColor: "var(--nl-border)",
            color: "var(--nl-text-faint)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: "var(--nl-border-subtle)", backgroundColor: "var(--nl-bg-tertiary)" }}>↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: "var(--nl-border-subtle)", backgroundColor: "var(--nl-bg-tertiary)" }}>↵</kbd>
              seleccionar
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command size={10} /> K para abrir
          </span>
        </div>
      </div>
    </div>
  );
}
