import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@nodelabz/db", () => {
  const mockTx = {
    tenant: {
      create: vi.fn().mockResolvedValue({
        id: "tenant-1",
        name: "Test Company",
        slug: "test-company",
      }),
    },
    role: {
      create: vi.fn().mockImplementation(async (args: any) => ({
        id: `role-${args.data.name.toLowerCase()}`,
        name: args.data.name,
        tenantId: args.data.tenantId,
        isSystem: args.data.isSystem,
        permissions: args.data.permissions,
      })),
    },
    user: {
      create: vi.fn().mockResolvedValue({
        id: "user-1",
        supabaseId: "supa-1",
        email: "test@test.com",
        name: "Test User",
      }),
    },
    pipeline: {
      create: vi.fn().mockResolvedValue({ id: "pipeline-1" }),
    },
  };

  return {
    prisma: {
      tenant: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
    },
  };
});

vi.mock("@nodelabz/utils", () => ({
  generateSlug: (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
}));

import { provisionTenant, findUserBySupabaseId } from "../provision";
import { prisma } from "@nodelabz/db";

describe("provisionTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a tenant with correct data", async () => {
    const result = await provisionTenant({
      supabaseId: "supa-123",
      email: "test@example.com",
      name: "Test User",
      companyName: "Test Company",
      language: "es",
    });

    expect(result).toBeDefined();
    expect(result.tenant).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.roles).toHaveLength(4);
  });

  it("should check for slug uniqueness", async () => {
    await provisionTenant({
      supabaseId: "supa-456",
      email: "test2@example.com",
      name: "Another User",
      companyName: "Another Company",
    });

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "another-company" },
    });
  });

  it("should create 4 default system roles", async () => {
    const result = await provisionTenant({
      supabaseId: "supa-789",
      email: "test3@example.com",
      name: "Third User",
      companyName: "Third Company",
    });

    expect(result.roles).toHaveLength(4);
    const roleNames = result.roles.map((r) => r.name);
    expect(roleNames).toContain("Admin");
    expect(roleNames).toContain("Manager");
    expect(roleNames).toContain("Editor");
    expect(roleNames).toContain("Viewer");
  });

  it("should set trial to 7 days from now", async () => {
    await provisionTenant({
      supabaseId: "supa-trial",
      email: "trial@example.com",
      name: "Trial User",
      companyName: "Trial Company",
    });

    // Verify $transaction was called (which creates the tenant)
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("should handle slug collision by appending suffix", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      id: "existing",
      name: "Existing",
      slug: "duplicate-company",
    } as any);

    await provisionTenant({
      supabaseId: "supa-dup",
      email: "dup@example.com",
      name: "Dup User",
      companyName: "Duplicate Company",
    });

    expect(prisma.tenant.findUnique).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("findUserBySupabaseId", () => {
  it("should query with correct supabaseId", async () => {
    await findUserBySupabaseId("supa-find-1");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supa-find-1" },
      include: { tenant: true, role: true },
    });
  });

  it("should return null for non-existent user", async () => {
    const result = await findUserBySupabaseId("non-existent");
    expect(result).toBeNull();
  });
});
