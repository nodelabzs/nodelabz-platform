import { prisma } from "@nodelabz/db";
import { executeWorkflow } from "./engine";

// ---------------------------------------------------------------------------
// Trigger types
// ---------------------------------------------------------------------------

export type TriggerType =
  | "contact.created"
  | "contact.scored"
  | "deal.created"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost";

// ---------------------------------------------------------------------------
// Fire trigger — finds matching active workflows and executes them
// ---------------------------------------------------------------------------

export async function fireTrigger(
  tenantId: string,
  triggerType: TriggerType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const workflows = await prisma.workflow.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        trigger: true,
      },
    });

    // Filter workflows whose trigger.type matches
    const matching = workflows.filter((w) => {
      const trigger = w.trigger as { type?: string } | null;
      return trigger?.type === triggerType;
    });

    if (matching.length === 0) return;

    // Execute all matching workflows concurrently
    const results = await Promise.allSettled(
      matching.map((w) => executeWorkflow(w.id, data))
    );

    // Log failures (non-blocking)
    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      if (result.status === "rejected") {
        console.error(
          `[Workflow] Failed to execute workflow ${matching[i]!.id} for trigger ${triggerType}:`,
          result.reason
        );
      }
    }
  } catch (error) {
    console.error(
      `[Workflow] Error firing trigger ${triggerType} for tenant ${tenantId}:`,
      error instanceof Error ? error.message : error
    );
  }
}
