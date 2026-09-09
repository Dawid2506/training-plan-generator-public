import { expect, test } from "../fixtures/test";
import { AppNav, SECTIONS, type SectionName } from "../pom/AppNav";

const SECTION_NAMES = Object.keys(SECTIONS) as SectionName[];

test.describe("sidebar navigation", () => {
  for (const section of SECTION_NAMES) {
    test(`"${section}" opens ${SECTIONS[section].path}`, async ({ page, nav }) => {
      await page.goto("/dashboard");
      await nav.goTo(section);

      await expect(page).toHaveURL(new RegExp(`${SECTIONS[section].path}$`));
      // nav-items.ts drives the route, the top bar and the tab title from one
      // definition, so a mismatch here means they have drifted apart.
      await expect(page).toHaveTitle(AppNav.documentTitle(section));
      await expect(nav.topBarTitle()).toHaveText(SECTIONS[section].title);
      await expect(nav.activeLink()).toHaveText(section);
    });
  }
});

test.describe("sidebar state", () => {
  test("collapsing the rail survives a reload", async ({ page, nav }) => {
    await page.goto("/dashboard");
    await expect(nav.collapseToggle()).toHaveAccessibleName("Collapse sidebar");

    await nav.collapseToggle().click();
    await expect(nav.collapseToggle()).toHaveAccessibleName("Expand sidebar");

    await page.reload();
    await expect(nav.collapseToggle()).toHaveAccessibleName("Expand sidebar");
    expect(await page.evaluate(() => localStorage.getItem("dt-sidebar-collapsed"))).toBe("1");
  });

  test("labels come back when the rail is expanded again", async ({ page, nav }) => {
    await page.goto("/dashboard");
    await nav.collapseToggle().click();
    await nav.collapseToggle().click();

    await expect(nav.link("Activities")).toHaveText("Activities");
    expect(await page.evaluate(() => localStorage.getItem("dt-sidebar-collapsed"))).toBe("0");
  });
});

test.describe("routing", () => {
  test("an unknown route falls back to the dashboard", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the bare root goes to the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  /**
   * The previous UI minted /main?tab=… links that may still be in bookmarks and
   * emails. LegacyRedirect.tsx keeps them working; this is the only thing that
   * would notice if that map were deleted.
   */
  const legacyLinks: [string, RegExp][] = [
    ["/main?tab=Strava", /\/strava$/],
    ["/main?tab=Activities", /\/activities$/],
    ["/main?tab=Chat AI", /\/coach$/],
    ["/main?tab=Statistics", /\/settings$/],
    ["/main?tab=Profile", /\/settings$/],
    ["/main?tab=OCR", /\/settings$/],
    ["/main?tab=NoSuchTab", /\/dashboard$/],
    ["/main", /\/dashboard$/],
  ];

  for (const [from, to] of legacyLinks) {
    test(`legacy link ${from} still resolves`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(to);
    });
  }

  test("a legacy plan link keeps its id", async ({ page }) => {
    await page.goto("/main/interval-plans/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/plans\/00000000-0000-0000-0000-000000000000$/);
  });
});
