import { expect, test } from "../fixtures/test";
import { PlanDetailsPage } from "../pom/PlanDetailsPage";
import { PlansPage } from "../pom/PlansPage";

const NO_SUCH_PLAN = "00000000-0000-0000-0000-000000000000";

test.describe("a new account", () => {
  test("has no plans and says so", async ({ plansPage }) => {
    await plansPage.open();

    await expect(plansPage.heading).toBeVisible();
    await expect(plansPage.emptyState).toBeVisible();
    await expect(plansPage.table).toBeHidden();
  });

  test("a plan id that does not exist is handled, not crashed into", async ({
    planDetailsPage,
    page,
  }) => {
    await planDetailsPage.open(NO_SUCH_PLAN);

    await expect(planDetailsPage.notFound).toBeVisible();
    await planDetailsPage.backToPlans.click();
    await expect(page).toHaveURL(/\/plans$/);
  });

  test("another account's plan is not readable @security", async ({ planDetailsPage }) => {
    // The id is a uuid, so this is not a guessing attack - it stands in for
    // "somebody pasted a link". The backend scopes the lookup to the caller, so
    // the answer is the same 'not found' either way, which is the point.
    await planDetailsPage.open(NO_SUCH_PLAN);
    await expect(planDetailsPage.notFound).toBeVisible();
  });
});

/**
 * The table only has something to show for an account that has generated plans,
 * and generating one calls OpenAI. So these read the shared admin account
 * instead - read-only, and asserting shape rather than particular rows, so the
 * suite does not break when that account gains or loses a plan.
 */
test.describe("the plans table @admin", () => {
  test("lists the account's plans with all its columns", async ({ adminPage }) => {
    const plans = new PlansPage(adminPage);
    await plans.open();

    await expect(plans.table).toBeVisible();
    for (const column of ["Plan", "Sport", "Category", "Difficulty", "Duration", "Created"]) {
      await expect(plans.columnHeader(column)).toBeVisible();
    }

    const rows = await plans.rows.count();
    expect(rows).toBeGreaterThan(0);
    // The table paginates at five rows a page.
    expect(rows).toBeLessThanOrEqual(5);
  });

  /**
   * DEFECT: the row-count label reads "0 plans" under a table that is showing
   * plans.
   *
   * IntervalPlansTable.tsx memoises the label on
   * [pagination.pageIndex, pagination.pageSize, table]. `table` is referentially
   * stable and `data` is not a dependency, so the label is computed once - on the
   * first render, before the fetch resolves and while the table is empty - and
   * never recomputed. It is an aria-live region, so a screen reader is told the
   * wrong number too. docs/defects/DEF-002.md.
   */
  test.fail("should report the range it is showing", async ({ adminPage }) => {
    const plans = new PlansPage(adminPage);
    await plans.open();
    await expect(plans.rows.first()).toBeVisible();

    await expect(plans.rangeLabel).toHaveText(/^1–\d+ of \d+$/);
  });

  test("today the range label is stale until pagination is touched", async ({
    adminPage,
  }) => {
    const plans = new PlansPage(adminPage);
    await plans.open();
    await expect(plans.rows.first()).toBeVisible();

    // Wrong to begin with...
    await expect(plans.rangeLabel).toHaveText("0 plans");

    // ...and correct the moment anything changes the pagination state, which is
    // what identifies the stale memo as the cause rather than a slow request.
    await plans.setPageSize("10");
    await expect(plans.rangeLabel).toHaveText(/^1–\d+ of \d+$/);
  });

  test("cannot page back from the first page", async ({ adminPage }) => {
    const plans = new PlansPage(adminPage);
    await plans.open();
    await expect(plans.table).toBeVisible();

    await expect(plans.firstPage).toBeDisabled();
    await expect(plans.previousPage).toBeDisabled();
  });

  test("a row opens the plan behind it", async ({ adminPage }) => {
    const plans = new PlansPage(adminPage);
    const details = new PlanDetailsPage(adminPage);

    await plans.open();
    await plans.openFirstPlan();

    await expect(details.notFound).toBeHidden();
    await expect(details.downloadFit).toBeVisible();
  });
});
