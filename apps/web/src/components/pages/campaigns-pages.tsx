"use client";

import { Plus, Search, Play, Pause, TrendingUp, BarChart3, Sparkles, Calendar, Image } from "lucide-react";

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

export function TodasCampanasPage() {
  const campaigns = [
    { name: "Promo Marzo 2026", platform: "Meta Ads", status: "active", spend: "$450", impressions: "52K", ctr: "2.8%", conversions: 34 },
    { name: "Lead Gen Costa Rica", platform: "Google Ads", status: "active", spend: "$320", impressions: "38K", ctr: "3.1%", conversions: 28 },
    { name: "Brand Awareness Q1", platform: "TikTok Ads", status: "paused", spend: "$180", impressions: "95K", ctr: "1.2%", conversions: 12 },
    { name: "Retargeting Febrero", platform: "Meta Ads", status: "completed", spend: "$600", impressions: "120K", ctr: "4.5%", conversions: 67 },
    { name: "Holiday Sale", platform: "Google Ads", status: "completed", spend: "$890", impressions: "75K", ctr: "3.8%", conversions: 52 },
  ];

  const statusColors: Record<string, string> = { active: "#3ecf8e", paused: "#f59e0b", completed: "#888" };
  const statusLabels: Record<string, string> = { active: "Activa", paused: "Pausada", completed: "Finalizada" };

  return (
    <>
      <SectionHeader
        title="Todas las Campanas"
        description={`${campaigns.length} campanas`}
        action={
          <button className="flex items-center gap-1.5 text-[12px] text-black px-3 py-1.5 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
            <Plus size={14} />
            Crear campana
          </button>
        }
      />
      <div className="rounded-lg border border-[#2e2e2e] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "#1e1e1e" }}>
              {["Campana", "Plataforma", "Estado", "Gasto", "Impresiones", "CTR", "Conversiones"].map((h) => (
                <th key={h} className="text-left text-[11px] uppercase tracking-wider text-[#888] font-medium px-4 py-3 border-b border-[#2e2e2e]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i} className="border-b border-[#2e2e2e] last:border-0 hover:bg-[#1e1e1e] transition-colors cursor-pointer">
                <td className="px-4 py-3 text-[13px] text-[#ededed] font-medium">{c.name}</td>
                <td className="px-4 py-3 text-[13px] text-[#888]">{c.platform}</td>
                <td className="px-4 py-3"><Badge text={statusLabels[c.status] ?? c.status} color={statusColors[c.status] ?? "#888"} /></td>
                <td className="px-4 py-3 text-[13px] text-[#ccc]">{c.spend}</td>
                <td className="px-4 py-3 text-[13px] text-[#ccc]">{c.impressions}</td>
                <td className="px-4 py-3 text-[13px] text-[#ccc]">{c.ctr}</td>
                <td className="px-4 py-3 text-[13px] text-[#3ecf8e] font-medium">{c.conversions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CrearCampanaPage() {
  return (
    <>
      <SectionHeader title="Crear Campana" description="Configura una nueva campana publicitaria" />
      <div className="max-w-2xl space-y-4">
        {[
          { label: "Nombre de la campana", placeholder: "Ej: Promo Semana Santa 2026" },
          { label: "Plataforma", placeholder: "Seleccionar plataforma", type: "select" },
          { label: "Presupuesto diario", placeholder: "$0.00" },
          { label: "Objetivo", placeholder: "Seleccionar objetivo", type: "select" },
        ].map((f) => (
          <div key={f.label}>
            <label className="text-[12px] text-[#888] block mb-1.5">{f.label}</label>
            <input
              placeholder={f.placeholder}
              className="w-full h-[38px] px-3 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none focus:border-[#3ecf8e]"
              style={{ backgroundColor: "#222" }}
            />
          </div>
        ))}
        <button className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded font-medium mt-4" style={{ backgroundColor: "#3ecf8e" }}>
          Crear campana
        </button>
      </div>
    </>
  );
}

export function PlatformAdsPage({ platform }: { platform: string }) {
  const metrics = [
    { label: "Gasto Total", value: platform === "Meta Ads" ? "$1,200" : platform === "Google Ads" ? "$980" : "$750" },
    { label: "Impresiones", value: platform === "Meta Ads" ? "125K" : platform === "Google Ads" ? "98K" : "210K" },
    { label: "CTR", value: platform === "Meta Ads" ? "2.6%" : platform === "Google Ads" ? "2.9%" : "2.4%" },
    { label: "ROAS", value: platform === "Meta Ads" ? "4.1x" : platform === "Google Ads" ? "3.8x" : "2.9x" },
  ];

  return (
    <>
      <SectionHeader title={platform} description={`Rendimiento de ${platform}`} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <p className="text-[11px] text-[#888] mb-1">{m.label}</p>
            <p className="text-[20px] font-semibold text-[#ededed]">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[#2e2e2e] p-4 flex items-center justify-center" style={{ backgroundColor: "#1e1e1e", height: 300 }}>
        <div className="text-center">
          <BarChart3 size={32} className="text-[#555] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">Grafico de rendimiento</p>
          <p className="text-[11px] text-[#666]">Conecta tu cuenta para ver datos en tiempo real</p>
        </div>
      </div>
    </>
  );
}

export function GeneradorCopyPage() {
  return (
    <>
      <SectionHeader title="Generador de Copy IA" description="Genera texto publicitario con inteligencia artificial" />
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="text-[12px] text-[#888] block mb-1.5">Tipo de contenido</label>
          <div className="flex gap-2">
            {["Ad Copy", "Email", "Social Post", "Landing Page"].map((t) => (
              <button key={t} className="text-[12px] px-3 py-1.5 rounded border border-[#333] text-[#ccc] hover:border-[#3ecf8e]/40 transition-colors">{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[12px] text-[#888] block mb-1.5">Describe tu producto o servicio</label>
          <textarea
            placeholder="Ej: Somos una agencia de marketing digital en Costa Rica que ayuda a PYMEs a crecer..."
            className="w-full h-24 px-3 py-2 rounded-lg border border-[#333] text-[13px] text-[#ededed] placeholder:text-[#555] outline-none resize-none focus:border-[#3ecf8e]"
            style={{ backgroundColor: "#222" }}
          />
        </div>
        <button className="flex items-center gap-1.5 text-[12px] text-black px-4 py-2 rounded font-medium" style={{ backgroundColor: "#3ecf8e" }}>
          <Sparkles size={14} />
          Generar copy
        </button>
      </div>
    </>
  );
}

export function CreativosPage() {
  return (
    <>
      <SectionHeader title="Creativos" description="Biblioteca de imagenes y videos publicitarios" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[#2e2e2e] aspect-square flex items-center justify-center" style={{ backgroundColor: "#1e1e1e" }}>
            <Image size={24} className="text-[#555]" />
          </div>
        ))}
      </div>
    </>
  );
}

export function CalendarioPage() {
  const days = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  return (
    <>
      <SectionHeader title="Calendario" description="Calendario de campanas y contenido" />
      <div className="rounded-lg border border-[#2e2e2e] p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-[#ededed]">Marzo 2026</h3>
          <div className="flex gap-2">
            <button className="text-[12px] px-2 py-1 rounded text-[#888] hover:text-[#ededed]">&larr;</button>
            <button className="text-[12px] px-2 py-1 rounded text-[#888] hover:text-[#ededed]">&rarr;</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <div key={d} className="text-center text-[11px] text-[#888] py-2">{d}</div>
          ))}
          {Array.from({ length: 31 }).map((_, i) => (
            <div
              key={i}
              className={`text-center text-[12px] py-2 rounded cursor-pointer transition-colors ${
                i === 14 ? "text-[#ededed] font-medium" : "text-[#888] hover:bg-[#2a2a2a]"
              }`}
              style={i === 14 ? { backgroundColor: "#3ecf8e20" } : {}}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
