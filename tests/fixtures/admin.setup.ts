import { test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { ADMIN_STORAGE_STATE, ENV } from "../env";
import { applySession, loginViaApi } from "../helpers/auth";

/**
 * Signs the shared admin account in once per run and caches the session.
 *
 * The @admin specs read data that only a long-lived account has (real interval
 * plans), so they cannot use a freshly registered user. Doing the login here
 * rather than in each spec keeps that account's password in exactly one place
 * and out of every spec file.
 */
setup("authenticate as admin", async ({ browser, request }) => {
  const token = await loginViaApi(request, ENV.admin);

  const context = await browser.newContext();
  await applySession(context, token);

  await mkdir(dirname(ADMIN_STORAGE_STATE), { recursive: true });
  await context.storageState({ path: ADMIN_STORAGE_STATE });
  await context.close();
});
