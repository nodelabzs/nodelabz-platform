"use client";

import React, { useCallback, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Users,
  Building2,
  Upload,
  GitBranch,
  Handshake,
  Activity,
  Tags,
  List,
  Sparkles,
  Search,
  Plus,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

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

const LABEL_COLORS: Record<string, string> = { HOT: "#ef4444", WARM: "#f59e0b", COLD: "#6366f1" };

export function TodosContactosPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [scoreFilter, setScoreFilter] = useState<string | undefined>();
  const { data, isLoading } = trpc.contacts.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
    scoreLabel: scoreFilter as "HOT" | "WARM" | "COLD" | undefined,
  });

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <SectionHeader
        title="Todos los Contactos"
        description={`${total} contactos en tu base de datos`}
        action={
          <button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} />
            Agregar contacto
          </button>
        }
      />
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 h-[36px] px-3 rounded-lg border border-[#333]" style={{ backgroundColor: "#222" }}>
          <Search size={14} className="text-[#666]" />
          <input
            placeholder="Buscar contactos..."
            className="flex-1 bg-transparent text-[13px] text-[#ededed] placeholder:text-[#555] outline-none"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {(["HOT", "WARM", "COLD"] as const).map((label) => (
          <button
            key={label}
            onClick={() => { setScoreFilter(scoreFilter === label ? undefined : label); setPage(1); }}
            className="text-[12px] px-3 py-2 rounded border transition-colors"
            style={{
              borderColor: scoreFilter === label ? LABEL_COLORS[label] : "#333",
              color: scoreFilter === label ? LABEL_COLORS[label] : "#ccc",
              backgroundColor: scoreFilter === label ? LABEL_COLORS[label] + "15" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => { setScoreFilter(undefined); setPage(1); }}
          className="text-[12px] px-3 py-2 rounded border transition-colors"
          style={{
            borderColor: !scoreFilter ? "#3ecf8e" : "#333",
            color: !scoreFilter ? "#3ecf8e" : "#ccc",
          }}
        >
          All
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#2e2e2e] last:border-0" style={{ backgroundColor: "#1e1e1e" }}>
                <div className="h-4 w-28 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-36 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-20 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-12 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-14 rounded bg-[#2a2a2a] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Users size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">No tienes contactos</p>
          <p className="text-[12px] text-[#888]">Importa tu primer contacto.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#1e1e1e" }}>
                {["Nombre", "Email", "Telefono", "Empresa", "Score", "Tags"].map((h) => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-[13px] text-[#ededed] font-medium">
                    {c.firstName} {c.lastName ?? ""}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#888]">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-[#888]">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-[#ccc]">{c.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${c.score}%`, backgroundColor: c.score >= 80 ? "#3ecf8e" : c.score >= 50 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <Badge text={c.scoreLabel} color={LABEL_COLORS[c.scoreLabel] ?? "#888"} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} text={tag} color="#6366f1" />
                      ))}
                      {c.tags.length > 3 && <span className="text-[10px] text-[#888]">+{c.tags.length - 3}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[12px] text-[#888]">
            Pagina {page} de {totalPages} ({total} contactos)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function EmpresasPage() {
  const companies = [
    { name: "TechCR", contacts: 3, deals: 2, value: "$8,500" },
    { name: "StartupCo", contacts: 1, deals: 1, value: "$3,200" },
    { name: "RetailPlus", contacts: 2, deals: 3, value: "$12,000" },
    { name: "ConsultCR", contacts: 1, deals: 0, value: "$0" },
    { name: "HotelSJO", contacts: 2, deals: 1, value: "$5,600" },
  ];

  return (
    <>
      <SectionHeader title="Empresas" description="Empresas asociadas a tus contactos" />
      <div className="grid grid-cols-1 gap-3">
        {companies.map((c) => (
          <div key={c.name} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[14px] font-bold text-[#ededed]" style={{ backgroundColor: "#2a2a2a" }}>
                {c.name[0]}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#ededed]">{c.name}</p>
                <p className="text-[11px] text-[#888]">{c.contacts} contactos · {c.deals} deals</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-medium text-[#ededed]">{c.value}</span>
              <ChevronRight size={16} className="text-[#555]" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ImportarContactosPage() {
  return (
    <>
      <SectionHeader title="Importar Contactos" description="Importa contactos desde archivo CSV o plataformas conectadas" />
      <div className="grid grid-cols-2 gap-4">
        <button className="rounded-lg border border-dashed border-[#333] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors" style={{ backgroundColor: "#1e1e1e" }}>
          <Upload size={32} className="text-[#888] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Subir archivo CSV</p>
          <p className="text-[12px] text-[#888]">Arrastra o selecciona tu archivo</p>
        </button>
        <button className="rounded-lg border border-dashed border-[#333] p-8 text-center hover:border-[#3ecf8e]/40 transition-colors" style={{ backgroundColor: "#1e1e1e" }}>
          <ArrowUpRight size={32} className="text-[#888] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Desde plataforma</p>
          <p className="text-[12px] text-[#888]">Importar desde Meta, Google, etc.</p>
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — Types                                          */
/* ------------------------------------------------------------------ */

interface PipelineStageData {
  [key: string]: unknown;
  label: string;
  dealCount: number;
  totalValue: number;
  color: string;
  barData: [number, number, number];
}

type StageNodeType = Node<PipelineStageData>;

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — Palette                                        */
/* ------------------------------------------------------------------ */

const PC = {
  bg: "#171717",
  card: "#1c1c1c",
  cardHover: "#222222",
  border: "#2e2e2e",
  text: "#ededed",
  textMuted: "#888888",
  accent: "#3ecf8e",
  blue: "#3b82f6",
  cyan: "#22d3ee",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  green: "#22c55e",
} as const;

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — Helpers                                        */
/* ------------------------------------------------------------------ */

function pipelineFmtFull(n: number) {
  return `$${n.toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — Mini Bar Chart (pure SVG)                      */
/* ------------------------------------------------------------------ */

function PipelineMiniBarChart({
  data,
  color,
}: {
  data: [number, number, number];
  color: string;
}) {
  const max = Math.max(...data, 1);
  const labels = ["0-7d", "7-14d", "14+d"];
  const barW = 28;
  const gap = 8;
  const h = 36;
  const totalW = labels.length * barW + (labels.length - 1) * gap;

  return (
    <svg
      width={totalW}
      height={h + 16}
      viewBox={`0 0 ${totalW} ${h + 16}`}
      style={{ display: "block", margin: "0 auto" }}
    >
      {data.map((v, i) => {
        const barH = (v / max) * h;
        const x = i * (barW + gap);
        return (
          <g key={i}>
            <rect
              x={x}
              y={h - barH}
              width={barW}
              height={barH}
              rx={3}
              fill={color}
              opacity={0.7 + (i === 0 ? 0.3 : i === 1 ? 0.15 : 0)}
            />
            <text
              x={x + barW / 2}
              y={h + 12}
              textAnchor="middle"
              fontSize="8"
              fill={PC.textMuted}
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — StageNode                                      */
/* ------------------------------------------------------------------ */

function PipelineStageNode({ data }: NodeProps<StageNodeType>) {
  return (
    <div
      style={{
        width: 200,
        background: PC.card,
        border: `1px solid ${PC.border}`,
        borderRadius: 12,
        overflow: "hidden",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          height: 4,
          background: data.color,
          borderRadius: "12px 12px 0 0",
        }}
      />
      <div style={{ padding: "14px 16px 16px" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: PC.text,
            marginBottom: 8,
            letterSpacing: "0.01em",
          }}
        >
          {data.label}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span
            style={{ fontSize: 28, fontWeight: 700, color: data.color }}
          >
            {data.dealCount}
          </span>
          <span style={{ fontSize: 12, color: PC.textMuted }}>deals</span>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: PC.text,
            marginBottom: 14,
          }}
        >
          {pipelineFmtFull(data.totalValue)}
        </div>
        <PipelineMiniBarChart data={data.barData} color={data.color} />
      </div>
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          background: PC.border,
          border: "none",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 8,
          height: 8,
          background: PC.border,
          border: "none",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — Deal Card (side panel)                         */
/* ------------------------------------------------------------------ */

interface PipelineDeal {
  company: string;
  value: number;
  daysInStage: number;
  owner: string;
  initials: string;
  avatarColor: string;
}

function PipelineDealCard({ deal }: { deal: PipelineDeal }) {
  const urgent = deal.daysInStage > 10;
  return (
    <div
      style={{
        background: PC.card,
        border: `1px solid ${PC.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: deal.avatarColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {deal.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: PC.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {deal.company}
        </div>
        <div style={{ fontSize: 12, color: PC.textMuted, marginTop: 2 }}>
          {pipelineFmtFull(deal.value)}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: urgent ? PC.orange : PC.textMuted,
          background: urgent ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.04)",
          padding: "3px 8px",
          borderRadius: 6,
          whiteSpace: "nowrap",
        }}
      >
        {deal.daysInStage}d
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — Static Data                                    */
/* ------------------------------------------------------------------ */

const pipelineStages: PipelineStageData[] = [
  { label: "Nuevo", dealCount: 42, totalValue: 126000, color: PC.blue, barData: [24, 12, 6] },
  { label: "Contactado", dealCount: 28, totalValue: 84000, color: PC.cyan, barData: [14, 9, 5] },
  { label: "Calificado", dealCount: 15, totalValue: 67500, color: PC.yellow, barData: [5, 5, 5] },
  { label: "Propuesta", dealCount: 8, totalValue: 52000, color: PC.orange, barData: [4, 3, 1] },
  { label: "Negociacion", dealCount: 5, totalValue: 38000, color: PC.purple, barData: [2, 2, 1] },
  { label: "Cerrado Ganado", dealCount: 3, totalValue: 24000, color: PC.green, barData: [2, 1, 0] },
];

const pipelineConversionRates = ["67%", "54%", "53%", "63%", "60%"];

const pipelineMockDeals: PipelineDeal[] = [
  { company: "TechCorp Solutions", value: 12000, daysInStage: 14, owner: "Ana M.", initials: "AM", avatarColor: PC.purple },
  { company: "DataFlow Inc.", value: 8500, daysInStage: 7, owner: "Carlos R.", initials: "CR", avatarColor: PC.blue },
  { company: "Grupo Inversiones CR", value: 6000, daysInStage: 11, owner: "Luis P.", initials: "LP", avatarColor: PC.cyan },
  { company: "SaaS Dynamics", value: 7500, daysInStage: 3, owner: "Maria V.", initials: "MV", avatarColor: PC.orange },
  { company: "Central Logistica", value: 4000, daysInStage: 18, owner: "Pedro G.", initials: "PG", avatarColor: PC.green },
];

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — Nodes & Edges                                  */
/* ------------------------------------------------------------------ */

const PIPELINE_GAP_X = 280;
const PIPELINE_START_X = 40;
const PIPELINE_Y = 120;

const pipelineInitialNodes: StageNodeType[] = pipelineStages.map((s, i) => ({
  id: `stage-${i}`,
  type: "stage",
  position: { x: PIPELINE_START_X + i * PIPELINE_GAP_X, y: PIPELINE_Y },
  data: s,
  draggable: true,
}));

const pipelineInitialEdges: Edge[] = pipelineConversionRates.map((rate, i) => ({
  id: `e-${i}`,
  source: `stage-${i}`,
  target: `stage-${i + 1}`,
  type: "default",
  animated: true,
  label: rate,
  labelStyle: {
    fontSize: 11,
    fontWeight: 700,
    fill: PC.text,
  },
  labelBgPadding: [6, 4] as [number, number],
  labelBgBorderRadius: 6,
  labelBgStyle: {
    fill: "#2a2a2a",
    stroke: PC.border,
    strokeWidth: 1,
  },
  style: {
    stroke: PC.border,
    strokeWidth: 2,
  },
  markerEnd: {
    type: "arrowclosed" as const,
    color: PC.border,
    width: 16,
    height: 16,
  },
}));

const pipelineNodeTypes: NodeTypes = { stage: PipelineStageNode };

/* ------------------------------------------------------------------ */
/*  Pipeline Builder — Main Component                                 */
/* ------------------------------------------------------------------ */

export function PipelinePage() {
  const [nodes, , onNodesChange] = useNodesState(pipelineInitialNodes);
  const [edges, , onEdgesChange] = useEdgesState(pipelineInitialEdges);
  const { data: stats } = trpc.deals.getStats.useQuery();

  const liveSummaryStats = [
    { label: "Total Deals", value: stats ? String(stats.totalDeals) : "—" },
    { label: "Pipeline Value", value: stats ? `$${stats.totalValue.toLocaleString()}` : "—" },
    { label: "Win Rate", value: stats ? `${(stats.winRate * 100).toFixed(1)}%` : "—" },
    { label: "Avg Deal Size", value: stats ? `$${Math.round(stats.avgDealSize).toLocaleString()}` : "—" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: PC.text,
        overflow: "hidden",
      }}
    >
      {/* ---- Title Bar ---- */}
      <header
        style={{
          height: 56,
          borderBottom: `1px solid ${PC.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: PC.accent,
            }}
          />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Pipeline Builder
          </span>
          <span style={{ fontSize: 13, color: PC.textMuted }}>
            &mdash; Funnel de Ventas
          </span>
        </div>

        {/* Summary stats */}
        <div style={{ display: "flex", gap: 24 }}>
          {liveSummaryStats.map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", alignItems: "baseline", gap: 6 }}
            >
              <span style={{ fontSize: 11, color: PC.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {s.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ---- Body ---- */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* React Flow canvas */}
        <div style={{ flex: 1, height: "calc(100vh - 180px)" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={pipelineNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3}
            maxZoom={1.5}
            colorMode="dark"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#2a2a2a"
            />
            <Controls
              showInteractive={false}
              style={{
                borderRadius: 10,
                border: `1px solid ${PC.border}`,
                overflow: "hidden",
              }}
            />
          </ReactFlow>
        </div>

        {/* ---- Right Panel ---- */}
        <aside
          style={{
            width: 300,
            borderLeft: `1px solid ${PC.border}`,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: "16px 20px 12px",
              borderBottom: `1px solid ${PC.border}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
              Deals en Negociacion
            </div>
            <div style={{ fontSize: 11, color: PC.textMuted }}>
              5 deals &middot; $38,000 total
            </div>
          </div>

          {/* Deal list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {pipelineMockDeals.map((deal) => (
              <PipelineDealCard key={deal.company} deal={deal} />
            ))}
          </div>

          {/* AI Suggestion */}
          <div
            style={{
              margin: "0 14px 14px",
              background: "rgba(62,207,142,0.06)",
              border: `1px solid rgba(62,207,142,0.18)`,
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: PC.accent,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              AI Insight
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "#ccc" }}>
              {"5 deals llevan mas de 14 dias en 'Calificado'. Recomiendo: crear secuencia de email de urgencia o moverlos a 'Perdido'."}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  nuevo: "#3b82f6",
  contactado: "#22d3ee",
  calificado: "#eab308",
  propuesta: "#f97316",
  negociacion: "#a855f7",
  won: "#22c55e",
  lost: "#ef4444",
};

function stageColor(stageId: string): string {
  return STAGE_COLORS[stageId.toLowerCase()] ?? "#888";
}

export function DealsPage() {
  const { data: deals, isLoading } = trpc.deals.list.useQuery({});

  return (
    <>
      <SectionHeader
        title="Deals"
        description={`${deals?.length ?? 0} deals activos`}
        action={
          <button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} />
            Nuevo deal
          </button>
        }
      />

      {isLoading ? (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#2e2e2e] last:border-0" style={{ backgroundColor: "#1e1e1e" }}>
                <div className="h-4 w-32 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-28 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-16 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-20 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-14 rounded bg-[#2a2a2a] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : !deals || deals.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Handshake size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">No hay deals</p>
          <p className="text-[12px] text-[#888]">Crea tu primer deal.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#1e1e1e" }}>
                {["Deal", "Contacto", "Valor", "Etapa", "Probabilidad", "Creado"].map((h) => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const prob = d.probability ?? 0;
                const value = d.value ? Number(d.value) : 0;
                const contactName = d.contact
                  ? `${d.contact.firstName} ${d.contact.lastName ?? ""}`.trim()
                  : "—";
                return (
                  <tr key={d.id} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-[13px] text-[#ededed] font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-[13px] text-[#888]">{contactName}</td>
                    <td className="px-4 py-3 text-[13px] text-[#3ecf8e] font-medium">${value.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge text={d.stageId} color={stageColor(d.stageId)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${prob}%`, backgroundColor: prob >= 70 ? "#3ecf8e" : prob >= 40 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                        <span className="text-[11px] text-[#888]">{prob}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#888]">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
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

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  email: "mail",
  call: "phone",
  note: "note",
  deal_created: "deal",
  deal_stage_changed: "move",
  deal_won: "win",
  deal_lost: "lost",
};

function activityTypeColor(type: string): string {
  if (type.includes("won")) return "#22c55e";
  if (type.includes("lost")) return "#ef4444";
  if (type.includes("deal")) return "#a855f7";
  if (type === "email") return "#3b82f6";
  if (type === "call") return "#22d3ee";
  return "#3ecf8e";
}

function formatRelativeTime(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString();
}

export function ActividadesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.activities.list.useQuery({ page, limit: 30 });

  const activities = data?.activities ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <>
      <SectionHeader title="Actividades" description={`${total} interacciones recientes`} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-[#2e2e2e] p-3 flex items-center gap-3" style={{ backgroundColor: "#1e1e1e" }}>
              <div className="w-5 h-5 rounded bg-[#2a2a2a] animate-pulse flex-shrink-0" />
              <div className="flex-1 flex gap-3">
                <div className="h-4 w-48 rounded bg-[#2a2a2a] animate-pulse" />
                <div className="h-4 w-24 rounded bg-[#2a2a2a] animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded bg-[#2a2a2a] animate-pulse" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-lg border border-[#2e2e2e] p-12 text-center" style={{ backgroundColor: "#1e1e1e" }}>
          <Activity size={32} className="text-[#555] mx-auto mb-3" />
          <p className="text-[14px] text-[#ededed] font-medium mb-1">Sin actividades recientes</p>
          <p className="text-[12px] text-[#888]">Las interacciones con contactos apareceran aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-lg border border-[#2e2e2e] p-3 flex items-center gap-3" style={{ backgroundColor: "#1e1e1e" }}>
              <Activity size={14} style={{ color: activityTypeColor(a.type) }} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#ededed] truncate">
                  <Badge text={a.type.replace(/_/g, " ")} color={activityTypeColor(a.type)} />
                  {a.subject && <span className="text-[#ccc] ml-2">{a.subject}</span>}
                </p>
              </div>
              <span className="text-[11px] text-[#666] flex-shrink-0">
                {formatRelativeTime(a.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[12px] text-[#888]">
            Pagina {page} de {totalPages} ({total} actividades)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function EtiquetasPage() {
  const tags = [
    { name: "VIP", count: 12, color: "#f59e0b" },
    { name: "Nuevo", count: 45, color: "#3ecf8e" },
    { name: "Inactivo", count: 23, color: "#ef4444" },
    { name: "Newsletter", count: 156, color: "#6366f1" },
    { name: "Evento 2026", count: 34, color: "#06b6d4" },
    { name: "Partner", count: 8, color: "#ec4899" },
  ];

  return (
    <>
      <SectionHeader
        title="Etiquetas"
        description="Organiza tus contactos con etiquetas"
        action={
          <button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} />
            Nueva etiqueta
          </button>
        }
      />
      <div className="grid grid-cols-3 gap-3">
        {tags.map((t) => (
          <div key={t.name} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center gap-2">
              <Tags size={14} style={{ color: t.color }} />
              <span className="text-[13px] text-[#ededed]">{t.name}</span>
            </div>
            <span className="text-[12px] text-[#888]">{t.count}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ListasInteligentesPage() {
  const lists = [
    { name: "Leads HOT sin contactar", count: 5, description: "Score > 80, sin actividad en 7 dias" },
    { name: "Clientes recurrentes", count: 18, description: "Mas de 2 compras en los ultimos 6 meses" },
    { name: "En riesgo de churn", count: 8, description: "Sin interaccion en 30 dias, deal abierto" },
    { name: "Nuevos esta semana", count: 23, description: "Creados en los ultimos 7 dias" },
  ];

  return (
    <>
      <SectionHeader title="Listas Inteligentes" description="Segmentos dinamicos basados en reglas" />
      <div className="space-y-3">
        {lists.map((l) => (
          <div key={l.name} className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-between hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center gap-3">
              <List size={16} className="text-[#6366f1]" />
              <div>
                <p className="text-[13px] font-medium text-[#ededed]">{l.name}</p>
                <p className="text-[11px] text-[#888]">{l.description}</p>
              </div>
            </div>
            <Badge text={`${l.count} contactos`} color="#6366f1" />
          </div>
        ))}
      </div>
    </>
  );
}

export function LeadScoringPage() {
  return (
    <>
      <SectionHeader title="Lead Scoring" description="Configuracion del scoring automatico de leads" />
      <div className="space-y-4">
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Reglas de Scoring</h3>
          <div className="space-y-2">
            {[
              { rule: "Abrio email", points: "+5" },
              { rule: "Visito pagina de precios", points: "+15" },
              { rule: "Descargo recurso", points: "+10" },
              { rule: "Solicito demo", points: "+25" },
              { rule: "Sin actividad 30 dias", points: "-10" },
            ].map((r) => (
              <div key={r.rule} className="flex items-center justify-between py-2 px-3 rounded" style={{ backgroundColor: "#252525" }}>
                <span className="text-[13px] text-[#ccc]">{r.rule}</span>
                <span className={`text-[13px] font-medium ${r.points.startsWith("+") ? "text-[#3ecf8e]" : "text-[#ef4444]"}`}>
                  {r.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
          <h3 className="text-[13px] font-medium text-[#ededed] mb-3">Umbrales</h3>
          <div className="flex gap-4">
            <div className="flex-1 text-center py-3 rounded" style={{ backgroundColor: "#252525" }}>
              <Badge text="HOT" color="#ef4444" />
              <p className="text-[12px] text-[#888] mt-2">Score &ge; 80</p>
            </div>
            <div className="flex-1 text-center py-3 rounded" style={{ backgroundColor: "#252525" }}>
              <Badge text="WARM" color="#f59e0b" />
              <p className="text-[12px] text-[#888] mt-2">50 &le; Score &lt; 80</p>
            </div>
            <div className="flex-1 text-center py-3 rounded" style={{ backgroundColor: "#252525" }}>
              <Badge text="COLD" color="#6366f1" />
              <p className="text-[12px] text-[#888] mt-2">Score &lt; 50</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
