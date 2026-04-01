import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";
import { PLAN_LIMITS, type PlanName } from "@/server/stripe/plans";
import { buildCsvString } from "./csv-utils";
import { fireTrigger } from "@/server/workflows/triggers";
import { notifyNewLead } from "@/server/notifications/notify";

/**
 * Returns contact usage info for a tenant relative to their plan limit.
 */
async function getContactLimitInfo(tenantId: string) {
  const [tenant, currentCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    }),
    prisma.contact.count({ where: { tenantId } }),
  ]);

  const plan = (tenant?.plan as PlanName) ?? "INICIO";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.INICIO;
  const unlimited = limits.maxContacts === -1;

  return {
    current: currentCount,
    limit: limits.maxContacts,
    remaining: unlimited ? Infinity : Math.max(0, limits.maxContacts - currentCount),
    unlimited,
  };
}

const scoreLabelEnum = z.enum(["HOT", "WARM", "COLD"]);

const advancedFiltersSchema = z.object({
  source: z.string().optional(),
  stage: z.string().optional(),
  assignedTo: z.string().optional(),
  company: z.string().optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  scoreMin: z.number().optional(),
  scoreMax: z.number().optional(),
}).optional();

const sortByEnum = z.enum(["createdAt", "updatedAt", "firstName", "score", "company"]).optional();
const sortOrderEnum = z.enum(["asc", "desc"]).optional();

