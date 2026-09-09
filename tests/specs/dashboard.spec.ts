import { expect, test } from "../fixtures/test";
import { TILES } from "../pom/DashboardPage";

/**
 * Every test here runs as a user registered seconds earlier, which is the only
 * reliable way to reach the empty states - an account that has been used once
 * can never go back to having nothing.
 */
test.describe("a brand-new account", () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.open();
  });

  test("greets the user by name", async ({ page, registeredUser }) => {
    await expect(
      page.getByRole("heading", { name: new RegExp(`, ${registeredUser.username}$`) }),
    ).toBeVisible();
  });

  test("counts nothing, because nothing has happened yet", async ({ dashboardPage }) => {
    await expect(dashboardPage.tileValue(TILES.savedSessions)).toHaveText("0");
    await expect(dashboardPage.tileValue(TILES.intervalPlans)).toHaveText("0");
    await expect(dashboardPage.tileValue(TILES.strava)).toHaveText("Off");
  });

  test("explains each empty tile", async ({ dashboardPage }) => {
    await expect(dashboardPage.tile(TILES.savedSessions)).toContainText("Nothing saved yet");
    await expect(dashboardPage.tile(TILES.intervalPlans)).toContainText("None generated yet");
  });

  test("offers a way out of both empty sections", async ({ dashboardPage }) => {
    await expect(dashboardPage.emptyState("No sessions yet")).toBeVisible();
    await expect(dashboardPage.emptyState("No plans yet")).toBeVisible();
  });

  test("says Strava is not connected", async ({ dashboardPage }) => {
    await expect(dashboardPage.stravaNotConnectedCard()).toBeVisible();
  });
});

test.describe("dashboard links", () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.open();
  });

  const tileTargets = [
    [TILES.savedSessions, /\/activities$/],
    [TILES.intervalPlans, /\/plans$/],
    [TILES.strava, /\/strava$/],
    [TILES.tokens, /\/settings$/],
  ] as const;

  for (const [tile, target] of tileTargets) {
    test(`the "${tile}" tile opens its section`, async ({ page, dashboardPage }) => {
      await dashboardPage.tile(tile).click();
      await expect(page).toHaveURL(target);
    });
  }

  test("the header actions go to import and to the coach", async ({ page, dashboardPage }) => {
    await dashboardPage.importFit.click();
    await expect(page).toHaveURL(/\/activities$/);

    await dashboardPage.open();
    await dashboardPage.askCoach.click();
    await expect(page).toHaveURL(/\/coach$/);
  });
});
