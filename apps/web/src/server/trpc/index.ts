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
});

export type AppRouter = typeof appRouter;
