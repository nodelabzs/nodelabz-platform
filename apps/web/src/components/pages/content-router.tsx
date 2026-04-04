"use client";

import {
  HomePage,
  HealthScorePage,
  MetricasPage,
  NodeMapPage,
  RecomendacionesIAPage,
  DigestDiarioPage,
  ConectarPlataformaPage,
  GenerarReportePage,
} from "./dashboard-pages";

import {
  TodosContactosPage,
  EmpresasPage,
  ImportarContactosPage,
  PipelinePage,
  DealsPage,
  ActividadesPage,
  EtiquetasPage,
  ListasInteligentesPage,
  LeadScoringPage,
} from "./contacts-pages";

import {
  TodasCampanasPage,
  CrearCampanaPage,
  PlatformAdsPage,
  GeneradorCopyPage,
  CreativosPage,
  CalendarioPage,
} from "./campaigns-pages";

import {
  EmailCampanasPage,
  PlantillasEmailPage,
  SecuenciasEmailPage,
  EditorEmailPage,
  PreviewEmailPage,
  EmailMetricPage,
} from "./email-pages";

import {
  ConversacionesWAPage,
  PlantillasWAPage,
  BroadcastsPage,
  RespuestasIAPage,
  SecuenciasWAPage,
  NumeroConectadoPage,
  ReglasWAPage,
  CalendarioSocialPage,
  CrearPublicacionPage,
  CanalSocialPage,
  BandejaSocialPage,
  MencionesSocialPage,
  TodosWorkflowsPage,
  CrearWorkflowPage,
  TriggersPage,
  EjecucionesRecientesPage,
  ErroresAutomationPage,
  ResumenEjecutivoPage,
  ReportePersonalizadoPage,
  ReportesProgramadosPage,
  ExportarPage,
  IntegrationPage,
  OAuthTokensPage,
  SyncStatusPage,
  PerfilPage,
  EquipoPage,
  RolesPermisosPage,
  PlanActualPage,
  MetodoPagoPage,
  HistorialPagosPage,
  IdiomaPage,
  NotificacionesPage,
  ApiKeysPage,
  BusinessContextPage,
} from "./remaining-pages";

import { FormBuilderPage } from "./form-builder-page";

import {
  AIImagePage,
  AIVideoPage,
  BrandEditorPage,
  AIChatPage,
} from "./ai-studio-pages";

