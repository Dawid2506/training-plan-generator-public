import { test as base, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

import { ADMIN_STORAGE_STATE, hasAdminCredentials } from "../env";
import { applySession, loginViaApi, registerViaApi } from "../helpers/auth";
import { makeUser, type TestUser } from "../helpers/users";
import { ActivitiesPage } from "../pom/ActivitiesPage";
import { AppNav } from "../pom/AppNav";
import { CoachPage } from "../pom/CoachPage";
import { DashboardPage } from "../pom/DashboardPage";
import { LoginPage } from "../pom/LoginPage";
import { PlanDetailsPage } from "../pom/PlanDetailsPage";
import { PlansPage } from "../pom/PlansPage";
import { RegisterPage } from "../pom/RegisterPage";
import { SettingsPage } from "../pom/SettingsPage";
import { StravaPage } from "../pom/StravaPage";

interface Fixtures {
  /** Credentials for a user that does not exist yet - for the registration specs. */
  user: TestUser;
  /** The same, but already registered over the API and ready to sign in. */
  registeredUser: TestUser;
  /** A signed-out page, for the specs that are about getting in. */
  anonPage: Page;
  /** Signed in as the shared admin account. Only for specs tagged @admin. */
  adminPage: Page;

  nav: AppNav;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  activitiesPage: ActivitiesPage;
  plansPage: PlansPage;
  planDetailsPage: PlanDetailsPage;
  settingsPage: SettingsPage;
  stravaPage: StravaPage;
  coachPage: CoachPage;
}

/**
 * The single `test` every spec imports.
 *
 * `page` is overridden so that asking for a page means asking for a signed-in
 * page: the fixture registers a fresh user over the API and puts their cookie in
 * the context before the test body runs. Specs therefore never type a password
 * unless the password is what they are testing.
 */
export const test = base.extend<Fixtures>({
  user: async ({}, use) => {
    await use(makeUser());
  },

  registeredUser: async ({ request, user }, use) => {
    await registerViaApi(request, user);
    await use(user);
  },

  page: async ({ context, request, registeredUser }, use) => {
    await applySession(context, await loginViaApi(request, registeredUser));
    const page = await context.newPage();
    await use(page);
  },

  anonPage: async ({ browser }, use) => {
    // Its own context, so nothing this run signed in elsewhere leaks into it.
    const context = await browser.newContext();
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    test.skip(
      !hasAdminCredentials || !existsSync(ADMIN_STORAGE_STATE),
      "No admin account configured - set ADMIN_EMAIL and ADMIN_PASSWORD in tests/.env.",
    );

    const context = await browser.newContext({ storageState: ADMIN_STORAGE_STATE });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  nav: async ({ page }, use) => {
    await use(new AppNav(page));
  },
  loginPage: async ({ anonPage }, use) => {
    await use(new LoginPage(anonPage));
  },
  registerPage: async ({ anonPage }, use) => {
    await use(new RegisterPage(anonPage));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  activitiesPage: async ({ page }, use) => {
    await use(new ActivitiesPage(page));
  },
  plansPage: async ({ page }, use) => {
    await use(new PlansPage(page));
  },
  planDetailsPage: async ({ page }, use) => {
    await use(new PlanDetailsPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  stravaPage: async ({ page }, use) => {
    await use(new StravaPage(page));
  },
  coachPage: async ({ page }, use) => {
    await use(new CoachPage(page));
  },
});

export { expect } from "@playwright/test";
