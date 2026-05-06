import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@nodelabz/db", () => ({
  prisma: {
    workflow: {
      findUnique: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    emailTemplate: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}));

// Mock SES email sending
vi.mock("@/server/email/ses", () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: "msg-123" }),
}));

import { executeWorkflow } from "../engine";
import { prisma } from "@nodelabz/db";
import { sendEmail } from "@/server/email/ses";

describe("executeWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip inactive workflows", async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue({
      id: "wf-1",
      tenantId: "t-1",
      name: "Test",
      isActive: false,
      nodes: [],
      edges: [],
      trigger: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await executeWorkflow("wf-1", {});
    expect(result.logs[0]!.status).toBe("skipped");
    expect(result.logs[0]!.message).toContain("inactive");
  });

  it("should return error if no trigger node", async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue({
      id: "wf-2",
      tenantId: "t-1",
      name: "No Trigger",
      isActive: true,
      nodes: [{ id: "1", type: "action", data: { actionType: "send_email" } }],
      edges: [],
      trigger: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await executeWorkflow("wf-2", {});
    expect(result.logs[0]!.status).toBe("error");
    expect(result.logs[0]!.message).toContain("No trigger node");
  });

  it("should execute send_email action", async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue({
      id: "wf-3",
      tenantId: "t-1",
      name: "Email Workflow",
      isActive: true,
      nodes: [
        { id: "1", type: "trigger", data: {} },
        { id: "2", type: "action", data: { actionType: "send_email", subject: "Hello", body: "<p>Hi</p>" } },
      ],
      edges: [{ id: "e1", source: "1", target: "2" }],
      trigger: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.contact.findUnique).mockResolvedValue({
      id: "c-1",
      tenantId: "t-1",
      firstName: "Test",
      lastName: null,
      email: "test@example.com",
      phone: null,
      company: null,
      source: null,
      sourceId: null,
      score: 0,
      scoreLabel: "COLD",
      stage: null,
      assignedTo: null,
      tags: [],
      customData: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await executeWorkflow("wf-3", { contactId: "c-1" });
    expect(sendEmail).toHaveBeenCalledWith("test@example.com", "Hello", "<p>Hi</p>");
    expect(result.logs.some((l) => l.status === "success")).toBe(true);
  });

  it("should evaluate condition and follow correct branch", async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue({
      id: "wf-4",
      tenantId: "t-1",
      name: "Condition Workflow",
      isActive: true,
      nodes: [
        { id: "1", type: "trigger", data: {} },
        { id: "2", type: "condition", data: { conditionField: "scoreLabel", conditionOperator: "equals", conditionValue: "HOT" } },
        { id: "3", type: "action", data: { actionType: "create_activity", activityType: "hot_follow", activitySubject: "Hot lead!" } },
        { id: "4", type: "action", data: { actionType: "create_activity", activityType: "cold_nurture", activitySubject: "Nurture" } },
      ],
      edges: [
        { id: "e1", source: "1", target: "2" },
        { id: "e2", source: "2", target: "3", sourceHandle: "true" },
        { id: "e3", source: "2", target: "4", sourceHandle: "false" },
      ],
      trigger: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await executeWorkflow("wf-4", {
      contactId: "c-1",
      scoreLabel: "HOT",
    });

    // Should have evaluated condition as true
    const condLog = result.logs.find((l) => l.nodeId === "2");
    expect(condLog?.message).toContain("true");

    // Should have created activity for the "true" branch (node 3)
    expect(prisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "hot_follow",
          subject: "Hot lead!",
        }),
      })
    );
  });

  it("should handle update_contact action with allowed fields", async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue({
      id: "wf-5",
      tenantId: "t-1",
      name: "Update Contact",
      isActive: true,
      nodes: [
        { id: "1", type: "trigger", data: {} },
        { id: "2", type: "action", data: { actionType: "update_contact", contactUpdate: { scoreLabel: "HOT", assignedTo: "user-1", maliciousField: "drop table" } } },
      ],
      edges: [{ id: "e1", source: "1", target: "2" }],
      trigger: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await executeWorkflow("wf-5", { contactId: "c-1" });

    expect(prisma.contact.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { scoreLabel: "HOT", assignedTo: "user-1" },
    });
    // maliciousField should NOT be in the update
    const updateCall = vi.mocked(prisma.contact.update).mock.calls[0]![0];
    expect(updateCall.data).not.toHaveProperty("maliciousField");
    expect(result.logs.some((l) => l.status === "success")).toBe(true);
  });

  it("should prevent infinite loops via visited set", async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue({
      id: "wf-6",
      tenantId: "t-1",
      name: "Cycle",
      isActive: true,
      nodes: [
        { id: "1", type: "trigger", data: {} },
        { id: "2", type: "action", data: { actionType: "create_activity", activityType: "loop", activitySubject: "Loop" } },
      ],
      edges: [
        { id: "e1", source: "1", target: "2" },
        { id: "e2", source: "2", target: "2" }, // cycle
      ],
      trigger: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await executeWorkflow("wf-6", { contactId: "c-1" });
    // Activity should be created only once (cycle prevented)
    expect(prisma.activity.create).toHaveBeenCalledTimes(1);
  });

  it("should return not-found for missing workflow", async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue(null);

    const result = await executeWorkflow("non-existent", {});
    expect(result.logs[0]!.status).toBe("skipped");
  });
});
