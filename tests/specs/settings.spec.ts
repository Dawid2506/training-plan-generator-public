import { expect, test } from "../fixtures/test";
import { expectToastOfType } from "../helpers/toast";

test.describe("the account card", () => {
  test("shows who is signed in and with what role", async ({
    settingsPage,
    page,
    registeredUser,
  }) => {
    await settingsPage.open();

    await expect(page.getByText(registeredUser.username).first()).toBeVisible();
    await expect(page.getByText(registeredUser.email).first()).toBeVisible();
    // Everyone starts as USER; the coach is gated on ADMIN.
    await expect(page.getByText("USER", { exact: true })).toBeVisible();
  });
});

test.describe("appearance", () => {
  test("the three theme choices are offered, with System selected by default", async ({
    settingsPage,
  }) => {
    await settingsPage.open();

    await expect(settingsPage.themeOption("Light")).toBeVisible();
    await expect(settingsPage.themeOption("Dark")).toBeVisible();
    await expect(settingsPage.themeOption("System")).toHaveAttribute("aria-checked", "true");
  });

  test("choosing Dark paints the page and sticks across a reload", async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.open();
    await settingsPage.chooseTheme("Dark");

    await expect(settingsPage.themeOption("Dark")).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem("dt-theme"))).toBe("dark");

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(settingsPage.themeOption("Dark")).toHaveAttribute("aria-checked", "true");
  });

  test("choosing Light takes the class back off", async ({ page, settingsPage }) => {
    await settingsPage.open();
    await settingsPage.chooseTheme("Dark");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await settingsPage.chooseTheme("Light");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem("dt-theme"))).toBe("light");
  });

  test("the top-bar toggle flips the theme and renames itself", async ({ page, nav }) => {
    await page.goto("/settings");
    await expect(nav.themeToggle()).toHaveAccessibleName("Switch to dark theme");

    await nav.themeToggle().click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(nav.themeToggle()).toHaveAccessibleName("Switch to light theme");

    await nav.themeToggle().click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});

test.describe("the athlete profile", () => {
  test("saves and comes back after a reload", async ({ page, settingsPage }) => {
    await settingsPage.open();

    await settingsPage.fillProfile({
      "Weight (kg)": "72.5",
      "Height (cm)": "181",
      "Resting HR": "48",
      "Max HR": "191",
      "FTP (watts)": "265",
      "Hours per week": "8.5",
      "Sessions per week": "5",
      "Primary goal": "Sub-3 marathon",
      "Target event": "Berlin Marathon",
    });
    await settingsPage.saveProfile.click();

    await expectToastOfType(page, "success", "Profile saved.");

    await page.reload();
    await expect(settingsPage.field("Weight (kg)")).toHaveValue("72.5");
    await expect(settingsPage.field("Max HR")).toHaveValue("191");
    await expect(settingsPage.field("FTP (watts)")).toHaveValue("265");
    await expect(settingsPage.field("Primary goal")).toHaveValue("Sub-3 marathon");
    await expect(settingsPage.field("Target event")).toHaveValue("Berlin Marathon");
  });

  /**
   * Threshold pace is the one field that is not stored as it is typed: the form
   * writes mm:ss, the API stores seconds, and the form has to render it back.
   * A round trip is the only thing that proves both halves of that conversion.
   */
  test("threshold pace survives the seconds conversion", async ({ page, settingsPage }) => {
    await settingsPage.open();

    await settingsPage.field("Threshold pace").fill("4:05");
    await settingsPage.saveProfile.click();
    await expectToastOfType(page, "success", "Profile saved.");

    await page.reload();
    await expect(settingsPage.field("Threshold pace")).toHaveValue("4:05");
  });

  test("a max HR the backend rejects is reported in the form", async ({
    page,
    settingsPage,
  }) => {
    await settingsPage.open();

    await settingsPage.field("Max HR").fill("999");
    await settingsPage.saveProfile.click();

    // The card deliberately surfaces the backend's own wording rather than a
    // generic failure, so the user is told what the limit actually is.
    await expectToastOfType(page, "error", /Number must be less than or equal to 230/);
  });

  test("a weight below the accepted range is reported too", async ({ page, settingsPage }) => {
    await settingsPage.open();

    await settingsPage.field("Weight (kg)").fill("5");
    await settingsPage.saveProfile.click();

    await expectToastOfType(page, "error", /Number must be greater than or equal to 30/);
  });

  test("an empty profile saves without complaint", async ({ page, settingsPage }) => {
    await settingsPage.open();
    await settingsPage.saveProfile.click();

    await expectToastOfType(page, "success", "Profile saved.");
  });
});

test.describe("PDF recognition", () => {
  /**
   * A feature that is shipped behind a "Preview" badge and does nothing yet.
   * Pinned so that whoever wires it up is told by a failing test that this
   * placeholder is still in the build.
   */
  test("is still a stub, and says so", async ({ page, settingsPage }) => {
    await settingsPage.open();
    await settingsPage.pdfInput.setInputFiles({
      name: "plan.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 not a real pdf"),
    });

    await settingsPage.extractText.click();
    await expectToastOfType(page, "info", "PDF recognition is not wired up yet.");
    await expect(page.getByText("Extracted text will appear here.")).toBeVisible();
  });
});
