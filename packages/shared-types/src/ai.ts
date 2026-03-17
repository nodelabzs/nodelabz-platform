import { z } from "zod";

// ============================
// CONTEXT & TOOLS MAPPING
// ============================

export const aiSectionEnum = z.enum([
  "dashboard",
  "contacts",
  "campaigns",
  "email",
  "whatsapp",
  "social",
  "automations",
  "reports",
  "integrations",
  "settings",
]);

export type AiSection = z.infer<typeof aiSectionEnum>;

export const SECTION_TOOLS: Record<AiSection, string[]> = {
  dashboard: ["analytics", "crm", "marketing"],
  contacts: ["crm"],
  campaigns: ["marketing", "analytics"],
  email: ["email"],
  whatsapp: ["whatsapp"],
  social: ["social"],
  automations: ["automation", "crm", "email", "whatsapp"],
  reports: ["analytics", "crm", "marketing", "email"],
  integrations: ["integrations"],
  settings: ["billing"],
};

export const SECTION_LABELS: Record<AiSection, string> = {
  dashboard: "Dashboard",
  contacts: "CRM",
  campaigns: "Marketing",
  email: "Email",
  whatsapp: "WhatsApp",
  social: "Social",
  automations: "Automatizaciones",
  reports: "Reportes",
  integrations: "Integraciones",
  settings: "Configuracion",
};

export const SECTION_SUGGESTIONS: Record<AiSection, string[]> = {
  dashboard: [
    "Cual es mi rendimiento general este mes?",
    "Muestra las metricas principales",
    "Cuantos leads nuevos tengo?",
  ],
  contacts: [
    "Cuantos leads HOT tengo?",
    "Muestra los contactos recientes",
    "Quienes son los leads mas valiosos?",
  ],
  campaigns: [
    "Cual campana tiene mejor ROAS?",
    "Compara el rendimiento por canal",
    "Muestra el gasto por plataforma",
  ],
  email: [
    "Cual es mi tasa de apertura?",
    "Muestra el rendimiento de emails",
    "Que templates tengo disponibles?",
  ],
  whatsapp: [
    "Cuantos mensajes enviamos hoy?",
    "Muestra las conversaciones activas",
  ],
  social: [
    "Como va el engagement en redes?",
    "Cual plataforma rinde mejor?",
  ],
  automations: [
    "Crea un workflow para leads HOT",
    "Muestra los workflows activos",
    "Automatiza seguimiento de leads frios",
  ],
  reports: [
    "Genera un reporte ejecutivo",
    "Muestra metricas de la semana",
    "Compara rendimiento mensual",
  ],
  integrations: [
    "Que plataformas tengo conectadas?",
    "Cual es el estado de sincronizacion?",
  ],
  settings: [
    "Cual es mi plan actual?",
    "Que funciones incluye mi plan?",
  ],
};

// ============================
// SSE EVENT TYPES
// ============================

export const sseTokenEventSchema = z.object({
  type: z.literal("token"),
  content: z.string(),
});

export const sseToolCallEventSchema = z.object({
  type: z.literal("tool_call"),
  name: z.string(),
  status: z.enum(["executing", "completed", "error"]),
  result: z.string().optional(),
});

export const chartTypeEnum = z.enum(["bar", "line", "pie", "stat"]);

export const chartArtifactSchema = z.object({
  type: z.literal("artifact"),
  artifactType: z.literal("chart"),
  payload: z.object({
    chartType: chartTypeEnum,
    title: z.string(),
    data: z.array(z.record(z.unknown())),
    xKey: z.string().optional(),
    yKey: z.string().optional(),
    keys: z.array(z.string()).optional(),
    colors: z.array(z.string()).optional(),
    stat: z.object({
      value: z.string(),
      label: z.string(),
      change: z.string().optional(),
      changeType: z.enum(["positive", "negative", "neutral"]).optional(),
    }).optional(),
  }),
});

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["trigger", "action", "condition", "delay"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string(),
    description: z.string().optional(),
    config: z.record(z.unknown()).optional(),
  }),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  label: z.string().optional(),
});

export const workflowArtifactSchema = z.object({
  type: z.literal("artifact"),
  artifactType: z.literal("workflow"),
  payload: z.object({
    name: z.string(),
    description: z.string().optional(),
    nodes: z.array(workflowNodeSchema),
    edges: z.array(workflowEdgeSchema),
  }),
});

export const sseDoneEventSchema = z.object({
  type: z.literal("done"),
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
});

export const sseErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

export const sseEventSchema = z.discriminatedUnion("type", [
  sseTokenEventSchema,
  sseToolCallEventSchema,
  sseDoneEventSchema,
  sseErrorEventSchema,
]);

export const artifactEventSchema = z.union([
  chartArtifactSchema,
  workflowArtifactSchema,
]);

export type SSETokenEvent = z.infer<typeof sseTokenEventSchema>;
export type SSEToolCallEvent = z.infer<typeof sseToolCallEventSchema>;
export type SSEDoneEvent = z.infer<typeof sseDoneEventSchema>;
export type SSEErrorEvent = z.infer<typeof sseErrorEventSchema>;
export type SSEEvent = z.infer<typeof sseEventSchema>;
export type ChartArtifact = z.infer<typeof chartArtifactSchema>;
export type WorkflowArtifact = z.infer<typeof workflowArtifactSchema>;
export type ArtifactEvent = z.infer<typeof artifactEventSchema>;
export type ChartType = z.infer<typeof chartTypeEnum>;
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

// ============================
// CHAT MESSAGE TYPES
// ============================

export type ChatArtifact =
  | { artifactType: "chart"; payload: ChartArtifact["payload"] }
  | { artifactType: "workflow"; payload: WorkflowArtifact["payload"] };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  artifacts?: ChatArtifact[];
  toolCalls?: { name: string; status: string; result?: string }[];
}

// ============================
// INPUT SCHEMAS
// ============================

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  section: aiSectionEnum.optional(),
  language: z.enum(["es", "en"]).optional(),
});

export const aiMemoryCategoryEnum = z.enum([
  "business_context",
  "preferences",
  "insights",
  "patterns",
]);

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type AiMemoryCategory = z.infer<typeof aiMemoryCategoryEnum>;

// ============================
// PLAN AUTONOMY
// ============================

export type PlanName = "INICIO" | "CRECIMIENTO" | "PROFESIONAL" | "AGENCIA";

export interface PlanAutonomy {
  canRead: boolean;
  canWrite: boolean;
  requiresApproval: boolean;
  canSaveWorkflows: boolean;
  autoActivateWorkflows: boolean;
}

export const PLAN_AUTONOMY: Record<PlanName, PlanAutonomy> = {
  INICIO: {
    canRead: true,
    canWrite: false,
    requiresApproval: false,
    canSaveWorkflows: false,
    autoActivateWorkflows: false,
  },
  CRECIMIENTO: {
    canRead: true,
    canWrite: true,
    requiresApproval: true,
    canSaveWorkflows: true,
    autoActivateWorkflows: false,
  },
  PROFESIONAL: {
    canRead: true,
    canWrite: true,
    requiresApproval: false,
    canSaveWorkflows: true,
    autoActivateWorkflows: false,
  },
  AGENCIA: {
    canRead: true,
    canWrite: true,
    requiresApproval: false,
    canSaveWorkflows: true,
    autoActivateWorkflows: true,
  },
};
