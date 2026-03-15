import { prisma } from "@nodelabz/db";
import { generateSlug } from "@nodelabz/utils";

const DEFAULT_ROLES = [
  {
    name: "Admin",
    isSystem: true,
    permissions: {
      analytics: "full",
      campaigns: "full",
      crm: "full",
      billing: "full",
      team: "full",
      integrations: "full",
      ai: "full",
      reports: "full",
    },
  },
  {
    name: "Manager",
    isSystem: true,
    permissions: {
      analytics: "full",
      campaigns: "full",
      crm: "full",
      billing: "view",
      team: "view",
      integrations: "full",
      ai: "full",
      reports: "full",
    },
  },
  {
    name: "Editor",
    isSystem: true,
    permissions: {
      analytics: "view",
      campaigns: "edit",
      crm: "edit",
      billing: "none",
      team: "none",
      integrations: "view",
      ai: "full",
      reports: "edit",
    },
  },
  {
    name: "Viewer",
    isSystem: true,
    permissions: {
      analytics: "view",
      campaigns: "view",
      crm: "view",
      billing: "none",
      team: "none",
      integrations: "view",
      ai: "view",
      reports: "view",
    },
  },
];

export async function provisionTenant({
  supabaseId,
  email,
  name,
  companyName,
  language = "es",
}: {
  supabaseId: string;
  email: string;
  name: string;
  companyName: string;
  language?: string;
}) {
  // Generate a unique slug from company name
  let slug = generateSlug(companyName);

  // Ensure slug uniqueness
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Create tenant, roles, and user in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        slug,
        language,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day trial
      },
    });

    // 2. Create default roles
    const roles = await Promise.all(
      DEFAULT_ROLES.map((role) =>
        tx.role.create({
          data: {
            tenantId: tenant.id,
            name: role.name,
            isSystem: role.isSystem,
            permissions: role.permissions,
          },
        })
      )
    );

    // 3. Find the Admin role
    const adminRole = roles.find((r) => r.name === "Admin")!;

    // 4. Create user with Admin role
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        supabaseId,
        email,
        name,
        roleId: adminRole.id,
      },
    });

    // 5. Create default pipeline
    await tx.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: "Principal",
        isDefault: true,
        stages: [
          { id: "new", name: "Nuevo", order: 0, color: "#6366f1" },
          { id: "contacted", name: "Contactado", order: 1, color: "#8b5cf6" },
          { id: "qualified", name: "Calificado", order: 2, color: "#f59e0b" },
          { id: "proposal", name: "Propuesta", order: 3, color: "#3b82f6" },
          {
            id: "negotiation",
            name: "Negociación",
            order: 4,
            color: "#f97316",
          },
          { id: "won", name: "Ganado", order: 5, color: "#22c55e" },
          { id: "lost", name: "Perdido", order: 6, color: "#ef4444" },
        ],
      },
    });

    return { tenant, user, roles };
  });

  return result;
}

export async function findUserBySupabaseId(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
    include: {
      tenant: true,
      role: true,
    },
  });
}

export async function ensureUserProvisioned({
  supabaseId,
  email,
  name,
  companyName,
  language,
}: {
  supabaseId: string;
  email: string;
  name: string;
  companyName?: string;
  language?: string;
}) {
  // Check if user already exists in our DB
  const existingUser = await findUserBySupabaseId(supabaseId);
  if (existingUser) {
    return { user: existingUser, isNew: false };
  }

  // New user — provision tenant
  const result = await provisionTenant({
    supabaseId,
    email,
    name,
    companyName: companyName || name + "'s Company",
    language,
  });

  const user = await findUserBySupabaseId(supabaseId);
  return { user: user!, isNew: true };
}
