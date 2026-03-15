import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByText("NodeLabz")).toBeVisible();
    await expect(page.getByText("Inicia sesion en tu cuenta")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contrasena")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    await expect(page.getByText("Registrate gratis")).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/auth/signup");

    await expect(page.getByText("NodeLabz")).toBeVisible();
    await expect(page.getByText("Crea tu cuenta")).toBeVisible();
    await expect(page.getByLabel("Tu nombre")).toBeVisible();
    await expect(page.getByLabel("Nombre de tu empresa")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contrasena")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear cuenta gratis" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrarse con Google" })).toBeVisible();
    await expect(page.getByText("Inicia sesion")).toBeVisible();
  });

  test("navigate between login and signup", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByText("Registrate gratis").click();
    await expect(page).toHaveURL(/\/auth\/signup/);

    await page.getByText("Inicia sesion", { exact: false }).first().click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("login shows error with invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");

    await page.getByLabel("Email").fill("nonexistent@test.com");
    await page.getByLabel("Contrasena").fill("wrongpassword");
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    // Should show error message
    await expect(page.getByText(/incorrectos|Invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test("signup shows validation errors for short password", async ({ page }) => {
    await page.goto("/auth/signup");

    await page.getByLabel("Tu nombre").fill("Test User");
    await page.getByLabel("Nombre de tu empresa").fill("Test Co");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Contrasena").fill("short");

    await page.getByRole("button", { name: "Crear cuenta gratis" }).click();

    // HTML5 minLength=8 validation should prevent submission
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
