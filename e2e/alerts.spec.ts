import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Alerts", () => {
  test("shows the open alerts list and can open an alert", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/alerts");
    await expect(page.getByRole("heading", { name: "Alerts", level: 2 })).toBeVisible();

    const firstAlertLink = page.locator('a[href^="/alerts/"]').first();
    if (await firstAlertLink.count()) {
      await firstAlertLink.click();
      await expect(page).toHaveURL(/\/alerts\/[0-9a-f-]+$/);
    }
  });
});
