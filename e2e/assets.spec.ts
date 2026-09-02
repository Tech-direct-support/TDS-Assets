import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Asset register", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("creates an asset, sees it in the register, and archives it", async ({ page }) => {
    const tag = `E2E-${Date.now()}`;
    const name = "Playwright Test Laptop";

    await page.goto("/assets/new");
    await page.getByPlaceholder("LAP-1024").fill(tag);
    await page.getByPlaceholder("Dell Latitude 5440").fill(name);
    await page.getByRole("button", { name: "Create Asset" }).click();

    await expect(page).toHaveURL(/\/assets\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(tag)).toBeVisible();

    await page.goto("/assets");
    await page.getByPlaceholder(/search name, tag, serial/i).fill(tag);
    await expect(page.getByRole("link", { name: tag })).toBeVisible();

    await page.getByRole("link", { name: tag }).click();
    await expect(page).toHaveURL(/\/assets\/[0-9a-f-]+$/);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /archive/i }).click();
    await expect(page).toHaveURL(/\/assets$/);
  });
});
