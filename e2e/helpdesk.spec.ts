import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Helpdesk", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("creates a ticket and adds a comment", async ({ page }) => {
    const subject = `E2E ticket ${Date.now()}`;

    await page.goto("/helpdesk/new");
    await page.getByPlaceholder("My laptop has been stolen").fill(subject);
    await page.locator("textarea").fill("Created by the Playwright end-to-end test suite.");
    await page.getByRole("button", { name: "Create Ticket" }).click();

    // The related-asset dropdown renders one <option> per asset (250+ in the
    // seed data), which makes this particular submit slower than the rest.
    await expect(page).toHaveURL(/\/helpdesk\/[0-9a-f-]+$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: subject })).toBeVisible();

    await page.getByPlaceholder("Add a comment...").fill("Following up via automated test.");
    await page.getByPlaceholder("Add a comment...").press("Enter");
    await expect(page.getByText("Following up via automated test.")).toBeVisible();
  });
});
