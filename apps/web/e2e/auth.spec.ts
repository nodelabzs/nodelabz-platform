import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByText("Bienvenido")).toBeVisible();
    await expect(page.getByText("Inicia sesion para continuar")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contrasena")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "GitHub" })).toBeVisible();
    await expect(page.getByText("Registrate")).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/auth/signup");

    await expect(page.getByRole("heading", { name: "Crear cuenta" })).toBeVisible();
    await expect(page.getByText("Prueba gratis por 7 dias")).toBeVisible();
    await expect(page.getByLabel("Tu nombre")).toBeVisible();
    await expect(page.getByLabel("Nombre de tu empresa")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contrasena")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear cuenta gratis" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "GitHub" })).toBeVisible();
  });

  test("forgot password page renders correctly", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    await expect(page.getByText("Recuperar acceso")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar enlace" })).toBeVisible();
  });

  test("navigate between login and signup", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByText("Registrate").click();
    await expect(page).toHaveURL(/\/auth\/signup/);

    await page.getByText("Inicia sesion", { exact: false }).first().click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("navigate to forgot password", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByText("Olvidaste tu contrasena?").click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });

  test("login shows error with invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByLabel("Email").fill("nonexistent@test.com");
    await page.getByLabel("Contrasena").fill("wrongpassword");
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await expect(page.getByText(/incorrectos|Invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test("unauthenticated user redirected to login from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("unauthenticated user redirected to login from root", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
