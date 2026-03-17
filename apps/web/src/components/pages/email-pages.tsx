"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Mail,
  Plus,
  Eye,
  MousePointerClick,
  Send,
  Layout,
  Search,
  Image,
  Type,
  MousePointer,
  ImagePlus,
  Minus,
  Columns,
  Share2,
  MoveVertical,
  GripVertical,
  Sparkles,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Email Builder Types                                                */
/* ------------------------------------------------------------------ */

type BlockType =
  | "header-image"
  | "text"
  | "button"
  | "image"
  | "divider"
  | "two-columns"
  | "social-links"
  | "spacer";

interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Palette definition                                                 */
/* ------------------------------------------------------------------ */

const PALETTE: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: "header-image", label: "Header Image", icon: Image },
  { type: "text", label: "Texto", icon: Type },
  { type: "button", label: "Boton", icon: MousePointer },
  { type: "image", label: "Imagen", icon: ImagePlus },
  { type: "divider", label: "Divisor", icon: Minus },
  { type: "two-columns", label: "2 Columnas", icon: Columns },
  { type: "social-links", label: "Social Links", icon: Share2 },
  { type: "spacer", label: "Spacer", icon: MoveVertical },
];

/* ------------------------------------------------------------------ */
/*  Default blocks                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_BLOCKS: EmailBlock[] = [
  {
    id: "block-1",
    type: "header-image",
    content: {},
  },
  {
    id: "block-2",
    type: "text",
    content: {
      text: "Hola {{nombre}},\n\nDescubre nuestras nuevas ofertas exclusivas para ti.",
      fontSize: 16,
      align: "left",
      color: "#333333",
      bold: false,
      italic: false,
    },
  },
  {
    id: "block-3",
    type: "two-columns",
    content: {},
  },
  {
    id: "block-4",
    type: "button",
    content: {
      text: "Ver Ofertas →",
      color: "#3ecf8e",
      url: "https://example.com",
      borderRadius: 8,
    },
  },
  {
    id: "block-5",
    type: "divider",
    content: {},
  },
  {
    id: "block-6",
    type: "text",
    content: {
      text: "NodeLabz Inc. | Cancelar suscripcion",
      fontSize: 12,
      align: "center",
      color: "#999999",
      bold: false,
      italic: false,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Palette draggable item                                             */
/* ------------------------------------------------------------------ */

