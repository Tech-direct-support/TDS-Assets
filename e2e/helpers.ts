import type { Page } from "@playwright/test";

// Matches supabase/seed.mjs defaults — override with TEST_ADMIN_EMAIL /
// TEST_ADMIN_PASSWORD if you seeded with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
export const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "techdirectsupport9@gmail.com";
export const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "TdsDemo!2026";

export async function login(page: Page, email = TEST_ADMIN_EMAIL, password = TEST_ADMIN_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}
