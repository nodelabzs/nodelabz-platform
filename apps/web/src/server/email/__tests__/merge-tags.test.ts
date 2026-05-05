import { describe, it, expect } from "vitest";
import { applyMergeTags } from "../resend";

describe("applyMergeTags", () => {
  it("should replace a single merge tag", () => {
    const result = applyMergeTags("Hola {{nombre}}", { nombre: "Federico" });
    expect(result).toBe("Hola Federico");
  });

  it("should replace multiple different merge tags", () => {
    const template = "Hola {{nombre}}, tu empresa {{empresa}} tiene {{deals}} deals.";
    const result = applyMergeTags(template, {
      nombre: "Federico",
      empresa: "NodeLabz",
      deals: "5",
    });
    expect(result).toBe("Hola Federico, tu empresa NodeLabz tiene 5 deals.");
  });

  it("should replace all occurrences of the same tag", () => {
    const result = applyMergeTags("{{nombre}} — by {{nombre}}", { nombre: "Ana" });
    expect(result).toBe("Ana — by Ana");
  });

  it("should leave unmatched tags as-is", () => {
    const result = applyMergeTags("Hola {{nombre}}, {{unknown}}", { nombre: "Test" });
    expect(result).toBe("Hola Test, {{unknown}}");
  });

  it("should handle empty tags object", () => {
    const result = applyMergeTags("Hola {{nombre}}", {});
    expect(result).toBe("Hola {{nombre}}");
  });

  it("should handle empty template", () => {
    const result = applyMergeTags("", { nombre: "Test" });
    expect(result).toBe("");
  });

  it("should handle special characters in values", () => {
    const result = applyMergeTags("Email: {{email}}", {
      email: "user+test@example.com",
    });
    expect(result).toBe("Email: user+test@example.com");
  });
});
