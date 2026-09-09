import { expect, test } from "../fixtures/test";
import { TILES } from "../pom/DashboardPage";

/**
 * The OAuth handshake leaves the app for strava.com, so nothing here clicks
 * "Connect Strava". What is testable without a third party is the disconnected
 * state - which is what every new account sees, and therefore the state most
 * users meet first.
 */
test.describe("an account with no Strava link", () => {
  test.beforeEach(async ({ stravaPage }) => {
    await stravaPage.open();
  });

  test("shows the page and offers to connect", async ({ stravaPage }) => {
    await expect(stravaPage.heading).toBeVisible();
    await expect(stravaPage.connectButton.first()).toBeVisible();
  });

  test("explains why the activity list is empty", async ({ stravaPage }) => {
    await expect(stravaPage.disconnectedEmptyState).toBeVisible();
  });

  test("the connect control is a button, not a link that could be followed", async ({
    stravaPage,
  }) => {
    // StravaPage.tsx assigns window.location rather than rendering an href, so a
    // test can safely locate it without any risk of a stray navigation.
    await expect(stravaPage.connectButton.first()).toHaveRole("button");
  });
});

test.describe("the connection status message", () => {
  /**
   * DEFECT: the API answers /api/strava/status with "Brak autoryzacji z Strava"
   * - Polish - and the UI prints it verbatim, on the Strava page and in the
   * dashboard tile hint. Every other string in the product is English.
   * docs/defects/DEF-003.md.
   */
  test.fail("should be in the same language as the rest of the app", async ({
    dashboardPage,
  }) => {
    await dashboardPage.open();

    await expect(dashboardPage.tile(TILES.strava)).not.toContainText("Brak autoryzacji");
  });

  test("today it is printed in Polish", async ({ dashboardPage }) => {
    await dashboardPage.open();

    await expect(dashboardPage.tile(TILES.strava)).toContainText("Brak autoryzacji z Strava");
  });
});
