import { describe, it, expect } from "vitest";
import { PLAN_ORDER, PLAN_LIMITS, PLAN_PRICES } from "../plans";

describe("PLAN_ORDER", () => {
  it("should have 4 plans in ascending order", () => {
    expect(PLAN_ORDER.INICIO).toBe(0);
    expect(PLAN_ORDER.CRECIMIENTO).toBe(1);
    expect(PLAN_ORDER.PROFESIONAL).toBe(2);
    expect(PLAN_ORDER.AGENCIA).toBe(3);
  });

  it("should enforce INICIO < CRECIMIENTO < PROFESIONAL < AGENCIA", () => {
    expect(PLAN_ORDER.INICIO).toBeLessThan(PLAN_ORDER.CRECIMIENTO);
    expect(PLAN_ORDER.CRECIMIENTO).toBeLessThan(PLAN_ORDER.PROFESIONAL);
    expect(PLAN_ORDER.PROFESIONAL).toBeLessThan(PLAN_ORDER.AGENCIA);
  });
});

describe("PLAN_LIMITS", () => {
  it("should enforce contact limits per plan", () => {
    expect(PLAN_LIMITS.INICIO.maxContacts).toBe(500);
    expect(PLAN_LIMITS.CRECIMIENTO.maxContacts).toBe(5000);
    expect(PLAN_LIMITS.PROFESIONAL.maxContacts).toBe(25000);
    expect(PLAN_LIMITS.AGENCIA.maxContacts).toBe(-1); // unlimited
  });

  it("should assign correct AI tiers", () => {
    expect(PLAN_LIMITS.INICIO.aiTier).toBe("haiku");
    expect(PLAN_LIMITS.CRECIMIENTO.aiTier).toBe("sonnet");
    expect(PLAN_LIMITS.PROFESIONAL.aiTier).toBe("opus");
    expect(PLAN_LIMITS.AGENCIA.aiTier).toBe("opus");
  });

  it("should not allow workflows on INICIO", () => {
    expect(PLAN_LIMITS.INICIO.canSaveWorkflows).toBe(false);
    expect(PLAN_LIMITS.CRECIMIENTO.canSaveWorkflows).toBe(true);
  });

  it("should require approval only on CRECIMIENTO", () => {
    expect(PLAN_LIMITS.INICIO.requiresApproval).toBe(false);
    expect(PLAN_LIMITS.CRECIMIENTO.requiresApproval).toBe(true);
    expect(PLAN_LIMITS.PROFESIONAL.requiresApproval).toBe(false);
    expect(PLAN_LIMITS.AGENCIA.requiresApproval).toBe(false);
  });

  it("should enable media generation only on PROFESIONAL+", () => {
    expect(PLAN_LIMITS.INICIO.mediaGeneration).toBe(false);
    expect(PLAN_LIMITS.CRECIMIENTO.mediaGeneration).toBe(false);
    expect(PLAN_LIMITS.PROFESIONAL.mediaGeneration).toBe(true);
    expect(PLAN_LIMITS.AGENCIA.mediaGeneration).toBe(true);
  });

  it("should grant AGENCIA unlimited contacts and emails", () => {
    expect(PLAN_LIMITS.AGENCIA.maxContacts).toBe(-1);
    expect(PLAN_LIMITS.AGENCIA.maxEmails).toBe(-1);
    expect(PLAN_LIMITS.AGENCIA.aiImages).toBe(-1);
    expect(PLAN_LIMITS.AGENCIA.aiReplies).toBe(-1);
  });
});

describe("PLAN_PRICES", () => {
  it("should have a price ID for each plan", () => {
    expect(PLAN_PRICES.INICIO).toBeDefined();
    expect(PLAN_PRICES.CRECIMIENTO).toBeDefined();
    expect(PLAN_PRICES.PROFESIONAL).toBeDefined();
    expect(PLAN_PRICES.AGENCIA).toBeDefined();
  });

  it("should have same keys as PLAN_ORDER", () => {
    const orderKeys = Object.keys(PLAN_ORDER).sort();
    const priceKeys = Object.keys(PLAN_PRICES).sort();
    expect(priceKeys).toEqual(orderKeys);
  });
});
