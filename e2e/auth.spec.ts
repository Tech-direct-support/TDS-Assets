import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from "./helpers";

test.describe("Authentication", () => {
  test("rejects an invalid login", async ({ page }) => {
    await login(page, "nobody@example.com", "wrong-password");
    await expect(page.getByText(/invalid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in with valid credentials and reaches the dashboard", async ({ page }) => {
    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("redirects an unauthenticated visitor away from a protected page", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
