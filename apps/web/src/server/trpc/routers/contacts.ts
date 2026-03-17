import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

const scoreLabelEnum = z.enum(["HOT", "WARM", "COLD"]);

export const contactsRouter = router({
  list: tenantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        scoreLabel: scoreLabelEnum.optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, scoreLabel, tags } = input;
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

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
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
      return prisma.contact.create({
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

      const toCreate = input.contacts.filter(
        (c) => !c.email || !existingEmailSet.has(c.email)
      );

      const skipped = input.contacts.length - toCreate.length;

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

      return { imported: toCreate.length, skipped };
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

      const toCreate = mappedContacts.filter(
        (c) => !c.email || !existingEmailSet.has(c.email)
      );

      const skipped = mappedContacts.length - toCreate.length;

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
        errors,
      };
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
});
