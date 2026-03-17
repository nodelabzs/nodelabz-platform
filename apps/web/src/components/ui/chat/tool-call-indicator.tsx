"use client";

import { Loader2, Check, AlertCircle } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  "crm.get_contacts": "Consultando contactos",
  "crm.get_deals": "Consultando deals",
  "crm.get_pipeline_summary": "Consultando pipeline",
  "marketing.get_campaign_metrics": "Consultando campanas",
  "marketing.get_channel_performance": "Comparando canales",
  "analytics.run_query": "Ejecutando consulta",
  "analytics.get_health_score": "Calculando health score",
  "analytics.calculate_metric": "Calculando metrica",
  "email.get_email_performance": "Consultando emails",
  "automation.get_workflows": "Consultando workflows",
  "automation.trigger_workflow": "Ejecutando workflow",
};

function getToolLabel(name: string): string {
  return TOOL_LABELS[name] || `Ejecutando ${name.split(".").pop()}`;
}

export function ToolCallIndicator({
  toolCalls,
}: {
  toolCalls: { name: string; status: string; result?: string }[];
}) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 my-1">
      {toolCalls.map((tc) => (
        <div
          key={tc.name}
          className="flex items-center gap-1.5 text-[11px] text-[#888] px-2 py-1 rounded"
          style={{ backgroundColor: "#252525" }}
        >
          {tc.status === "executing" && (
            <Loader2 size={11} className="animate-spin text-[#f59e0b]" />
          )}
          {tc.status === "completed" && (
            <Check size={11} className="text-[#3ecf8e]" />
          )}
          {tc.status === "error" && (
            <AlertCircle size={11} className="text-[#ef4444]" />
          )}
          <span>{getToolLabel(tc.name)}</span>
        </div>
      ))}
    </div>
  );
}
