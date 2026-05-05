import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";
import { TRPCError } from "@trpc/server";

export const tenantRouter = router({
  /** Get tenant details */
  get: tenantProcedure.query(async ({ ctx }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.effectiveTenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        companySize: true,
        plan: true,
        language: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant no encontrado" });
    }

    return tenant;
  }),

  /** Update tenant details (Admin only) */
  update: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        industry: z.string().max(100).optional(),
        companySize: z.string().max(50).optional(),
        language: z.string().max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role.name !== "Admin" && !ctx.dbUser.isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo los administradores pueden actualizar la configuración",
        });
      }

      const data: Record<string, string> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.industry !== undefined) data.industry = input.industry;
      if (input.companySize !== undefined) data.companySize = input.companySize;
      if (input.language !== undefined) data.language = input.language;

      if (Object.keys(data).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se proporcionaron campos para actualizar",
        });
      }

      const updated = await prisma.tenant.update({
        where: { id: ctx.effectiveTenantId },
        data,
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          companySize: true,
          plan: true,
          language: true,
        },
      });

      // Apply industry presets when industry is set for the first time
      if (input.industry) {
        await applyIndustryPresets(ctx.effectiveTenantId, input.industry).catch((err) => {
          console.error("[Industry Presets] Failed:", err);
        });
      }

      return updated;
    }),
});

// ── Industry-specific presets ─────────────────────────────────────────────

const INDUSTRY_PIPELINES: Record<string, Array<{ id: string; name: string; order: number; color: string }>> = {
  "Bienes Raices": [
    { id: "new_lead", name: "Nuevo Lead", order: 0, color: "#6366f1" },
    { id: "contacted", name: "Contactado", order: 1, color: "#8b5cf6" },
    { id: "showing", name: "Mostrando Propiedad", order: 2, color: "#f59e0b" },
    { id: "offer", name: "Oferta", order: 3, color: "#3b82f6" },
    { id: "negotiation", name: "Negociacion", order: 4, color: "#f97316" },
    { id: "closing", name: "Cierre", order: 5, color: "#06b6d4" },
    { id: "won", name: "Vendido", order: 6, color: "#22c55e" },
    { id: "lost", name: "Perdido", order: 7, color: "#ef4444" },
  ],
  "E-commerce": [
    { id: "visitor", name: "Visitante", order: 0, color: "#6366f1" },
    { id: "cart", name: "Carrito", order: 1, color: "#f59e0b" },
    { id: "checkout", name: "Checkout", order: 2, color: "#3b82f6" },
    { id: "purchased", name: "Comprado", order: 3, color: "#22c55e" },
    { id: "repeat", name: "Recurrente", order: 4, color: "#06b6d4" },
    { id: "lost", name: "Perdido", order: 5, color: "#ef4444" },
  ],
  "Marketing y Publicidad": [
    { id: "prospect", name: "Prospecto", order: 0, color: "#6366f1" },
    { id: "discovery", name: "Discovery Call", order: 1, color: "#8b5cf6" },
    { id: "proposal", name: "Propuesta", order: 2, color: "#f59e0b" },
    { id: "review", name: "En Revision", order: 3, color: "#3b82f6" },
    { id: "contract", name: "Contrato", order: 4, color: "#06b6d4" },
    { id: "won", name: "Cliente", order: 5, color: "#22c55e" },
    { id: "lost", name: "Perdido", order: 6, color: "#ef4444" },
  ],
};

const INDUSTRY_FIELDS: Record<string, Array<{ name: string; key: string; type: string; entity: string; options?: string[] }>> = {
  "Bienes Raices": [
    { name: "Tipo de Propiedad", key: "property_type", type: "DROPDOWN", entity: "deal", options: ["Casa", "Apartamento", "Terreno", "Local Comercial", "Oficina", "Bodega", "Finca"] },
    { name: "Ubicacion", key: "location", type: "TEXT", entity: "deal" },
    { name: "Presupuesto", key: "budget", type: "NUMBER", entity: "contact" },
    { name: "Metros Cuadrados", key: "sqm", type: "NUMBER", entity: "deal" },
    { name: "Precio de Lista", key: "listing_price", type: "NUMBER", entity: "deal" },
    { name: "Tipo de Operacion", key: "operation_type", type: "DROPDOWN", entity: "deal", options: ["Venta", "Alquiler", "Alquiler con Opcion de Compra"] },
    { name: "Zona", key: "zone", type: "DROPDOWN", entity: "contact", options: ["San Jose", "Escazu", "Santa Ana", "Heredia", "Cartago", "Guanacaste", "Puntarenas", "Limon"] },
    { name: "Numero de Habitaciones", key: "bedrooms", type: "NUMBER", entity: "deal" },
  ],
};