const CONTENT_MAP: Record<string, Record<string, React.ReactNode>> = {
  dashboard: {
    "Home": <HomePage />,
    "Health Score": <HealthScorePage />,
    "Metricas": <MetricasPage />,
    "Node Map": <NodeMapPage />,
    "Recomendaciones IA": <RecomendacionesIAPage />,
    "Digest Diario": <DigestDiarioPage />,
    "Conectar plataforma": <ConectarPlataformaPage />,
    "Generar reporte": <GenerarReportePage />,
  },
  contacts: {
    "Todos los contactos": <TodosContactosPage />,
    "Empresas": <EmpresasPage />,
    "Importar contactos": <ImportarContactosPage />,
    "Pipeline principal": <PipelinePage />,
    "Deals": <DealsPage />,
    "Actividades": <ActividadesPage />,
    "Etiquetas": <EtiquetasPage />,
    "Listas inteligentes": <ListasInteligentesPage />,
    "Lead scoring": <LeadScoringPage />,
  },
  campaigns: {
    "Todas las campanas": <TodasCampanasPage />,
    "Crear campana": <CrearCampanaPage />,
    "Meta Ads": <PlatformAdsPage platform="Meta Ads" />,
    "Google Ads": <PlatformAdsPage platform="Google Ads" />,
    "TikTok Ads": <PlatformAdsPage platform="TikTok Ads" />,
    "Generador de copy IA": <GeneradorCopyPage />,
    "Creativos": <CreativosPage />,
    "Calendario": <CalendarioPage />,
  },
  email: {
    "Campanas": <EmailCampanasPage />,
    "Plantillas": <PlantillasEmailPage />,
    "Secuencias": <SecuenciasEmailPage />,
    "Editor drag & drop": <EditorEmailPage />,
    "Previsualizacion": <PreviewEmailPage />,
    "Entregas": <EmailMetricPage metric="Entregas" />,
    "Aperturas": <EmailMetricPage metric="Aperturas" />,
    "Clics": <EmailMetricPage metric="Clics" />,
  },
  whatsapp: {
    "Conversaciones": <ConversacionesWAPage />,
    "Plantillas": <PlantillasWAPage />,
    "Broadcasts": <BroadcastsPage />,
    "Respuestas IA": <RespuestasIAPage />,
    "Secuencias": <SecuenciasWAPage />,
    "Numero conectado": <NumeroConectadoPage />,
    "Reglas": <ReglasWAPage />,
  },
  social: {
    "Calendario": <CalendarioSocialPage />,
    "Crear publicacion": <CrearPublicacionPage />,
    "Facebook": <CanalSocialPage canal="Facebook" />,
    "Instagram": <CanalSocialPage canal="Instagram" />,
    "TikTok": <CanalSocialPage canal="TikTok" />,
    "LinkedIn": <CanalSocialPage canal="LinkedIn" />,
    "Bandeja de entrada": <BandejaSocialPage />,
    "Menciones": <MencionesSocialPage />,
  },
  "ai-studio": {
    "Generar Imagen": <AIImagePage />,
    "Generar Video": <AIVideoPage />,
    "Generar Copy": <GeneradorCopyPage />,
    "Editor de Marca": <BrandEditorPage />,
    "Chat IA": <AIChatPage />,
  },
  automations: {
    "Todos los workflows": <TodosWorkflowsPage />,
    "Crear workflow": <CrearWorkflowPage />,
    "Formularios": <FormBuilderPage />,
    "Lead score": <TriggersPage type="Lead score" />,
    "Email events": <TriggersPage type="Email events" />,
    "Ejecuciones recientes": <EjecucionesRecientesPage />,
    "Errores": <ErroresAutomationPage />,
  },
  reports: {
    "Resumen ejecutivo": <ResumenEjecutivoPage />,
    "Reporte personalizado": <ReportePersonalizadoPage />,
    "Reportes diarios": <ReportesProgramadosPage frequency="Diarios" />,
    "Reportes semanales": <ReportesProgramadosPage frequency="Semanales" />,
    "Reportes mensuales": <ReportesProgramadosPage frequency="Mensuales" />,
    "Descargar PDF": <ExportarPage type="Descargar PDF" />,
    "Enviar por email": <ExportarPage type="Enviar por email" />,
  },
  integrations: {
    "Meta Ads": <IntegrationPage platform="Meta Ads" connected />,
    "Google Ads": <IntegrationPage platform="Google Ads" connected />,
    "GA4": <IntegrationPage platform="Google Analytics 4" />,
    "Stripe": <IntegrationPage platform="Stripe" />,
    "Shopify": <IntegrationPage platform="Shopify" />,
    "TikTok": <IntegrationPage platform="TikTok" />,
    "LinkedIn": <IntegrationPage platform="LinkedIn" />,
    "WhatsApp Business": <IntegrationPage platform="WhatsApp Business" />,
    "MercadoLibre": <IntegrationPage platform="MercadoLibre" />,
    "OAuth tokens": <OAuthTokensPage />,
    "Sync status": <SyncStatusPage />,
  },
  settings: {
    "Perfil": <PerfilPage />,
    "Equipo": <EquipoPage />,
    "Roles y permisos": <RolesPermisosPage />,
    "Plan actual": <PlanActualPage />,
    "Metodo de pago": <MetodoPagoPage />,
    "Historial": <HistorialPagosPage />,
    "Idioma": <IdiomaPage />,
    "Notificaciones": <NotificacionesPage />,
    "API Keys": <ApiKeysPage />,
    "Contexto de Negocio": <BusinessContextPage />,
  },
};

// Get default (first) item for each section
const DEFAULT_ITEMS: Record<string, string> = {
  dashboard: "Home",
  contacts: "Todos los contactos",
  campaigns: "Todas las campanas",
  email: "Campanas",
  whatsapp: "Conversaciones",
  social: "Calendario",
  "ai-studio": "Generar Imagen",
  automations: "Todos los workflows",
  reports: "Resumen ejecutivo",
  integrations: "Meta Ads",
  settings: "Perfil",
};

export function getDefaultItem(section: string): string {
  return DEFAULT_ITEMS[section] || "";
}

export function ContentRouter({
  section,
  activeItem,
}: {
  section: string;
  activeItem: string;
}) {
  const sectionContent = CONTENT_MAP[section];
  if (!sectionContent) return null;

  const content = sectionContent[activeItem];
  if (!content) {
    // Fallback to the first item
    const defaultItem = DEFAULT_ITEMS[section];
    if (defaultItem && sectionContent[defaultItem]) {
      return <>{sectionContent[defaultItem]}</>;
    }
    return null;
  }

  return <>{content}</>;
}
