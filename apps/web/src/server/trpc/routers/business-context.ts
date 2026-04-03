import { z } from "zod";
import { router, tenantProcedure } from "../init";
import { prisma } from "@nodelabz/db";

const businessContextSchema = z.object({
  businessName: z.string().min(1),
  description: z.string().min(1),
  services: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      price: z.string().optional(),
    })
  ),
  businessHours: z.object({
    weekdays: z.string(),
    weekends: z.string(),
    timezone: z.string(),
  }),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
  }),
  faqs: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
    })
  ),
  tone: z.enum(["professional", "friendly", "casual", "formal"]),
  language: z.enum(["es", "en"]),
  autoReplyEnabled: z.boolean(),
  qualifyLeads: z.boolean(),
  createDeals: z.boolean(),
  customInstructions: z.string(),
});

export type BusinessContext = z.infer<typeof businessContextSchema>;

export const businessContextRouter = router({
  get: tenantProcedure.query(async ({ ctx }) => {
    const mem = await prisma.aiMemory.findUnique({
      where: {
        tenantId_category_key: {
          tenantId: ctx.effectiveTenantId,
          category: "business_context",
          key: "default",
        },
      },
    });

    if (!mem) return null;

    try {
      return JSON.parse(mem.value) as BusinessContext;
    } catch {
      return null;
    }
  }),

  save: tenantProcedure
    .input(businessContextSchema)
    .mutation(async ({ ctx, input }) => {
      const value = JSON.stringify(input);

      return prisma.aiMemory.upsert({
        where: {
          tenantId_category_key: {
            tenantId: ctx.effectiveTenantId,
            category: "business_context",
            key: "default",
          },
        },
        update: { value },
        create: {
          tenantId: ctx.effectiveTenantId,
          category: "business_context",
          key: "default",
          value,
          source: "settings_ui",
        },
      });
    }),

  buildSystemPrompt: tenantProcedure.query(async ({ ctx }) => {
    const mem = await prisma.aiMemory.findUnique({
      where: {
        tenantId_category_key: {
          tenantId: ctx.effectiveTenantId,
          category: "business_context",
          key: "default",
        },
      },
    });

    if (!mem) return null;

    let biz: BusinessContext;
    try {
      biz = JSON.parse(mem.value) as BusinessContext;
    } catch {
      return null;
    }

    const lang = biz.language === "es" ? "es" : "en";

    const toneMap: Record<string, string> = {
      professional:
        lang === "es"
          ? "Usa un tono profesional y corporativo."
          : "Use a professional and corporate tone.",
      friendly:
        lang === "es"
          ? "Usa un tono amigable y cercano, como un amigo que ayuda."
          : "Use a friendly and approachable tone, like a helpful friend.",
      casual:
        lang === "es"
          ? "Usa un tono casual y relajado."
          : "Use a casual and relaxed tone.",
      formal:
        lang === "es"
          ? "Usa un tono formal y respetuoso."
          : "Use a formal and respectful tone.",
    };

    const servicesBlock = biz.services
      .map((s) => {
        const price = s.price ? ` — Precio: ${s.price}` : "";
        return `- ${s.name}: ${s.description}${price}`;
      })
      .join("\n");

    const faqsBlock = biz.faqs
      .map((f) => `P: ${f.question}\nR: ${f.answer}`)
      .join("\n\n");

    const contactParts: string[] = [];
    if (biz.contactInfo.phone) contactParts.push(`Telefono: ${biz.contactInfo.phone}`);
    if (biz.contactInfo.email) contactParts.push(`Email: ${biz.contactInfo.email}`);
    if (biz.contactInfo.website) contactParts.push(`Web: ${biz.contactInfo.website}`);
    if (biz.contactInfo.address) contactParts.push(`Direccion: ${biz.contactInfo.address}`);

    const isEs = lang === "es";

    const prompt = `${isEs ? "Eres el asistente virtual de" : "You are the virtual assistant for"} ${biz.businessName}.

${isEs ? "DESCRIPCION DEL NEGOCIO" : "BUSINESS DESCRIPTION"}:
${biz.description}

${isEs ? "SERVICIOS Y PRODUCTOS" : "SERVICES AND PRODUCTS"}:
${servicesBlock}

${isEs ? "HORARIO DE ATENCION" : "BUSINESS HOURS"}:
- ${isEs ? "Lunes a Viernes" : "Weekdays"}: ${biz.businessHours.weekdays}
- ${isEs ? "Fines de semana" : "Weekends"}: ${biz.businessHours.weekends}
- ${isEs ? "Zona horaria" : "Timezone"}: ${biz.businessHours.timezone}

${isEs ? "INFORMACION DE CONTACTO" : "CONTACT INFO"}:
${contactParts.join("\n")}

${isEs ? "PREGUNTAS FRECUENTES" : "FREQUENTLY ASKED QUESTIONS"}:
${faqsBlock}

${isEs ? "INSTRUCCIONES" : "INSTRUCTIONS"}:
${toneMap[biz.tone] ?? toneMap.professional}
${isEs ? "Responde siempre en espanol." : "Always respond in English."}

${isEs
  ? `REGLAS IMPORTANTES:
- SOLO responde con informacion proporcionada arriba. NUNCA inventes servicios, precios, horarios o datos que no esten aqui.
- Si no tienes la respuesta, di que vas a consultar con el equipo y responder pronto.
- No compartas informacion interna o confidencial del negocio.
- Se conciso y directo en tus respuestas.`
  : `IMPORTANT RULES:
- ONLY respond with information provided above. NEVER make up services, prices, schedules, or data not listed here.
- If you don't have the answer, say you will check with the team and respond soon.
- Do not share internal or confidential business information.
- Be concise and direct in your responses.`}

${biz.qualifyLeads
  ? isEs
    ? `CALIFICACION DE LEADS:
- Identifica intencion de compra en los mensajes del usuario.
- Clasifica al lead como: frio (solo pregunta), tibio (muestra interes), caliente (quiere comprar/contratar).
- Si el lead es caliente, solicita nombre completo, email y telefono para dar seguimiento.`
    : `LEAD QUALIFICATION:
- Identify buying intent in user messages.
- Classify the lead as: cold (just asking), warm (shows interest), hot (wants to buy/hire).
- If the lead is hot, ask for full name, email and phone for follow-up.`
  : ""}

${biz.createDeals
  ? isEs
    ? `CREACION DE DEALS:
- Cuando un lead este calificado como caliente y haya proporcionado sus datos, indica que se creara una oportunidad de venta para darle seguimiento personalizado.`
    : `DEAL CREATION:
- When a lead is qualified as hot and has provided their info, indicate that a sales opportunity will be created for personalized follow-up.`
  : ""}

${biz.customInstructions ? `${isEs ? "INSTRUCCIONES ADICIONALES" : "ADDITIONAL INSTRUCTIONS"}:\n${biz.customInstructions}` : ""}`.trim();

    return prompt;
  }),
});