export const contactsRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        scoreLabel: scoreLabelEnum.optional(),
        tags: z.array(z.string()).optional(),
        filters: advancedFiltersSchema,
        sortBy: sortByEnum,
        sortOrder: sortOrderEnum,
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, scoreLabel, tags, filters, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        tenantId: ctx.effectiveTenantId,
      };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ];
      }

      if (scoreLabel) {
        where.scoreLabel = scoreLabel;
      }

      if (tags && tags.length > 0) {
        where.tags = { hasSome: tags };
      }

      // Advanced filters
      if (filters) {
        if (filters.source) where.source = filters.source;
        if (filters.stage) where.stage = filters.stage;
        if (filters.assignedTo) where.assignedTo = filters.assignedTo;
        if (filters.company) where.company = { contains: filters.company, mode: "insensitive" };
        if (filters.hasEmail === true) where.email = { not: null };
        if (filters.hasEmail === false) where.email = null;
        if (filters.hasPhone === true) where.phone = { not: null };
        if (filters.hasPhone === false) where.phone = null;

        if (filters.createdAfter || filters.createdBefore) {
          const createdAt: Record<string, Date> = {};
          if (filters.createdAfter) createdAt.gte = filters.createdAfter;
          if (filters.createdBefore) createdAt.lte = filters.createdBefore;
          where.createdAt = createdAt;
        }

        if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
          const score: Record<string, number> = {};
          if (filters.scoreMin !== undefined) score.gte = filters.scoreMin;
          if (filters.scoreMax !== undefined) score.lte = filters.scoreMax;
          where.score = score;
        }
      }

      const orderBy = { [sortBy ?? "createdAt"]: sortOrder ?? "desc" };

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          skip,
          take: limit,
          orderBy,
        }),
        prisma.contact.count({ where }),
      ]);

      return {
        contacts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  get: tenantProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId: ctx.effectiveTenantId },
        include: {
          deals: true,
          activities: { take: 20, orderBy: { createdAt: "desc" } },
          messages: { take: 20, orderBy: { createdAt: "desc" } },
        },
      });

      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
      return contact;
    }),

  create: tenantProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        source: z.string().optional(),
        tags: z.array(z.string()).optional(),
        customData: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const limitInfo = await getContactLimitInfo(ctx.effectiveTenantId);

      if (!limitInfo.unlimited && limitInfo.remaining <= 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Has alcanzado el limite de contactos de tu plan (${limitInfo.limit}). Actualiza tu plan para agregar mas.`,
        });
      }

      const contact = await prisma.contact.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          company: input.company,
          source: input.source,
          tags: input.tags ?? [],
          customData: input.customData as object | undefined,
        },
      });

      void fireTrigger(ctx.effectiveTenantId, "contact.created", {
        contactId: contact.id,
        ...input,
      });

      // Notify if the new contact is scored as HOT
      if (contact.scoreLabel === "HOT") {
        const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
        notifyNewLead(ctx.effectiveTenantId, name).catch(() => {
          /* fire-and-forget — don't block the mutation */
        });
      }

      return contact;
    }),

  update: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        source: z.string().optional(),
        stage: z.string().optional(),
        assignedTo: z.string().optional(),
        tags: z.array(z.string()).optional(),
        customData: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId: ctx.effectiveTenantId },
      });

      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });

      const { contactId, ...updateData } = input;
      return prisma.contact.update({
        where: { id: contactId },
        data: updateData as object,
      });
    }),

  delete: tenantProcedure
    .input(z.object({ contactId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId: ctx.effectiveTenantId },
      });

      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.contact.delete({ where: { id: input.contactId } });
      return { success: true };
    }),

  bulkImport: tenantProcedure
    .input(
      z.object({
        contacts: z.array(
          z.object({
            firstName: z.string().min(1),
            lastName: z.string().optional(),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            company: z.string().optional(),
            source: z.string().optional(),
            tags: z.array(z.string()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;

      // Find existing emails in this tenant to skip duplicates
      const incomingEmails = input.contacts
        .map((c) => c.email)
        .filter((e): e is string => !!e);

      const existingContacts = incomingEmails.length > 0
        ? await prisma.contact.findMany({
            where: { tenantId, email: { in: incomingEmails } },
            select: { email: true },
          })
        : [];

      const existingEmailSet = new Set(
        existingContacts.map((c) => c.email).filter(Boolean)
      );

      let toCreate = input.contacts.filter(
        (c) => !c.email || !existingEmailSet.has(c.email)
      );

      const skipped = input.contacts.length - toCreate.length;

      // Enforce contact limit: cap import to remaining capacity
      const limitInfo = await getContactLimitInfo(tenantId);
      let capped = 0;

      if (!limitInfo.unlimited && limitInfo.remaining <= 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Has alcanzado el limite de contactos de tu plan (${limitInfo.limit}). Actualiza tu plan para agregar mas.`,
        });
      }

      if (!limitInfo.unlimited && toCreate.length > limitInfo.remaining) {
        capped = toCreate.length - limitInfo.remaining;
        toCreate = toCreate.slice(0, limitInfo.remaining);
      }

      if (toCreate.length > 0) {
        await prisma.contact.createMany({
          data: toCreate.map((c) => ({
            tenantId,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            company: c.company,
            source: c.source,
            tags: c.tags ?? [],
          })),
        });
      }

      return { imported: toCreate.length, skipped, capped };
    }),

  parseCSV: tenantProcedure
    .input(
      z.object({
        csvContent: z.string().min(1),
        fieldMapping: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { csvContent, fieldMapping } = input;

      // Parse CSV: handle commas, semicolons, and quoted fields
      const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CSV must have at least a header row and one data row",
        });
      }

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        const delimiter = line.includes(";") && !line.includes(",") ? ";" : ",";

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const columns = parseLine(lines[0]!);
      const rows = lines.slice(1).map((line) => {
        const values = parseLine(line);
        const row: Record<string, string> = {};
        columns.forEach((col, idx) => {
          row[col] = values[idx] || "";
        });
        return row;
      });

      // Apply field mapping to preview if provided
      let preview = rows.slice(0, 5);
      if (fieldMapping) {
        preview = preview.map((row) => {
          const mapped: Record<string, string> = {};
          for (const [csvCol, fieldName] of Object.entries(fieldMapping)) {
            if (row[csvCol] !== undefined) {
              mapped[fieldName] = row[csvCol];
            }
          }
          return mapped;
        });
      }

      return { preview, totalRows: rows.length, columns };
    }),

  importMapped: tenantProcedure
    .input(
      z.object({
        rows: z.array(z.record(z.string(), z.string())),
        fieldMapping: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;
      const { rows, fieldMapping } = input;

      const validContactFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "company",
        "source",
      ];

      // Map rows using fieldMapping
      const mappedContacts: Array<{
        firstName: string;
        lastName?: string;
        email?: string;
        phone?: string;
        company?: string;
        source?: string;
        tags: string[];
      }> = [];

      const errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const contact: Record<string, string> = {};

        for (const [csvCol, fieldName] of Object.entries(fieldMapping)) {
          if (validContactFields.includes(fieldName) && row[csvCol]) {
            contact[fieldName] = row[csvCol]!;
          }
        }

        if (!contact.firstName) {
          errors.push({ row: i + 1, error: "Missing firstName" });
          continue;
        }

        mappedContacts.push({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          source: contact.source || "csv_import",
          tags: ["csv-import"],
        });
      }

      // Deduplicate by email within the batch
      const incomingEmails = mappedContacts
        .map((c) => c.email)
        .filter((e): e is string => !!e);

      const existingContacts =
        incomingEmails.length > 0
          ? await prisma.contact.findMany({
              where: { tenantId, email: { in: incomingEmails } },
              select: { email: true },
            })
          : [];

      const existingEmailSet = new Set(
        existingContacts.map((c) => c.email).filter(Boolean)
      );

      let toCreate = mappedContacts.filter(
        (c) => !c.email || !existingEmailSet.has(c.email)
      );

      const skipped = mappedContacts.length - toCreate.length;

      // Enforce contact limit: cap import to remaining capacity
      const limitInfo = await getContactLimitInfo(tenantId);
      let capped = 0;

      if (!limitInfo.unlimited && limitInfo.remaining <= 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Has alcanzado el limite de contactos de tu plan (${limitInfo.limit}). Actualiza tu plan para agregar mas.`,
        });
      }

      if (!limitInfo.unlimited && toCreate.length > limitInfo.remaining) {
        capped = toCreate.length - limitInfo.remaining;
        toCreate = toCreate.slice(0, limitInfo.remaining);
      }

      if (toCreate.length > 0) {
        await prisma.contact.createMany({
          data: toCreate.map((c) => ({
            tenantId,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            company: c.company,
            source: c.source,
            tags: c.tags,
          })),
        });
      }

      return {
        imported: toCreate.length,
        skipped,
        capped,
        errors,
      };
    }),

  exportCSV: tenantProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          scoreLabel: scoreLabelEnum.optional(),
          tags: z.array(z.string()).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        tenantId: ctx.effectiveTenantId,
      };

      if (input?.search) {
        where.OR = [
          { firstName: { contains: input.search, mode: "insensitive" } },
          { lastName: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { company: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input?.scoreLabel) {
        where.scoreLabel = input.scoreLabel;
      }

      if (input?.tags && input.tags.length > 0) {
        where.tags = { hasSome: input.tags };
      }

      const contacts = await prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const headers = [
        "Nombre",
        "Apellido",
        "Email",
        "Telefono",
        "Empresa",
        "Fuente",
        "Score",
        "Etiqueta",
        "Tags",
        "Creado",
      ];

      const rows = contacts.map((c) => [
        c.firstName,
        c.lastName ?? "",
        c.email ?? "",
        c.phone ?? "",
        c.company ?? "",
        c.source ?? "",
        String(c.score),
        c.scoreLabel,
        (c.tags ?? []).join("; "),
        c.createdAt.toISOString(),
      ]);

      return { csv: buildCsvString(headers, rows) };
    }),

  // ── Bulk operations ──────────────────────────────────────────────

  bulkDelete: tenantProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await prisma.contact.deleteMany({
        where: {
          id: { in: input.ids },
          tenantId: ctx.effectiveTenantId,
        },
      });

      return { deleted: result.count };
    }),

  bulkTag: tenantProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        tags: z.array(z.string()),
        action: z.enum(["add", "remove", "set"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;
      const { ids, tags, action } = input;

      if (action === "set") {
        const result = await prisma.contact.updateMany({
          where: { id: { in: ids }, tenantId },
          data: { tags: { set: tags } },
        });
        return { updated: result.count };
      }

      // For "add" and "remove" we need per-contact tag manipulation
      const contacts = await prisma.contact.findMany({
        where: { id: { in: ids }, tenantId },
        select: { id: true, tags: true },
      });

      if (contacts.length === 0) return { updated: 0 };

      if (action === "remove") {
        const removeSet = new Set(tags);
        const updates = contacts.map((c) =>
          prisma.contact.update({
            where: { id: c.id },
            data: { tags: c.tags.filter((t) => !removeSet.has(t)) },
          })
        );
        await prisma.$transaction(updates);
        return { updated: contacts.length };
      }

      // action === "add": append tags without duplicates
      const updates = contacts.map((c) => {
        const merged = Array.from(new Set([...c.tags, ...tags]));
        return prisma.contact.update({
          where: { id: c.id },
          data: { tags: merged },
        });
      });
      await prisma.$transaction(updates);
      return { updated: contacts.length };
    }),

  bulkUpdateScore: tenantProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        scoreLabel: scoreLabelEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await prisma.contact.updateMany({
        where: {
          id: { in: input.ids },
          tenantId: ctx.effectiveTenantId,
        },
        data: { scoreLabel: input.scoreLabel },
      });

      return { updated: result.count };
    }),

  bulkAssign: tenantProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(500),
        assignedTo: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await prisma.contact.updateMany({
        where: {
          id: { in: input.ids },
          tenantId: ctx.effectiveTenantId,
        },
        data: { assignedTo: input.assignedTo },
      });

      return { updated: result.count };
    }),

  updateScore: tenantProcedure
    .input(
      z.object({
        contactId: z.string().uuid(),
        score: z.number().int(),
        scoreLabel: scoreLabelEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, tenantId: ctx.effectiveTenantId },
      });

      if (!contact) throw new TRPCError({ code: "NOT_FOUND" });

      return prisma.contact.update({
        where: { id: input.contactId },
        data: { score: input.score, scoreLabel: input.scoreLabel },
      });
    }),

  // ── Saved filters ──────────────────────────────────────────────

  saveFilter: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        filters: z.record(z.unknown()),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.effectiveTenantId;
      const value = JSON.stringify({
        filters: input.filters,
        description: input.description,
      });

      return prisma.aiMemory.upsert({
        where: {
          tenantId_category_key: {
            tenantId,
            category: "saved_filter",
            key: input.name,
          },
        },
        create: {
          tenantId,
          category: "saved_filter",
          key: input.name,
          value,
          source: "contacts",
        },
        update: { value },
      });
    }),

  listSavedFilters: tenantProcedure.query(async ({ ctx }) => {
    const memories = await prisma.aiMemory.findMany({
      where: {
        tenantId: ctx.effectiveTenantId,
        category: "saved_filter",
      },
      orderBy: { updatedAt: "desc" },
    });

    return memories.map((m) => {
      const parsed = JSON.parse(m.value) as {
        filters: Record<string, unknown>;
        description?: string;
      };
      return {
        id: m.id,
        name: m.key,
        filters: parsed.filters,
        description: parsed.description,
        updatedAt: m.updatedAt,
      };
    });
  }),

  deleteSavedFilter: tenantProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await prisma.aiMemory.deleteMany({
        where: {
          tenantId: ctx.effectiveTenantId,
          category: "saved_filter",
          key: input.name,
        },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Saved filter not found" });
      }

      return { success: true };
    }),

  // ── Filter counts / sidebar badges ─────────────────────────────

  getFilterCounts: tenantProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.effectiveTenantId;

    const [
      total,
      hotCount,
      warmCount,
      coldCount,
      withEmail,
      withPhone,
      sourceGroups,
    ] = await Promise.all([
      prisma.contact.count({ where: { tenantId } }),
      prisma.contact.count({ where: { tenantId, scoreLabel: "HOT" } }),
      prisma.contact.count({ where: { tenantId, scoreLabel: "WARM" } }),
      prisma.contact.count({ where: { tenantId, scoreLabel: "COLD" } }),
      prisma.contact.count({ where: { tenantId, email: { not: null } } }),
      prisma.contact.count({ where: { tenantId, phone: { not: null } } }),
      prisma.contact.groupBy({
        by: ["source"],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byScoreLabel: {
        HOT: hotCount,
        WARM: warmCount,
        COLD: coldCount,
      },
      bySource: sourceGroups.map((g) => ({
        source: g.source ?? "unknown",
        count: g._count.id,
      })),
      withEmail,
      withoutEmail: total - withEmail,
      withPhone,
      withoutPhone: total - withPhone,
    };
  }),
});
