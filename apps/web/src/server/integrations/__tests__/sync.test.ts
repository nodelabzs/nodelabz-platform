import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@nodelabz/db", () => ({
  prisma: {
    integration: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    campaignMetric: {
      upsert: vi.fn(),
    },
  },
  Prisma: {
    Decimal: class Decimal {
      constructor(public value: number) {}
    },
  },
}));

// Mock notifications
vi.mock("@/server/notifications/notify", () => ({
  notifyIntegrationSync: vi.fn(),
}));

// Mock Google token refresh
vi.mock("@/server/integrations/google/auth", () => ({
  refreshGoogleToken: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { syncMetaAds, syncIntegration } from "../sync";
import { prisma } from "@nodelabz/db";
import { notifyIntegrationSync } from "@/server/notifications/notify";

describe("syncMetaAds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error if integration not found", async () => {
    vi.mocked(prisma.integration.findFirst).mockResolvedValue(null);

    const result = await syncMetaAds("t-1", "int-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Integration not found");
  });

  it("should mark integration as expired if token is expired", async () => {
    vi.mocked(prisma.integration.findFirst).mockResolvedValue({
      id: "int-1",
      tenantId: "t-1",
      platform: "meta_ads",
      accessToken: "expired-token",
      refreshToken: null,
      expiresAt: new Date("2020-01-01"), // expired
      accountId: "123",
      metadata: null,
      status: "active",
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await syncMetaAds("t-1", "int-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Token expired");
    expect(prisma.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "expired" },
      })
    );
  });

  it("should return error if accountId is missing", async () => {
    vi.mocked(prisma.integration.findFirst).mockResolvedValue({
      id: "int-1",
      tenantId: "t-1",
      platform: "meta_ads",
      accessToken: "valid-token",
      refreshToken: null,
      expiresAt: new Date("2030-01-01"),
      accountId: null,
      metadata: null,
      status: "active",
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await syncMetaAds("t-1", "int-1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Missing accountId");
  });

  it("should sync campaign data from Meta API", async () => {
    vi.mocked(prisma.integration.findFirst).mockResolvedValue({
      id: "int-1",
      tenantId: "t-1",
      platform: "meta_ads",
      accessToken: "valid-token",
      refreshToken: null,
      expiresAt: new Date("2030-01-01"),
      accountId: "123456",
      metadata: null,
      status: "active",
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              campaign_id: "camp-1",
              campaign_name: "Test Campaign",
              date_start: "2026-05-01",
              impressions: "1000",
              clicks: "50",
              spend: "25.00",
              actions: [{ action_type: "lead", value: "3" }],
              action_values: [{ action_type: "purchase", value: "100.00" }],
            },
          ],
          paging: {},
        }),
    });

    const result = await syncMetaAds("t-1", "int-1");
    expect(result.success).toBe(true);
    expect(result.synced).toBe(1);
    expect(prisma.campaignMetric.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "active" }),
      })
    );
    expect(notifyIntegrationSync).toHaveBeenCalledWith("t-1", "meta_ads", true, expect.any(String));
  });

  it("should handle Meta API errors gracefully", async () => {
    vi.mocked(prisma.integration.findFirst).mockResolvedValue({
      id: "int-1",
      tenantId: "t-1",
      platform: "meta_ads",
      accessToken: "bad-token",
      refreshToken: null,
      expiresAt: new Date("2030-01-01"),
      accountId: "123456",
      metadata: null,
      status: "active",
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Invalid OAuth token"),
    });

    const result = await syncMetaAds("t-1", "int-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Meta API error 401");
    expect(prisma.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "error" },
      })
    );
    expect(notifyIntegrationSync).toHaveBeenCalledWith("t-1", "meta_ads", false, expect.any(String));
  });
});

describe("syncIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error for unsupported platform", async () => {
    vi.mocked(prisma.integration.findFirst).mockResolvedValue({
      id: "int-1",
      tenantId: "t-1",
      platform: "unknown_platform",
      accessToken: "tok",
      refreshToken: null,
      expiresAt: null,
      accountId: null,
      metadata: null,
      status: "active",
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await syncIntegration("t-1", "int-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not supported");
  });
});
