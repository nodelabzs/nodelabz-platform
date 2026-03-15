import { describe, it, expect } from "vitest";
import { signUpSchema, signInSchema } from "@nodelabz/shared-types";

describe("signUpSchema", () => {
  it("should accept valid signup data", () => {
    const result = signUpSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
      companyName: "Test Company",
      language: "es",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      password: "password123",
      name: "Test User",
      companyName: "Test Company",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short password", () => {
    const result = signUpSchema.safeParse({
      email: "test@example.com",
      password: "short",
      name: "Test User",
      companyName: "Test Company",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing company name", () => {
    const result = signUpSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short name", () => {
    const result = signUpSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      name: "A",
      companyName: "Test Company",
    });
    expect(result.success).toBe(false);
  });

  it("should default language to es", () => {
    const result = signUpSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
      companyName: "Test Company",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("es");
    }
  });

  it("should accept en as language", () => {
    const result = signUpSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
      companyName: "Test Company",
      language: "en",
    });
    expect(result.success).toBe(true);
  });
});

describe("signInSchema", () => {
  it("should accept valid login data", () => {
    const result = signInSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = signInSchema.safeParse({
      email: "bad",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty password", () => {
    const result = signInSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
