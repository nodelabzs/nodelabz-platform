import { createAndNotify } from "../trpc/routers/notifications";

// ── Integration Sync Notification ────────────────────────────────────────

/**
 * Notify tenant members about an integration sync completing (success or failure).
 */
export async function notifyIntegrationSync(
  tenantId: string,
  platform: string,
  success: boolean,
  details?: string
) {
  const platformLabel = platform.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  await createAndNotify({
    tenantId,
    type: "integration_sync",
    title: success
      ? `${platformLabel} sincronizado`
      : `Error en ${platformLabel}`,
    body: success
      ? `La sincronizacion de ${platformLabel} se completo correctamente.${details ? ` ${details}` : ""}`
      : `La sincronizacion de ${platformLabel} fallo.${details ? ` ${details}` : ""}`,
    metadata: { platform, success, details },
  });
}

// ── New Lead Notification ────────────────────────────────────────────────

/**
 * Notify tenant members about a new HOT lead/contact.
 */
export async function notifyNewLead(tenantId: string, contactName: string) {
  await createAndNotify({
    tenantId,
    type: "new_lead",
    title: "Nuevo lead HOT",
    body: `${contactName} fue creado como contacto con puntuacion HOT.`,
    metadata: { contactName },
  });
}

// ── Deal Won Notification ────────────────────────────────────────────────

/**
 * Notify tenant members about a deal being closed as won.
 */
export async function notifyDealWon(
  tenantId: string,
  dealTitle: string,
  value: number | null
) {
  const valueStr = value != null ? ` por $${value.toLocaleString()}` : "";

  await createAndNotify({
    tenantId,
    type: "deal_won",
    title: "Deal ganado",
    body: `El deal "${dealTitle}" fue cerrado como ganado${valueStr}.`,
    metadata: { dealTitle, value },
  });
}

// ── Health Score Drop Notification ───────────────────────────────────────

/**
 * Notify tenant members when a health score drops significantly.
 */
export async function notifyHealthDrop(
  tenantId: string,
  oldScore: number,
  newScore: number
) {
  await createAndNotify({
    tenantId,
    type: "health_drop",
    title: "Alerta: puntuacion de salud bajo",
    body: `La puntuacion de salud bajo de ${oldScore} a ${newScore}.`,
    metadata: { oldScore, newScore },
  });
}
