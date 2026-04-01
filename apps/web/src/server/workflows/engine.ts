import { prisma } from "@nodelabz/db";
import { sendEmail } from "@/server/email/ses";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowNode {
  id: string;
  type: string; // "trigger" | "action" | "condition"
  data: {
    actionType?: string; // "send_email" | "update_contact" | "create_activity" | "wait"
    conditionField?: string;
    conditionOperator?: string; // "equals" | "not_equals" | "contains" | "in"
    conditionValue?: unknown;
    // send_email fields
    templateId?: string;
    subject?: string;
    body?: string;
    // update_contact fields
    contactUpdate?: Record<string, unknown>;
    // create_activity fields
    activityType?: string;
    activitySubject?: string;
    activityBody?: string;
    [key: string]: unknown;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null; // "true" | "false" for condition branches
}

interface ExecutionLog {
  nodeId: string;
  status: "success" | "error" | "skipped";
  message?: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export async function executeWorkflow(
  workflowId: string,
  triggerData: Record<string, unknown>
): Promise<{ logs: ExecutionLog[] }> {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow || !workflow.isActive) {
    return { logs: [{ nodeId: "root", status: "skipped", message: "Workflow not found or inactive", timestamp: new Date() }] };
  }

  const nodes = workflow.nodes as unknown as WorkflowNode[];
  const edges = workflow.edges as unknown as WorkflowEdge[];
  const tenantId = workflow.tenantId;

  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Build adjacency: source -> edges
  const edgeMap = new Map<string, WorkflowEdge[]>();
  for (const edge of edges) {
    const existing = edgeMap.get(edge.source) ?? [];
    existing.push(edge);
    edgeMap.set(edge.source, existing);
  }

  // Find the trigger node (start node)
  const triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    return { logs: [{ nodeId: "root", status: "error", message: "No trigger node found", timestamp: new Date() }] };
  }

  const logs: ExecutionLog[] = [];
  const visited = new Set<string>();

  // Walk the graph starting from trigger's outgoing edges
  const startEdges = edgeMap.get(triggerNode.id) ?? [];
  for (const edge of startEdges) {
    await walkNode(edge.target, {
      nodeMap,
      edgeMap,
      tenantId,
      triggerData,
      logs,
      visited,
    });
  }

  return { logs };
}

// ---------------------------------------------------------------------------
// Graph walker
// ---------------------------------------------------------------------------

interface WalkContext {
  nodeMap: Map<string, WorkflowNode>;
  edgeMap: Map<string, WorkflowEdge[]>;
  tenantId: string;
  triggerData: Record<string, unknown>;
  logs: ExecutionLog[];
  visited: Set<string>;
}

