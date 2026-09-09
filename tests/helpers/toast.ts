import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Sonner renders every notification into one region. Specs care about the text,
 * not about how the library structures its DOM, so that knowledge lives here and
 * nowhere else - if the app swaps its toast library, this file changes alone.
 */
const toastRegion = (page: Page): Locator => page.locator("[data-sonner-toaster]");

export const toast = (page: Page, text: string | RegExp): Locator =>
  toastRegion(page).locator("[data-sonner-toast]").filter({ hasText: text });

/** Waits for a toast carrying `text`. Fails with the toast text that did appear. */
export const expectToast = async (page: Page, text: string | RegExp): Promise<void> => {
  await expect(toast(page, text)).toBeVisible();
};

/**
 * Asserts a toast of a given severity. Sonner marks these with data-type, which
 * distinguishes "saved" from "could not save" when both mention the same noun.
 */
export const expectToastOfType = async (
  page: Page,
  type: "success" | "error" | "warning" | "info",
  text: string | RegExp,
): Promise<void> => {
  await expect(toast(page, text).and(page.locator(`[data-type="${type}"]`))).toBeVisible();
};
