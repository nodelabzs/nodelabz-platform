import { prisma } from "@nodelabz/db";
import { executeWorkflow } from "./engine";

// ---------------------------------------------------------------------------
// Trigger types — all CRM events that can fire workflows
// ---------------------------------------------------------------------------

export type TriggerType =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "contact.scored"
  | "contact.tag_added"
  | "deal.created"
  | "deal.updated"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "activity.created"
  | "email.sent"
  | "email.opened"
  | "email.clicked"
  | "form.submitted";

// ---------------------------------------------------------------------------
// Event log — persists events for debugging and audit
// ---------------------------------------------------------------------------

async function logEvent(
  tenantId: string,
  triggerType: TriggerType,
  data: Record<string, unknown>,
  workflowsMatched: number,
  errors: number
): Promise<void> {
  try {
    // Store as an activity on the contact if contactId is present
    const contactId = data.contactId as string | undefined;
    if (contactId) {
      await prisma.activity.create({
        data: {
          tenantId,
          contactId,
          type: "system_event",
          subject: triggerType,
          metadata: {
            triggerType,
            workflowsMatched,
            errors,
            timestamp: new Date().toISOString(),
          } as object,
        },
      });
    }
  } catch {
    // Non-blocking — don't let logging failures break trigger flow
  }
}

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

    // Filter workflows whose trigger.type matches (exact or wildcard)
    const matching = workflows.filter((w) => {
      const trigger = w.trigger as { type?: string } | null;
      if (!trigger?.type) return false;
      // Exact match
      if (trigger.type === triggerType) return true;
      // Wildcard match: "contact.*" matches all contact events
      if (trigger.type.endsWith(".*")) {
        const prefix = trigger.type.slice(0, -2);
        return triggerType.startsWith(prefix + ".");
      }
      // Global wildcard
      if (trigger.type === "*") return true;
      return false;
    });

    if (matching.length === 0) {
      // Still log the event for audit trail (if contact-scoped)
      void logEvent(tenantId, triggerType, data, 0, 0);
      return;
    }

    // Execute all matching workflows concurrently
    const results = await Promise.allSettled(
      matching.map((w) => executeWorkflow(w.id, data))
    );

    // Count failures
    let errorCount = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      if (result.status === "rejected") {
        errorCount++;
        console.error(
          `[Workflow] Failed to execute workflow ${matching[i]!.id} for trigger ${triggerType}:`,
          result.reason
        );
      }
    }

    // Log event with execution results
    void logEvent(tenantId, triggerType, data, matching.length, errorCount);
  } catch (error) {
    console.error(
      `[Workflow] Error firing trigger ${triggerType} for tenant ${tenantId}:`,
      error instanceof Error ? error.message : error
    );
  }
}