async function walkNode(nodeId: string, ctx: WalkContext): Promise<void> {
  if (ctx.visited.has(nodeId)) return; // prevent cycles
  ctx.visited.add(nodeId);

  const node = ctx.nodeMap.get(nodeId);
  if (!node) return;

  try {
    if (node.type === "action") {
      await executeAction(node, ctx);
      // Follow all outgoing edges
      const nextEdges = ctx.edgeMap.get(nodeId) ?? [];
      for (const edge of nextEdges) {
        await walkNode(edge.target, ctx);
      }
    } else if (node.type === "condition") {
      const result = evaluateCondition(node, ctx.triggerData);
      ctx.logs.push({
        nodeId: node.id,
        status: "success",
        message: `Condition evaluated to ${result}`,
        timestamp: new Date(),
      });

      // Follow the matching branch edge
      const outEdges = ctx.edgeMap.get(nodeId) ?? [];
      const branchEdge = outEdges.find(
        (e) => e.sourceHandle === String(result)
      );
      if (branchEdge) {
        await walkNode(branchEdge.target, ctx);
      }
    } else {
      // Unknown node type -- skip and continue
      const nextEdges = ctx.edgeMap.get(nodeId) ?? [];
      for (const edge of nextEdges) {
        await walkNode(edge.target, ctx);
      }
    }
  } catch (error) {
    ctx.logs.push({
      nodeId: node.id,
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    });
  }
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

async function executeAction(node: WorkflowNode, ctx: WalkContext): Promise<void> {
  const { actionType } = node.data;

  switch (actionType) {
    case "send_email": {
      await handleSendEmail(node, ctx);
      break;
    }
    case "update_contact": {
      await handleUpdateContact(node, ctx);
      break;
    }
    case "create_activity": {
      await handleCreateActivity(node, ctx);
      break;
    }
    case "wait": {
      // MVP: skip waits and continue immediately
      ctx.logs.push({
        nodeId: node.id,
        status: "skipped",
        message: "Wait node skipped (MVP)",
        timestamp: new Date(),
      });
      break;
    }
    default: {
      ctx.logs.push({
        nodeId: node.id,
        status: "error",
        message: `Unknown action type: ${actionType}`,
        timestamp: new Date(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleSendEmail(node: WorkflowNode, ctx: WalkContext): Promise<void> {
  const contactId = ctx.triggerData.contactId as string | undefined;

  let emailAddress: string | undefined;
  if (contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { email: true },
    });
    emailAddress = contact?.email ?? undefined;
  }

  if (!emailAddress) {
    ctx.logs.push({
      nodeId: node.id,
      status: "error",
      message: "No email address found for contact",
      timestamp: new Date(),
    });
    return;
  }

  let subject = node.data.subject ?? "";
  let html = node.data.body ?? "";

  // If templateId is provided, load the template
  if (node.data.templateId) {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: node.data.templateId },
    });
    if (template) {
      subject = template.subject;
      html = template.html ?? "";
    }
  }

  await sendEmail(emailAddress, subject, html);

  ctx.logs.push({
    nodeId: node.id,
    status: "success",
    message: `Email sent to ${emailAddress}`,
    timestamp: new Date(),
  });
}

async function handleUpdateContact(node: WorkflowNode, ctx: WalkContext): Promise<void> {
  const contactId = ctx.triggerData.contactId as string | undefined;
  if (!contactId) {
    ctx.logs.push({
      nodeId: node.id,
      status: "error",
      message: "No contactId in trigger data",
      timestamp: new Date(),
    });
    return;
  }

  const updateFields = node.data.contactUpdate ?? {};

  // Only allow safe fields
  const allowed = ["scoreLabel", "tags", "assignedTo", "stage"] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updateFields) {
      data[key] = updateFields[key];
    }
  }

  if (Object.keys(data).length === 0) {
    ctx.logs.push({
      nodeId: node.id,
      status: "skipped",
      message: "No valid fields to update",
      timestamp: new Date(),
    });
    return;
  }

  await prisma.contact.update({
    where: { id: contactId },
    data,
  });

  ctx.logs.push({
    nodeId: node.id,
    status: "success",
    message: `Contact ${contactId} updated: ${Object.keys(data).join(", ")}`,
    timestamp: new Date(),
  });
}

async function handleCreateActivity(node: WorkflowNode, ctx: WalkContext): Promise<void> {
  const contactId = ctx.triggerData.contactId as string | undefined;
  if (!contactId) {
    ctx.logs.push({
      nodeId: node.id,
      status: "error",
      message: "No contactId in trigger data",
      timestamp: new Date(),
    });
    return;
  }

  await prisma.activity.create({
    data: {
      tenantId: ctx.tenantId,
      contactId,
      type: node.data.activityType ?? "workflow_action",
      subject: node.data.activitySubject,
      body: node.data.activityBody,
      metadata: {
        source: "workflow",
        triggerData: ctx.triggerData as Record<string, string>,
      } as object,
    },
  });

  ctx.logs.push({
    nodeId: node.id,
    status: "success",
    message: `Activity created for contact ${contactId}`,
    timestamp: new Date(),
  });
}

// ---------------------------------------------------------------------------
// Condition evaluator
// ---------------------------------------------------------------------------

function evaluateCondition(
  node: WorkflowNode,
  triggerData: Record<string, unknown>
): boolean {
  const { conditionField, conditionOperator, conditionValue } = node.data;

  if (!conditionField || !conditionOperator) return false;

  // Resolve the field value from trigger data (supports dot notation e.g. "contact.scoreLabel")
  const fieldValue = resolveField(conditionField, triggerData);

  switch (conditionOperator) {
    case "equals":
      return fieldValue === conditionValue;
    case "not_equals":
      return fieldValue !== conditionValue;
    case "contains":
      if (typeof fieldValue === "string" && typeof conditionValue === "string") {
        return fieldValue.includes(conditionValue);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(conditionValue);
      }
      return false;
    case "in":
      if (Array.isArray(conditionValue)) {
        return conditionValue.includes(fieldValue);
      }
      return false;
    case "gt":
      return Number(fieldValue) > Number(conditionValue);
    case "lt":
      return Number(fieldValue) < Number(conditionValue);
    default:
      return false;
  }
}

function resolveField(path: string, data: Record<string, unknown>): unknown {
  const parts = path.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
