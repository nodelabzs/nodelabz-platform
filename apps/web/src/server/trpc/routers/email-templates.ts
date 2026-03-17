import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@nodelabz/db";
import { router, tenantProcedure } from "../init";
import { applyMergeTags } from "@/server/email/resend";

// ------------------------------------------------------------------
// Simple JSON-to-HTML renderer for the email builder blocks
// ------------------------------------------------------------------

interface EmailBlock {
  type: string;
  props?: Record<string, unknown>;
  children?: EmailBlock[];
}

function renderBlockToHtml(block: EmailBlock): string {
  const p = block.props || {};

  switch (block.type) {
    case "header_image":
      return `<div style="text-align:center;"><img src="${p.src || ""}" alt="${p.alt || ""}" style="max-width:100%;height:auto;" /></div>`;

    case "text":
      return `<p style="margin:0 0 16px;${p.style || ""}">${p.text || ""}</p>`;

    case "button":
      return `<div style="text-align:${p.align || "center"};margin:16px 0;">
        <a href="${p.url || "#"}" style="display:inline-block;padding:12px 24px;background:${p.color || "#2563eb"};color:${p.textColor || "#ffffff"};text-decoration:none;border-radius:6px;font-weight:600;">${p.label || "Click"}</a>
      </div>`;

    case "image":
      return `<div style="text-align:${p.align || "center"};margin:16px 0;"><img src="${p.src || ""}" alt="${p.alt || ""}" style="max-width:${p.width || "100%"};height:auto;" /></div>`;

    case "divider":
      return `<hr style="border:none;border-top:1px solid ${p.color || "#e5e7eb"};margin:24px 0;" />`;

    case "two_columns": {
      const left = (p.left as EmailBlock[]) || [];
      const right = (p.right as EmailBlock[]) || [];
      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr>
          <td width="50%" valign="top" style="padding-right:8px;">${left.map(renderBlockToHtml).join("")}</td>
          <td width="50%" valign="top" style="padding-left:8px;">${right.map(renderBlockToHtml).join("")}</td>
        </tr>
      </table>`;
    }

    case "spacer":
      return `<div style="height:${p.height || "24px"};"></div>`;

    default:
      return "";
  }
}

function renderContentToHtml(content: unknown): string {
  const blocks = Array.isArray(content) ? (content as EmailBlock[]) : [];
  const inner = blocks.map(renderBlockToHtml).join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
    ${inner}
  </div>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Router
// ------------------------------------------------------------------

export const emailTemplatesRouter = router({
  /**
   * List all templates for the tenant, ordered by most recently updated.
   */
  list: tenantProcedure.query(async ({ ctx }) => {
    return prisma.emailTemplate.findMany({
      where: { tenantId: ctx.effectiveTenantId },
      orderBy: { updatedAt: "desc" },
    });
  }),

  /**
   * Get a single template by id.
   */
  get: tenantProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await prisma.emailTemplate.findFirst({
        where: { id: input.templateId, tenantId: ctx.effectiveTenantId },
      });
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }
      return template;
    }),

  /**
   * Create a new email template.
   */
  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        content: z.any(), // JSON from email builder
      })
    )
    .mutation(async ({ ctx, input }) => {
      const html = renderContentToHtml(input.content);
      return prisma.emailTemplate.create({
        data: {
          tenantId: ctx.effectiveTenantId,
          name: input.name,
          subject: input.subject,
          content: input.content,
          html,
        },
      });
    }),

  /**
   * Update an existing template.
   */
  update: tenantProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1).optional(),
        subject: z.string().min(1).optional(),
        content: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.emailTemplate.findFirst({
        where: { id: input.templateId, tenantId: ctx.effectiveTenantId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.subject !== undefined) data.subject = input.subject;
      if (input.content !== undefined) {
        data.content = input.content;
        data.html = renderContentToHtml(input.content);
      }

      return prisma.emailTemplate.update({
        where: { id: input.templateId },
        data,
      });
    }),

  /**
   * Delete a template.
   */
  delete: tenantProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.emailTemplate.findFirst({
        where: { id: input.templateId, tenantId: ctx.effectiveTenantId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }
      await prisma.emailTemplate.delete({ where: { id: input.templateId } });
      return { success: true };
    }),

  /**
   * Preview a template with optional merge fields applied.
   */
  preview: tenantProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        mergeFields: z.record(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const template = await prisma.emailTemplate.findFirst({
        where: { id: input.templateId, tenantId: ctx.effectiveTenantId },
      });
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
      }

      let html = template.html || renderContentToHtml(template.content);
      if (input.mergeFields) {
        html = applyMergeTags(html, input.mergeFields);
      }

      return { html };
    }),
});