function PaletteItem({
  type,
  label,
  icon: Icon,
}: {
  type: BlockType;
  label: string;
  icon: React.ElementType;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: `palette-${type}`,
      data: { origin: "palette", type },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="flex items-center gap-2.5 rounded-lg border border-[#2e2e2e] bg-[#232323] px-3 py-2.5 text-sm text-[#ccc] cursor-grab active:cursor-grabbing hover:border-[#3ecf8e]/40 hover:bg-[#272727] transition-colors select-none"
    >
      <Icon size={15} className="shrink-0 text-[#888]" />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block renderers (canvas)                                           */
/* ------------------------------------------------------------------ */

function RenderBlockContent({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case "header-image":
      return (
        <div
          className="h-[180px] w-full rounded-md"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
          }}
        >
          <div className="flex h-full items-center justify-center text-white/80 text-lg font-semibold tracking-wide">
            <Image size={28} className="mr-3 opacity-60" />
            Header Image
          </div>
        </div>
      );

    case "text": {
      const c = block.content as {
        text?: string;
        fontSize?: number;
        align?: string;
        color?: string;
        bold?: boolean;
        italic?: boolean;
      };
      return (
        <div
          style={{
            fontSize: c.fontSize ?? 16,
            textAlign: (c.align as "left" | "center" | "right") ?? "left",
            color: c.color ?? "#333",
            fontWeight: c.bold ? 700 : 400,
            fontStyle: c.italic ? "italic" : "normal",
            lineHeight: 1.65,
            whiteSpace: "pre-line",
          }}
          className="px-6 py-4"
        >
          {c.text ?? "Texto de ejemplo"}
        </div>
      );
    }

    case "button": {
      const c = block.content as {
        text?: string;
        color?: string;
        borderRadius?: number;
      };
      return (
        <div className="flex justify-center py-5">
          <div
            className="inline-block px-8 py-3 text-white font-semibold text-[15px] cursor-pointer"
            style={{
              backgroundColor: c.color ?? "#3ecf8e",
              borderRadius: c.borderRadius ?? 8,
            }}
          >
            {c.text ?? "Click aqui"}
          </div>
        </div>
      );
    }

    case "image":
      return (
        <div className="flex justify-center py-4">
          <div className="flex h-[160px] w-[80%] items-center justify-center rounded-md bg-gray-200 text-gray-400">
            <ImagePlus size={32} />
          </div>
        </div>
      );

    case "divider":
      return (
        <div className="px-6 py-4">
          <hr className="border-gray-300" />
        </div>
      );

    case "two-columns":
      return (
        <div className="flex gap-4 px-6 py-4">
          <div className="flex h-[140px] flex-1 items-center justify-center rounded-md bg-gray-200 text-gray-400">
            <ImagePlus size={28} />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1 text-[#333]">
            <span className="text-[15px] font-semibold">
              Producto destacado
            </span>
            <span className="text-xl font-bold text-[#3ecf8e]">$49.99</span>
            <span className="text-xs text-gray-500">Envio gratis</span>
          </div>
        </div>
      );

    case "social-links":
      return (
        <div className="flex justify-center gap-5 py-5 text-gray-400">
          {["Facebook", "Twitter", "Instagram", "LinkedIn"].map((s) => (
            <div
              key={s}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-500"
            >
              {s[0]}
            </div>
          ))}
        </div>
      );

    case "spacer":
      return <div className="h-10" />;

    default:
      return <div className="p-4 text-gray-400 text-sm">Bloque vacio</div>;
  }
}

/* ------------------------------------------------------------------ */
/*  Sortable block wrapper                                             */
/* ------------------------------------------------------------------ */

function SortableBlock({
  block,
  selected,
  onSelect,
  onDelete,
}: {
  block: EmailBlock;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(block.id)}
      className={`group relative cursor-pointer rounded-md transition-shadow ${
        selected
          ? "ring-2 ring-[#3ecf8e] shadow-[0_0_0_1px_#3ecf8e33]"
          : "hover:ring-1 hover:ring-[#3ecf8e]/30"
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-1/2 -translate-y-1/2 flex h-8 w-6 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-[#1c1c1c] border border-[#2e2e2e]"
        title="Drag to reorder"
      >
        <GripVertical size={14} className="text-[#888]" />
      </div>

      {/* Hover overlay label */}
      <div className="pointer-events-none absolute inset-x-0 -top-6 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="rounded bg-[#1c1c1c] px-2 py-0.5 text-[10px] text-[#888] border border-[#2e2e2e]">
          Drag to reorder
        </span>
      </div>

      {/* Delete btn */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(block.id);
        }}
        className="absolute -right-3 -top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
      >
        <Trash2 size={12} />
      </button>

      <RenderBlockContent block={block} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Right panel — Settings                                             */
/* ------------------------------------------------------------------ */

function EditorSettingsPanel({
  block,
  onChange,
}: {
  block: EmailBlock | null;
  onChange: (id: string, content: Record<string, unknown>) => void;
}) {
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#555]">
        Selecciona un bloque para editar
      </div>
    );
  }

  const c = block.content as Record<string, unknown>;
  const update = (patch: Record<string, unknown>) =>
    onChange(block.id, { ...c, ...patch });

  const inputClass =
    "w-full rounded-md border border-[#2e2e2e] bg-[#232323] px-3 py-2 text-sm text-[#ededed] outline-none focus:border-[#3ecf8e]/60 transition-colors";

  return (
    <div className="flex flex-col gap-5">
      <span className="text-xs font-medium uppercase tracking-wider text-[#666]">
        {block.type.replace("-", " ")}
      </span>

      {/* TEXT settings */}
      {block.type === "text" && (
        <>
          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            Tamano de fuente
            <input
              type="range"
              min={10}
              max={32}
              value={(c.fontSize as number) ?? 16}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="accent-[#3ecf8e]"
            />
            <span className="text-[#ededed] text-sm">
              {(c.fontSize as number) ?? 16}px
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            Alineacion
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((a) => {
                const AlignIcon =
                  a === "left"
                    ? AlignLeft
                    : a === "center"
                      ? AlignCenter
                      : AlignRight;
                return (
                  <button
                    key={a}
                    onClick={() => update({ align: a })}
                    className={`flex h-8 w-10 items-center justify-center rounded-md border text-sm transition-colors ${
                      c.align === a
                        ? "border-[#3ecf8e] bg-[#3ecf8e]/10 text-[#3ecf8e]"
                        : "border-[#2e2e2e] text-[#888] hover:border-[#555]"
                    }`}
                  >
                    <AlignIcon size={14} />
                  </button>
                );
              })}
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            Color del texto
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(c.color as string) ?? "#333333"}
                onChange={(e) => update({ color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded border-none bg-transparent"
              />
              <span className="text-sm text-[#ededed]">
                {(c.color as string) ?? "#333333"}
              </span>
            </div>
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => update({ bold: !c.bold })}
              className={`flex h-9 w-10 items-center justify-center rounded-md border text-sm transition-colors ${
                c.bold
                  ? "border-[#3ecf8e] bg-[#3ecf8e]/10 text-[#3ecf8e]"
                  : "border-[#2e2e2e] text-[#888] hover:border-[#555]"
              }`}
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => update({ italic: !c.italic })}
              className={`flex h-9 w-10 items-center justify-center rounded-md border text-sm transition-colors ${
                c.italic
                  ? "border-[#3ecf8e] bg-[#3ecf8e]/10 text-[#3ecf8e]"
                  : "border-[#2e2e2e] text-[#888] hover:border-[#555]"
              }`}
            >
              <Italic size={14} />
            </button>
          </div>
        </>
      )}

      {/* BUTTON settings */}
      {block.type === "button" && (
        <>
          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            Texto del boton
            <input
              className={inputClass}
              value={(c.text as string) ?? ""}
              onChange={(e) => update({ text: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            Color
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(c.color as string) ?? "#3ecf8e"}
                onChange={(e) => update({ color: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded border-none bg-transparent"
              />
              <span className="text-sm text-[#ededed]">
                {(c.color as string) ?? "#3ecf8e"}
              </span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            URL
            <input
              className={inputClass}
              value={(c.url as string) ?? ""}
              onChange={(e) => update({ url: e.target.value })}
              placeholder="https://..."
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            Border radius
            <input
              type="range"
              min={0}
              max={32}
              value={(c.borderRadius as number) ?? 8}
              onChange={(e) =>
                update({ borderRadius: Number(e.target.value) })
              }
              className="accent-[#3ecf8e]"
            />
            <span className="text-[#ededed] text-sm">
              {(c.borderRadius as number) ?? 8}px
            </span>
          </label>
        </>
      )}

      {/* IMAGE / HEADER IMAGE settings */}
      {(block.type === "image" || block.type === "header-image") && (
        <>
          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            URL de imagen
            <input
              className={inputClass}
              value={(c.url as string) ?? ""}
              onChange={(e) => update({ url: e.target.value })}
              placeholder="https://..."
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            Alt text
            <input
              className={inputClass}
              value={(c.alt as string) ?? ""}
              onChange={(e) => update({ alt: e.target.value })}
              placeholder="Descripcion de la imagen"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-[#888]">
            Ancho (%)
            <input
              type="range"
              min={20}
              max={100}
              value={(c.width as number) ?? 100}
              onChange={(e) => update({ width: Number(e.target.value) })}
              className="accent-[#3ecf8e]"
            />
            <span className="text-[#ededed] text-sm">
              {(c.width as number) ?? 100}%
            </span>
          </label>
        </>
      )}

      {/* Fallback for types without settings */}
      {!["text", "button", "image", "header-image"].includes(block.type) && (
        <p className="text-xs text-[#555] leading-relaxed">
          No hay opciones de configuracion disponibles para este tipo de bloque.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared page components                                             */
/* ------------------------------------------------------------------ */

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[20px] font-semibold text-[#ededed]">{title}</h1>
        {description && <p className="text-[13px] text-[#888] mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Badge({ text, color = "#3ecf8e" }: { text: string; color?: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + "20", color }}>
      {text}
    </span>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-[#888]">{label}</span>
        <span className="text-[#555]">{icon}</span>
      </div>
      <span className="text-[22px] font-semibold text-[#ededed]">{value}</span>
    </div>
  );
}

export function EmailCampanasPage() {
  const { data: campaigns, isLoading } = trpc.emailCampaigns.list.useQuery();

  const statusColors: Record<string, string> = { sent: "#3ecf8e", scheduled: "#f59e0b", active: "#6366f1", draft: "#888" };
  const statusLabels: Record<string, string> = { sent: "Enviado", scheduled: "Programado", active: "Activo", draft: "Borrador" };

  const totalSent = campaigns?.reduce((acc, c) => {
    const stats = c.stats as Record<string, number> | null;
    return acc + (stats?.sent ?? 0);
  }, 0) ?? 0;

  const totalOpened = campaigns?.reduce((acc, c) => {
    const stats = c.stats as Record<string, number> | null;
    return acc + (stats?.opened ?? 0);
  }, 0) ?? 0;

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";

  return (
    <>
      <SectionHeader
        title="Campanas de Email"
        description="Gestiona tus campanas de email marketing"
        action={
          <button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} />
            Nueva campana
          </button>
        }
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Emails enviados" value={totalSent.toLocaleString()} icon={<Send size={16} />} />
        <StatCard label="Tasa de apertura" value={`${openRate}%`} icon={<Eye size={16} />} />
        <StatCard label="Campanas" value={String(campaigns?.length ?? 0)} icon={<MousePointerClick size={16} />} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg border border-[#2e2e2e] animate-pulse" style={{ backgroundColor: "#1e1e1e" }} />
          ))}
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Mail size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">No hay campanas aun. Crea tu primera campana.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#1e1e1e" }}>
                {["Campana", "Plantilla", "Estado", "Enviados", "Apertura", "Fecha"].map((h) => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const stats = c.stats as Record<string, number> | null;
                const sent = stats?.sent ?? 0;
                const opened = stats?.opened ?? 0;
                const rate = sent > 0 ? ((opened / sent) * 100).toFixed(1) + "%" : "-";
                return (
                  <tr key={c.id} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-[13px] text-[#ededed] font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-[13px] text-[#ccc]">{c.templateName}</td>
                    <td className="px-4 py-3"><Badge text={statusLabels[c.status] ?? c.status} color={statusColors[c.status] ?? "#888"} /></td>
                    <td className="px-4 py-3 text-[13px] text-[#ccc]">{sent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px] text-[#ccc]">{rate}</td>
                    <td className="px-4 py-3 text-[13px] text-[#888]">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function PlantillasEmailPage() {
  const { data: templates, isLoading } = trpc.emailTemplates.list.useQuery();

  return (
    <>
      <SectionHeader
        title="Plantillas"
        description="Plantillas de email reutilizables"
        action={
          <button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} />
            Nueva plantilla
          </button>
        }
      />
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg border border-[#2e2e2e] animate-pulse" style={{ backgroundColor: "#1e1e1e" }} />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Mail size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">No hay plantillas aun. Crea tu primera plantilla.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border border-[#2e2e2e] p-4 hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="w-full h-24 rounded mb-3 flex items-center justify-center" style={{ backgroundColor: "#252525" }}>
                <Mail size={24} className="text-[#555]" />
              </div>
              <p className="text-[13px] font-medium text-[#ededed]">{t.name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-[#888]">{t.subject}</span>
                <span className="text-[11px] text-[#888]">{new Date(t.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function SecuenciasEmailPage() {
  const { data: sequences, isLoading } = trpc.sequences.list.useQuery();

  return (
    <>
      <SectionHeader title="Secuencias" description="Secuencias automatizadas de emails" />
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-[#2e2e2e] animate-pulse" style={{ backgroundColor: "#1e1e1e" }} />
          ))}
        </div>
      ) : !sequences || sequences.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-8 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Mail size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">No hay secuencias aun. Crea tu primera secuencia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((s) => {
            const steps = (s.steps as Array<unknown>) ?? [];
            const enrolled = s._count?.enrollments ?? 0;
            return (
              <div key={s.id} className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-medium text-[#ededed]">{s.name}</h3>
                    <Badge text={s.isActive ? "Activa" : "Pausada"} color={s.isActive ? "#3ecf8e" : "#f59e0b"} />
                  </div>
                  <span className="text-[12px] text-[#888]">{enrolled} contactos inscritos</span>
                </div>
                <p className="text-[11px] text-[#888]">{steps.length} paso{steps.length !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export function EditorEmailPage() {
  const [blocks, setBlocks] = useState<EmailBlock[]>(DEFAULT_BLOCKS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subject, setSubject] = useState(
    "Ofertas exclusivas para ti, {{nombre}}"
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  /* ---- helpers ---- */

  let nextIdCounter = blocks.length + 1;
  const genId = () => `block-${++nextIdCounter}-${Date.now()}`;

  const handleBlockChange = useCallback(
    (id: string, content: Record<string, unknown>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content } : b))
      );
    },
    []
  );

  const handleDelete = useCallback(
    (id: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId]
  );

  /* ---- DnD handlers ---- */

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as
      | { origin?: string; type?: BlockType }
      | undefined;

    // Dropping from palette -> add new block
    if (activeData?.origin === "palette" && activeData.type) {
      const newBlock: EmailBlock = {
        id: genId(),
        type: activeData.type,
        content:
          activeData.type === "text"
            ? {
                text: "Texto de ejemplo",
                fontSize: 16,
                align: "left",
                color: "#333333",
                bold: false,
                italic: false,
              }
            : activeData.type === "button"
              ? {
                  text: "Click aqui",
                  color: "#3ecf8e",
                  url: "",
                  borderRadius: 8,
                }
              : {},
      };

      // Insert near drop target
      const overIndex = blocks.findIndex((b) => b.id === over.id);
      if (overIndex !== -1) {
        const next = [...blocks];
        next.splice(overIndex + 1, 0, newBlock);
        setBlocks(next);
      } else {
        setBlocks((prev) => [...prev, newBlock]);
      }
      return;
    }

    // Reorder within canvas
    if (active.id !== over.id) {
      setBlocks((prev) => {
        const oldIdx = prev.findIndex((b) => b.id === active.id);
        const newIdx = prev.findIndex((b) => b.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <>
      {/* ====== SUBJECT BAR ====== */}
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-base font-semibold tracking-tight whitespace-nowrap text-[#ededed]">
          Email Builder
        </h1>

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        {/* Subject */}
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs text-[#666] whitespace-nowrap">
            Asunto:
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 rounded-md border border-[#2e2e2e] bg-[#232323] px-3 py-1.5 text-sm text-[#ededed] outline-none focus:border-[#3ecf8e]/60 transition-colors"
          />
        </div>

        <div className="mx-2 h-5 w-px bg-[#2e2e2e]" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md border border-[#3ecf8e]/40 bg-[#3ecf8e]/10 px-3 py-1.5 text-sm text-[#3ecf8e] hover:bg-[#3ecf8e]/20 transition-colors">
            <Sparkles size={14} />
            Generar con IA
          </button>
          <button
            disabled
            className="flex items-center gap-1.5 rounded-md border border-[#2e2e2e] px-3 py-1.5 text-sm text-[#666] cursor-not-allowed"
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            disabled
            className="flex items-center gap-1.5 rounded-md border border-[#2e2e2e] px-3 py-1.5 text-sm text-[#666] cursor-not-allowed"
          >
            <Send size={14} />
            Enviar
          </button>
        </div>
      </div>

      {/* ====== MAIN THREE-COLUMN LAYOUT ====== */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex overflow-hidden rounded-lg border border-[#2e2e2e]" style={{ height: "calc(100vh - 180px)" }}>
          {/* ------ LEFT PANEL: Palette ------ */}
          <aside className="flex w-[200px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-[#2e2e2e] bg-[#1c1c1c] p-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#666]">
              Bloques
            </h2>

            <SortableContext
              items={PALETTE.map((p) => `palette-${p.type}`)}
              strategy={verticalListSortingStrategy}
            >
              {PALETTE.map((p) => (
                <PaletteItem key={p.type} {...p} />
              ))}
            </SortableContext>
          </aside>

          {/* ------ CENTER: Canvas ------ */}
          <main
            className="flex flex-1 justify-center overflow-y-auto bg-[#111] p-8"
            onClick={() => setSelectedId(null)}
          >
            <div
              className="relative w-full max-w-[600px] rounded-lg bg-[#f5f5f5] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Email canvas inner */}
              <div className="flex flex-col gap-0.5 p-1">
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      selected={block.id === selectedId}
                      onSelect={setSelectedId}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>

                {blocks.length === 0 && (
                  <div className="flex h-[300px] items-center justify-center text-gray-400 text-sm">
                    Arrastra bloques aqui para comenzar
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* ------ RIGHT PANEL: Settings ------ */}
          <aside className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-l border-[#2e2e2e] bg-[#1c1c1c] p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#666]">
              Configuracion
            </h2>
            <EditorSettingsPanel block={selectedBlock} onChange={handleBlockChange} />
          </aside>
        </div>

        {/* Drag overlay (ghost while dragging) */}
        <DragOverlay>
          {activeId ? (
            <div className="rounded-md border border-[#3ecf8e]/40 bg-[#232323] px-4 py-2 text-sm text-[#ccc] shadow-xl">
              {(() => {
                // Palette item overlay
                if (activeId.toString().startsWith("palette-")) {
                  const type = activeId
                    .toString()
                    .replace("palette-", "") as BlockType;
                  const found = PALETTE.find((p) => p.type === type);
                  if (found) {
                    const PaletteIcon = found.icon;
                    return (
                      <span className="flex items-center gap-2">
                        <PaletteIcon size={14} /> {found.label}
                      </span>
                    );
                  }
                }
                // Canvas block overlay
                const block = blocks.find((b) => b.id === activeId);
                if (block) {
                  return (
                    <div className="max-w-[400px] overflow-hidden rounded bg-white">
                      <RenderBlockContent block={block} />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

export function PreviewEmailPage() {
  return (
    <>
      <SectionHeader title="Previsualizacion" description="Vista previa de tus emails en diferentes dispositivos" />
      <div className="flex gap-4">
        <div className="flex-1 rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] text-center mb-3">Desktop</p>
          <div className="w-full h-[400px] rounded border border-[#333] flex items-center justify-center" style={{ backgroundColor: "#252525" }}>
            <Eye size={32} className="text-[#555]" />
          </div>
        </div>
        <div className="w-[200px] rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <p className="text-[11px] text-[#888] text-center mb-3">Mobile</p>
          <div className="w-full h-[400px] rounded border border-[#333] flex items-center justify-center" style={{ backgroundColor: "#252525" }}>
            <Eye size={24} className="text-[#555]" />
          </div>
        </div>
      </div>
    </>
  );
}

export function EmailMetricPage({ metric }: { metric: string }) {
  return (
    <>
      <SectionHeader title={metric} description={`Metricas detalladas de ${metric.toLowerCase()}`} />
      <div className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-center" style={{ backgroundColor: "#1e1e1e", height: 300 }}>
        <div className="text-center">
          <Mail size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">Grafico de {metric.toLowerCase()} por campana</p>
        </div>
      </div>
    </>
  );
}
