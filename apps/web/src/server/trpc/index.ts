export { createTRPCContext, router, publicProcedure, protectedProcedure, tenantProcedure, superAdminProcedure } from "./init";
import { router, publicProcedure } from "./init";
import { authRouter } from "./routers/auth";
import { conversationRouter } from "./routers/conversation";
import { workflowRouter } from "./routers/workflow";
import { superadminRouter } from "./routers/superadmin";
import { teamRouter } from "./routers/team";
import { contactsRouter } from "./routers/contacts";
import { dealsRouter } from "./routers/deals";
import { pipelineRouter } from "./routers/pipeline";
import { activitiesRouter } from "./routers/activities";
import { billingRouter } from "./routers/billing";
import { integrationsRouter } from "./routers/integrations";
import { campaignsRouter } from "./routers/campaigns";
import { healthScoreRouter } from "./routers/health-score";
import { emailTemplatesRouter } from "./routers/email-templates";
import { emailCampaignsRouter } from "./routers/email-campaigns";
import { sequencesRouter } from "./routers/sequences";
import { whatsappRouter } from "./routers/whatsapp";
import { notificationsRouter } from "./routers/notifications";
import { reportsRouter } from "./routers/reports";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" })),
  auth: authRouter,
  conversation: conversationRouter,
  workflow: workflowRouter,
  superadmin: superadminRouter,
  team: teamRouter,
  contacts: contactsRouter,
  deals: dealsRouter,
  pipeline: pipelineRouter,
  activities: activitiesRouter,
  billing: billingRouter,
  integrations: integrationsRouter,
  campaigns: campaignsRouter,
  healthScore: healthScoreRouter,
  emailTemplates: emailTemplatesRouter,
  emailCampaigns: emailCampaignsRouter,
  sequences: sequencesRouter,
  whatsapp: whatsappRouter,
  notifications: notificationsRouter,
  reports: reportsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
