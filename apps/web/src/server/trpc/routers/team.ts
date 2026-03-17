import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";
import { createInviteToken } from "@/server/auth/invites";

export const teamRouter = router({
  // List all team members in the tenant
  listMembers: tenantProcedure.query(async ({ ctx }) => {
    const members = await prisma.user.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    });

    return members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatarUrl: m.avatarUrl,
      role: m.role.name,
      roleId: m.roleId,
      isSuperAdmin: m.isSuperAdmin,
      createdAt: m.createdAt,
    }));
  }),

  // List available roles for the tenant
  listRoles: tenantProcedure.query(async ({ ctx }) => {
    return prisma.role.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: { name: "asc" },
    });
  }),

  // Generate an invite link for a new team member
  createInvite: tenantProcedure
    .input(
      z.object({
        email: z.string().email("Email invalido"),
        roleName: z.enum(["Admin", "Manager", "Editor", "Viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only Admins can invite
      if (ctx.dbUser.role.name !== "Admin" && !ctx.dbUser.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden invitar miembros",
        });
      }

      // Check if email already exists in this tenant
      const existing = await prisma.user.findFirst({
        where: { tenantId: ctx.effectiveTenantId, email: input.email },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email ya tiene una cuenta en esta empresa",
        });
      }

      // Get tenant name for the invite
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.effectiveTenantId },
        select: { name: true },
      });

      const token = await createInviteToken({
        tenantId: ctx.effectiveTenantId,
        tenantName: tenant?.name || "NodeLabz",
        roleName: input.roleName,
        email: input.email,
        invitedBy: ctx.dbUser.name,
      });

      // Build the invite URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = `${baseUrl}/auth/invite?token=${token}`;

      return { inviteUrl, email: input.email, roleName: input.roleName };
    }),

  // Update a team member's role
  updateRole: tenantProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        roleId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only Admins can change roles
      if (ctx.dbUser.role.name !== "Admin" && !ctx.dbUser.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden cambiar roles",
        });
      }

      // Can't change your own role
      if (input.userId === ctx.dbUser.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes cambiar tu propio rol",
        });
      }

      // Verify user belongs to this tenant
      const user = await prisma.user.findFirst({
        where: { id: input.userId, tenantId: ctx.effectiveTenantId },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }

      // Verify role belongs to this tenant
      const role = await prisma.role.findFirst({
        where: { id: input.roleId, tenantId: ctx.effectiveTenantId },
      });
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rol no encontrado" });
      }

      return prisma.user.update({
        where: { id: input.userId },
        data: { roleId: input.roleId },
        include: { role: true },
      });
    }),

  // Remove a team member
  removeMember: tenantProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only Admins can remove members
      if (ctx.dbUser.role.name !== "Admin" && !ctx.dbUser.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden eliminar miembros",
        });
      }

      // Can't remove yourself
      if (input.userId === ctx.dbUser.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes eliminarte a ti mismo",
        });
      }

      // Verify user belongs to this tenant
      const user = await prisma.user.findFirst({
        where: { id: input.userId, tenantId: ctx.effectiveTenantId },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }

      await prisma.user.delete({ where: { id: input.userId } });
      return { success: true };
    }),
});