const INDUSTRY_EMAIL_TEMPLATES: Record<string, Array<{ name: string; subject: string; html: string }>> = {
  "Bienes Raices": [
    {
      name: "Bienvenida - Nuevo Lead",
      subject: "Hola {{nombre}}, encontremos tu propiedad ideal",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Hola {{nombre}}!</h2>
        <p style="color: #444; line-height: 1.6;">Gracias por tu interes en nuestras propiedades. Soy tu asesor inmobiliario y estoy aqui para ayudarte a encontrar exactamente lo que buscas.</p>
        <p style="color: #444; line-height: 1.6;">Para poder asesorarte mejor, me gustaria saber:</p>
        <ul style="color: #444; line-height: 1.8;">
          <li>Que tipo de propiedad te interesa?</li>
          <li>En que zona prefieres?</li>
          <li>Cual es tu rango de presupuesto?</li>
        </ul>
        <p style="color: #444; line-height: 1.6;">Puedes responder este correo o escribirme por WhatsApp para agendar una visita.</p>
        <p style="color: #444;">Saludos,<br/>{{empresa}}</p>
      </div>`,
    },
    {
      name: "Seguimiento - Post Visita",
      subject: "Como te parecio la propiedad, {{nombre}}?",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Hola {{nombre}},</h2>
        <p style="color: #444; line-height: 1.6;">Espero que hayas disfrutado la visita a la propiedad. Me encantaria saber que te parecio.</p>
        <p style="color: #444; line-height: 1.6;">Si tienes alguna pregunta sobre la propiedad, el proceso de compra, o te gustaria ver mas opciones, no dudes en escribirme.</p>
        <p style="color: #444; line-height: 1.6;">Tambien tenemos otras propiedades similares que podrian interesarte. Quieres que te envie una seleccion?</p>
        <p style="color: #444;">Un saludo,<br/>{{empresa}}</p>
      </div>`,
    },
    {
      name: "Nueva Propiedad Disponible",
      subject: "{{nombre}}, nueva propiedad que te puede interesar",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Hola {{nombre}},</h2>
        <p style="color: #444; line-height: 1.6;">Tenemos una nueva propiedad que coincide con lo que estas buscando:</p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #1a1a1a; font-weight: bold; margin: 0;">Detalles de la propiedad</p>
          <p style="color: #666; margin: 8px 0 0 0;">Contactanos para agendar una visita y conocer todos los detalles.</p>
        </div>
        <p style="color: #444; line-height: 1.6;">Te gustaria agendar una visita? Respondeme a este correo o escribe por WhatsApp.</p>
        <p style="color: #444;">Saludos,<br/>{{empresa}}</p>
      </div>`,
    },
  ],
};

async function applyIndustryPresets(tenantId: string, industry: string) {
  // Check if presets were already applied (avoid duplicates)
  const existingFields = await prisma.fieldDefinition.count({ where: { tenantId } });
  if (existingFields > 0) return;

  // Apply pipeline
  const stages = INDUSTRY_PIPELINES[industry];
  if (stages) {
    // Update the default pipeline with industry-specific stages
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
    });
    if (defaultPipeline) {
      await prisma.pipeline.update({
        where: { id: defaultPipeline.id },
        data: { stages, name: industry === "Bienes Raices" ? "Pipeline Inmobiliario" : "Principal" },
      });
    }
  }

  // Apply custom fields
  const fields = INDUSTRY_FIELDS[industry];
  if (fields) {
    for (const field of fields) {
      await prisma.fieldDefinition.create({
        data: {
          tenantId,
          name: field.name,
          key: field.key,
          type: field.type as "TEXT" | "NUMBER" | "DROPDOWN" | "DATE" | "BOOLEAN" | "EMAIL" | "PHONE" | "URL",
          entity: field.entity,
          options: field.options ?? [],
        },
      });
    }
  }

  // Apply email templates
  const templates = INDUSTRY_EMAIL_TEMPLATES[industry];
  if (templates) {
    for (const tmpl of templates) {
      await prisma.emailTemplate.create({
        data: {
          tenantId,
          name: tmpl.name,
          subject: tmpl.subject,
          content: {},
          html: tmpl.html,
        },
      });
    }
  }
}
