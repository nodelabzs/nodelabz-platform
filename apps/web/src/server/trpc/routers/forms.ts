import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure, publicProcedure } from "../init";

export const formsRouter = router({
  /** List all forms for the tenant */
  list: tenantProcedure.query(async ({ ctx }) => {
    return prisma.form.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { submissions: true } } },
    });
  }),

  /** Get a single form by ID */
  get: tenantProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const form = await prisma.form.findFirst({
        where: { id: input.formId, tenantId: ctx.effectiveTenantId },
        include: { _count: { select: { submissions: true } } },
      });
      if (!form) throw new TRPCError({ code: "NOT_FOUND" });
      return form;
    }),

  /** Create a new form */
  create: tenantProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
      fields: z.array(z.record(z.unknown())).max(50),
      settings: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);

      return prisma.form.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          name: input.name,
          description: input.description,
          fields: JSON.parse(JSON.stringify(input.fields)),
          settings: input.settings ? JSON.parse(JSON.stringify(input.settings)) : {},
          slug: `${slug}-${Date.now().toString(36)}`,
        },
      });
    }),

  /** Update a form */
  update: tenantProcedure
    .input(z.object({
      formId: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(500).optional(),
      fields: z.array(z.record(z.unknown())).max(50).optional(),
      settings: z.record(z.unknown()).optional(),
      isPublished: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const form = await prisma.form.findFirst({
        where: { id: input.formId, tenantId: ctx.effectiveTenantId },
      });
      if (!form) throw new TRPCError({ code: "NOT_FOUND" });

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.fields !== undefined) data.fields = JSON.parse(JSON.stringify(input.fields));
      if (input.settings !== undefined) data.settings = JSON.parse(JSON.stringify(input.settings));
      if (input.isPublished !== undefined) data.isPublished = input.isPublished;

      return prisma.form.update({ where: { id: input.formId }, data });
    }),

  /** Delete a form */
  delete: tenantProcedure
    .input(z.object({ formId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const form = await prisma.form.findFirst({
        where: { id: input.formId, tenantId: ctx.effectiveTenantId },
      });
      if (!form) throw new TRPCError({ code: "NOT_FOUND" });
      await prisma.form.delete({ where: { id: input.formId } });
      return { success: true };
    }),

  /** List submissions for a form */
  listSubmissions: tenantProcedure
    .input(z.object({
      formId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const form = await prisma.form.findFirst({
        where: { id: input.formId, tenantId: ctx.effectiveTenantId },
      });
      if (!form) throw new TRPCError({ code: "NOT_FOUND" });

      const submissions = await prisma.formSubmission.findMany({
        where: { formId: input.formId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      const hasMore = submissions.length > input.limit;
      if (hasMore) submissions.pop();

      return {
        submissions,
        nextCursor: hasMore ? submissions[submissions.length - 1]?.id : undefined,
      };
    }),

  /** Public: submit a form (no auth required, rate limited by slug) */
  submit: publicProcedure
    .input(z.object({
      slug: z.string().max(100),
      data: z.record(z.string(), z.unknown()).refine(
        (d) => JSON.stringify(d).length < 50_000,
        { message: "Submission data too large" },
      ),
      source: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const form = await prisma.form.findFirst({
        where: { slug: input.slug, isPublished: true },
      });
      if (!form) throw new TRPCError({ code: "NOT_FOUND", message: "Form not found or not published" });

      // Create submission
      const submission = await prisma.formSubmission.create({
        data: {
          formId: form.id,
          tenantId: form.tenantId,
          data: JSON.parse(JSON.stringify(input.data)),
          source: input.source,
        },
      });

      // Auto-create contact if email field exists
      const email = (input.data as Record<string, unknown>).email as string | undefined;
      if (email && typeof email === "string" && email.includes("@")) {
        const name = (input.data as Record<string, unknown>).name as string | undefined;
        const existing = await prisma.contact.findFirst({
          where: { tenantId: form.tenantId, email },
        });

        if (!existing) {
          const contact = await prisma.contact.create({
            data: {
              tenantId: form.tenantId,
              email,
              firstName: name?.split(" ")[0] || "",
              lastName: name?.split(" ").slice(1).join(" ") || "",
              source: "FORM",
              tags: ["form-submission"],
            },
          });
          // Link submission to contact
          await prisma.formSubmission.update({
            where: { id: submission.id },
            data: { contactId: contact.id },
          });
        } else {
          await prisma.formSubmission.update({
            where: { id: submission.id },
            data: { contactId: existing.id },
          });
        }
      }

      return { success: true, submissionId: submission.id };
    }),
});
