import { expect, test } from "../fixtures/test";
import { awkwardlyNamedFit, fileName, fitFiles, notAFitFile } from "../helpers/files";
import { expectToastOfType } from "../helpers/toast";
import { TILES } from "../pom/DashboardPage";

const [firstFit] = fitFiles();

test.describe("an account with no activities", () => {
  test.beforeEach(async ({ activitiesPage }) => {
    await activitiesPage.open();
  });

  test("says so, and offers the dropzone", async ({ page, activitiesPage }) => {
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
    await expect(activitiesPage.dropzone).toBeVisible();
  });

  test("cannot create a plan yet", async ({ activitiesPage }) => {
    await expect(activitiesPage.createPlan).toBeDisabled();
  });
});

test.describe("choosing a file", () => {
  test.beforeEach(async ({ activitiesPage }) => {
    await activitiesPage.open();
  });

  test("a file that is not a .fit is refused in the browser", async ({
    page,
    activitiesPage,
  }) => {
    const uploads: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/activities")) {
        uploads.push(request.url());
      }
    });

    await activitiesPage.chooseFile(notAFitFile());

    await expectToastOfType(page, "warning", "Only .fit files can be imported.");
    // Rejected client-side: nothing is staged and nothing is uploaded.
    await expect(activitiesPage.importButton).toBeHidden();
    expect(uploads, "the file should never reach the API").toHaveLength(0);
  });

  test("a .fit is staged with its name, and can be cleared again", async ({
    activitiesPage,
  }) => {
    await activitiesPage.chooseFile(firstFit);

    await expect(activitiesPage.stagedFile(fileName(firstFit))).toBeVisible();
    await expect(activitiesPage.importButton).toBeVisible();

    await activitiesPage.clearSelection.click();
    await expect(activitiesPage.importButton).toBeHidden();
    await expect(activitiesPage.stagedFile(fileName(firstFit))).toBeHidden();
  });
});

test.describe("importing a ride", () => {
  test("the file becomes a saved session @import", async ({ page, activitiesPage }) => {
    await activitiesPage.open();
    await activitiesPage.importFile(firstFit);

    await expectToastOfType(page, "success", "Training imported.");
    await expect(activitiesPage.card(fileName(firstFit))).toBeVisible();
    await expect(activitiesPage.card(/^Imported/)).toContainText("Imported");
    await expect(activitiesPage.cards).toHaveCount(1);
  });

  test("a name with spaces and brackets survives the round trip @import", async ({
    activitiesPage,
  }) => {
    const awkward = awkwardlyNamedFit();

    await activitiesPage.open();
    await activitiesPage.importFile(awkward);

    await expect(activitiesPage.card(fileName(awkward))).toBeVisible();
  });

  test("the dashboard counts it @import", async ({ activitiesPage, dashboardPage }) => {
    await activitiesPage.open();
    await activitiesPage.importFile(firstFit);
    await expect(activitiesPage.cards).toHaveCount(1);

    await dashboardPage.open();
    await expect(dashboardPage.tileValue(TILES.savedSessions)).toHaveText("1");
    await expect(dashboardPage.emptyState("No sessions yet")).toBeHidden();
  });

  test("it unlocks plan creation, and the dialog opens @import", async ({
    page,
    activitiesPage,
  }) => {
    await activitiesPage.open();
    await expect(activitiesPage.createPlan).toBeDisabled();

    await activitiesPage.importFile(firstFit);
    await expect(activitiesPage.createPlan).toBeEnabled();

    // Opened and inspected only. Submitting it calls OpenAI, which is out of
    // scope for this suite - see docs/STRATEGY.md.
    await activitiesPage.createPlan.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  /**
   * DEFECT: an imported ride offers a delete button that can never work.
   *
   * saved-activity.service.ts pins the lookup to `sourceType: 'STRAVA'` and
   * matches on externalActivityId, which a file import does not have. The row's
   * activityId is null, so stravaActivityParser.ts falls back to the id inside
   * the parsed payload - a synthetic number - and the UI renders the control as
   * if it were removable. Every click ends in 404.
   *
   * Marked test.fail() so the suite carries the intended behaviour and turns red
   * the day the delete path is fixed. docs/defects/DEF-001.md has the detail.
   */
  test.fail("an imported ride should be removable again @import", async ({
    page,
    activitiesPage,
  }) => {
    await activitiesPage.open();
    await activitiesPage.importFile(firstFit);
    await expect(activitiesPage.cards).toHaveCount(1);

    await activitiesPage.removeFirstActivity();

    await expectToastOfType(page, "success", "Activity removed.");
    await expect(activitiesPage.cards).toHaveCount(0);
  });

  test("today, deleting an imported ride fails and says so @import", async ({
    page,
    activitiesPage,
  }) => {
    await activitiesPage.open();
    await activitiesPage.importFile(firstFit);
    await expect(activitiesPage.cards).toHaveCount(1);

    await activitiesPage.removeFirstActivity();

    // Pins the current behaviour: the user is told, and the card stays put.
    // Without this the bug could change shape - a silent failure, say - and the
    // test.fail() above would still "pass".
    await expectToastOfType(page, "error", "Cannot remove activity");
    await expect(activitiesPage.cards).toHaveCount(1);
  });
});

test.describe("the saved list", () => {
  test("can be sorted by activity date or by import date @import", async ({
    activitiesPage,
  }) => {
    await activitiesPage.open();
    await activitiesPage.importFile(firstFit);
    await expect(activitiesPage.cards).toHaveCount(1);

    await activitiesPage.sortBy("Import date");
    await expect(activitiesPage.sortSelect).toContainText("Import date");
    await expect(activitiesPage.cards).toHaveCount(1);

    await activitiesPage.sortBy("Activity date");
    await expect(activitiesPage.sortSelect).toContainText("Activity date");
    await expect(activitiesPage.cards).toHaveCount(1);
  });

  test("refresh keeps what was imported @import", async ({ page, activitiesPage }) => {
    await activitiesPage.open();
    await activitiesPage.importFile(firstFit);
    await expect(activitiesPage.cards).toHaveCount(1);

    await activitiesPage.refresh.click();
    await expect(activitiesPage.cards).toHaveCount(1);
    await expect(page.getByText("Nothing saved yet")).toBeHidden();
  });
});
